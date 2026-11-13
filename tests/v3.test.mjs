// Offline tests for v1.0 additions: Content-Signal, drift severity, Lighthouse batch, NAP, providers, agent readiness, and hardening.
import test from "node:test";
import assert from "node:assert/strict";
import { parseRobots, decide } from "../cli/lib/robots.mjs";
import { severity, rated } from "../cli/lib/versions.mjs";
import { summarizePsi, lighthouseBatch } from "../cli/lib/lighthouse.mjs";
import { normPhone, normText, extractNap, compareNap } from "../cli/lib/nap.mjs";
import { providerStatus, dataforseoSummary, ahrefsDomainRating } from "../cli/lib/providers.mjs";
import { agentChecks } from "../cli/lib/agent.mjs";
import { crawlSite } from "../cli/lib/crawl.mjs";
import { target, isPublicUrl } from "../cli/lib/http.mjs";
import { githubPut } from "../cli/lib/github-publish.mjs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const res = (status, j = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => j, headers: new Headers() });
const html = (body, head = "<title>t</title>") => `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`;

// ---------- robots.txt Content-Signal ----------
test("parseRobots: Content-Signal lines are parsed per group and do not change allow/deny", () => {
  const p = parseRobots("User-agent: *\nContent-Signal: search=yes, ai-train=no\nAllow: /\n");
  assert.deepEqual(p.contentSignals, [{ line: 2, agents: ["*"], signals: { search: "yes", "ai-train": "no" } }]);
  assert.equal(p.problems.length, 0);
  assert.equal(decide(p.groups, "GPTBot", "/x").allowed, true);
});
test("parseRobots: bad Content-Signal values are reported", () => {
  const p = parseRobots("User-agent: *\nContent-Signal: search=maybe\n");
  assert.match(p.problems[0].text, /yes or no/);
});

// ---------- drift severity ----------
test("severity: noindex added is critical, removed is high; 4xx status critical", () => {
  assert.equal(severity({ field: "noindex", from: false, to: true }), "critical");
  assert.equal(severity({ field: "noindex", from: true, to: false }), "high");
  assert.equal(severity({ field: "status", from: 200, to: 404 }), "critical");
  assert.equal(severity({ field: "canonical", from: "a", to: "b" }), "high");
  assert.equal(severity({ field: "title", from: "a", to: "b" }), "medium");
  assert.equal(severity({ field: "words", from: 1000, to: 1050 }), "low");
  assert.equal(severity({ field: "words", from: 1000, to: 400 }), "medium");
  assert.equal(severity({ field: "schemaTypes", from: ["Article"], to: [] }), "medium");
  assert.equal(severity({ field: "schemaTypes", from: [], to: ["Article"] }), "low");
});
test("rated: sorted worst first", () => {
  const r = rated([{ field: "title", from: "a", to: "b" }, { field: "noindex", from: false, to: true }, { field: "tables", from: 1, to: 2 }]);
  assert.deepEqual(r.map((x) => x.severity), ["critical", "medium", "low"]);
});

// ---------- Lighthouse / PSI ----------
const psi = { id: "https://e.com/", lighthouseResult: { lighthouseVersion: "13.0.0", finalDisplayedUrl: "https://e.com/",
  categories: { performance: { score: 0.72 }, accessibility: { score: 0.9 }, "best-practices": { score: 1 }, seo: { score: 0.92 } },
  audits: { "largest-contentful-paint": { numericValue: 3412.4 }, "cumulative-layout-shift": { numericValue: 0.0731 }, "total-blocking-time": { numericValue: 210 },
    "render-blocking-resources": { id: "render-blocking-resources", title: "Eliminate render-blocking resources", details: { type: "opportunity", overallSavingsMs: 900 } },
    "unused-javascript": { id: "unused-javascript", title: "Reduce unused JavaScript", details: { type: "opportunity", overallSavingsMs: 300 } } } } };
test("summarizePsi: scores x100, metrics rounded, opportunities ranked", () => {
  const s = summarizePsi(psi);
  assert.deepEqual(s.scores, { performance: 72, accessibility: 90, bestPractices: 100, seo: 92 });
  assert.equal(s.metrics.lcpMs, 3412);
  assert.equal(s.metrics.cls, 0.073);
  assert.equal(s.opportunities[0].id, "render-blocking-resources");
});
test("lighthouseBatch: one request per public URL with all four categories; private URLs skipped; errors kept", async () => {
  const seen = [];
  const fetcher = async (u) => { seen.push(u); return u.includes("bad") ? res(500, { error: { message: "boom" } }) : res(200, psi); };
  const r = await lighthouseBatch(["https://e.com/", "http://10.0.0.1/", "https://bad.e.com/"], { fetcher, delayMs: 0, key: "k" });
  assert.equal(seen.length, 2);
  assert.equal(new URL(seen[0]).searchParams.getAll("category").length, 4);
  assert.equal(new URL(seen[0]).searchParams.get("key"), "k");
  assert.equal(r.failed, 2);
  assert.equal(r.median.performance, 72);
});

// ---------- NAP ----------
test("normPhone and normText", () => {
  assert.equal(normPhone("tel:+1 (555) 010-2000"), "+15550102000");
  assert.equal(normPhone("0044 20 7946 0000"), "+442079460000");
  assert.equal(normText("12 Main Street, Suite 4"), normText("12 main st. ste 4"));
});
test("extractNap: JSON-LD, tel links and visible phones", () => {
  const n = extractNap(html('<p>Call 555-010-2000 today</p><a href="tel:+15550102000">call</a><script type="application/ld+json">{"@type":"Dentist","name":"Bright Teeth","telephone":"+1 555 010 2000","address":{"streetAddress":"12 Main St","addressLocality":"Springfield"}}</script>'));
  assert.deepEqual(n.names, ["Bright Teeth"]);
  assert.ok(n.phones.includes("+15550102000"));
  assert.equal(n.addresses[0], "12 Main St, Springfield");
  assert.deepEqual(n.sources.sort(), ["json-ld", "tel-link"]);
});
test("compareNap: flags a different phone and a different name", () => {
  const pages = [
    { url: "a", names: ["Bright Teeth"], addresses: ["12 Main St, Springfield"], phones: ["+15550102000"] },
    { url: "b", names: ["Bright Teeth Dental LLC"], addresses: [], phones: ["+15550109999"] },
  ];
  const c = compareNap(pages, { name: "Bright Teeth", phone: "555 010 2000", address: "12 Main Street" });
  assert.equal(c.consistent, false);
  assert.deepEqual(c.rows[0].issues, []);
  assert.equal(c.rows[1].issues.length, 2);
  assert.equal(c.distinctPhones, 2);
});

// ---------- providers ----------
test("providerStatus reports configuration without values", () => {
  const s = providerStatus({ AHREFS_API_KEY: "secret" });
  assert.equal(s.ahrefs.configured, true);
  assert.equal(s.dataforseo.configured, false);
  assert.ok(!JSON.stringify(s).includes("secret"));
});
test("dataforseoSummary: basic auth, one task, result fields mapped; task errors surface", async () => {
  let sent;
  const ok = await dataforseoSummary("e.com", { login: "l", password: "p", fetcher: async (u, init) => { sent = { u, init }; return res(200, { tasks: [{ status_code: 20000, cost: 0.02, result: [{ backlinks: 10, referring_domains: 3, rank: 120, broken_backlinks: 1, referring_ips: 2 }] }] }); } });
  assert.equal(sent.u, "https://api.dataforseo.com/v3/backlinks/summary/live");
  assert.equal(sent.init.headers.authorization, "Basic " + Buffer.from("l:p").toString("base64"));
  assert.deepEqual(JSON.parse(sent.init.body), [{ target: "e.com", include_subdomains: true }]);
  assert.equal(ok.referringDomains, 3);
  await assert.rejects(dataforseoSummary("e.com", { login: "l", password: "p", fetcher: async () => res(200, { tasks: [{ status_code: 40501, status_message: "Invalid Field" }] }) }), /Invalid Field/);
  await assert.rejects(dataforseoSummary("e.com", { login: "", password: "" }), /DATAFORSEO_LOGIN/);
});
test("ahrefsDomainRating: bearer key, target and date params", async () => {
  let u, h;
  const r = await ahrefsDomainRating("e.com", { key: "k", date: "2026-11-13", fetcher: async (url, init) => { u = new URL(url); h = init.headers; return res(200, { domain_rating: { domain_rating: 41.5, ahrefs_rank: 900000 } }); } });
  assert.equal(u.searchParams.get("target"), "e.com");
  assert.equal(u.searchParams.get("date"), "2026-11-13");
  assert.equal(h.authorization, "Bearer k");
  assert.equal(r.domainRating, 41.5);
});

// ---------- agent readiness ----------
test("agentChecks: empty app shell and missing landmarks fail", () => {
  const a = agentChecks(html('<div id="root"></div><script src="/app.js"></script>'));
  assert.equal(a.appShell, true);
  assert.equal(a.checks.find((c) => c.check.startsWith("Main text")).pass, false);
  assert.equal(a.checks.find((c) => c.check.startsWith("Landmarks")).pass, false);
});
test("agentChecks: labels (for=, wrapped, aria-label), honeypots ignored, empty links and onclick divs caught", () => {
  const a = agentChecks(html('<main><nav></nav><h1>H</h1><h2>a</h2><h2>b</h2><label for="e">Email</label><input id="e"><label><input type="checkbox"> Updates</label><input aria-label="Search"><input name="hp" tabindex="-1"><input name="bad"><a href="/x"></a><a href="/y"><img src="i.png" alt="Logo"></a><div onclick="go()">Go</div><button></button></main>'));
  const get = (s) => a.checks.find((c) => c.check.startsWith(s));
  assert.equal(get("Form fields").detail, "3/4");
  assert.equal(get("No empty links").detail, "1 empty");
  assert.equal(get("Clickable things").pass, false);
  assert.equal(get("Buttons").pass, false);
  assert.equal(get("One H1").pass, true);
});

// ---------- hardening ----------
test("crawlSite: a redirect to a private address is not followed", async () => {
  const fetched = [];
  const fetcher = async (u) => { fetched.push(u); if (u.endsWith("robots.txt")) return { status: 404, text: "" }; if (u === "https://e.com/") return { status: 302, location: "http://169.254.169.254/latest/meta-data/", headers: new Headers(), text: "" }; throw new Error("unexpected " + u); };
  const r = await crawlSite("e.com", { fetcher, delayMs: 0 });
  assert.ok(!fetched.some((u) => u.includes("169.254")));
  assert.equal(r.crawled, 1);
});
test("target: rejects IP literals, localhost and junk; accepts subdomains and paths", () => {
  for (const bad of ["127.0.0.1", "http://[::1]/", "localhost", "foo", "https://x.local/", ""]) assert.throws(() => target(bad), undefined, bad);
  assert.equal(target("blog.example.co.uk/a?b=1").path, "/a?b=1");
});
test("isPublicUrl: decimal, octal-ish and trailing-dot hosts", () => {
  assert.equal(isPublicUrl("http://017700000001/"), false);
  assert.equal(isPublicUrl("https://example.com./"), true);
  assert.equal(isPublicUrl("https://localhost./"), false);
});
test("githubPut: branch is sent on read and write; token required", async () => {
  const root = await mkdtemp(join(tmpdir(), "st-"));
  const calls = [];
  const fetcher = async (u, init) => { calls.push({ u, init }); return init.method === "GET" ? res(404, {}) : res(201, { commit: { sha: "c" }, content: {} }); };
  await githubPut("me/site", { dir: "content/st", file: "a.md", content: "x" }, { token: "t", branch: "preview", root, fetcher });
  assert.match(calls[0].u, /\?ref=preview$/);
  assert.equal(JSON.parse(calls[1].init.body).branch, "preview");
  await assert.rejects(githubPut("me/site", { dir: "content/st", file: "a.md", content: "x" }, { token: "", root, fetcher }), /GITHUB_TOKEN/);
  await assert.rejects(githubPut("not a repo", { dir: "content/st", file: "a.md", content: "x" }, { token: "t", root, fetcher }), /owner\/name/);
});

// ---------- edge cases in earlier modules ----------
import { generateSchema } from "../cli/lib/schema-gen.mjs";
import { readability, contentQuality } from "../cli/lib/quality.mjs";
import { anchorMix, concentration } from "../cli/lib/backlinks.mjs";
import { summarizeHistory } from "../cli/lib/perf.mjs";

test("generateSchema: organization sameAs list, online event location, person worksFor", () => {
  assert.deepEqual(generateSchema("organization", { name: "A", sameAs: "https://x.com/a, https://github.com/a" }).jsonld.sameAs, ["https://x.com/a", "https://github.com/a"]);
  const e = generateSchema("event", { name: "Webinar", startDate: "2026-12-01T17:00:00Z", online: true, url: "https://e.com/w" });
  assert.equal(e.jsonld.location["@type"], "VirtualLocation");
  assert.equal(generateSchema("person", { name: "Jane", worksFor: "Acme" }).jsonld.worksFor.name, "Acme");
});
test("quality and readability on an empty page do not throw", () => {
  assert.equal(readability("").fleschReadingEase, null);
  const q = contentQuality("<html><body></body></html>");
  assert.equal(q.of, 10);
  assert.equal(q.checklist.find((c) => c.check.startsWith("Readable")).pass, false);
});
test("anchorMix and concentration with no data", () => {
  assert.equal(anchorMix([]).total, 0);
  assert.equal(concentration([]).topSite, null);
});
test("summarizeHistory: empty record gives no metrics and no advice", () => {
  const s = summarizeHistory({});
  assert.deepEqual(s.metrics, {});
  assert.equal(s.lcpBreakdown, null);
  assert.equal(s.advice, null);
});
