// Offline tests for the data study scanner (`sitetiller study`): no network, the fetcher is injected.
import test from "node:test";
import assert from "node:assert/strict";
import { scanSite, runStudy, isBlocked, detectCdn, detectCms, textFacts, verdict, parseOptout, isOptedOut, loadSites, makeLimiter, summarize, summaryMarkdown, rowsToCsv, wilson, STUDY_BOTS, SUFFIX, withSuffix, BOT_UA, columns } from "../cli/lib/study.mjs";
import { hostsFromStories, pick, rankKey } from "../scripts/study-sample.mjs";

const H = (o = {}) => new Headers(o);
const res = (status, text = "", headers = {}, url) => ({ status, text, headers: H(headers), url });
const long = "<p>" + "word ".repeat(200) + "</p>";
const page = (body, head = "<title>Acme</title><link rel=\"canonical\" href=\"https://acme.dev/\">") => `<!doctype html><html lang="en"><head>${head}</head><body><main><h1>Acme</h1>${body}</main></body></html>`;

/** Fake fetcher: routes by path and by which bot token the UA contains. */
function fake(routes, log = []) {
  return async (url, { ua }) => {
    log.push({ url, ua });
    const u = new URL(url);
    const bot = Object.keys(BOT_UA).find((b) => ua.includes(`${b}/`)) || (ua.includes("Chrome") ? "browser" : "plain");
    const r = routes[`${u.pathname}|${bot}`] || routes[u.pathname];
    return { ...(r || res(404)), url };
  };
}

test("study bots: 14 bots in the brief, in order, each with an owner and purpose", () => {
  assert.equal(STUDY_BOTS.length, 14);
  assert.deepEqual(STUDY_BOTS.map((b) => b.agent).slice(0, 3), ["GPTBot", "OAI-SearchBot", "ChatGPT-User"]);
  assert.ok(STUDY_BOTS.every((b) => b && b.owner && b.purpose));
  assert.ok(STUDY_BOTS.some((b) => b.agent === "Bytespider") && STUDY_BOTS.some((b) => b.agent === "Meta-ExternalAgent") && STUDY_BOTS.some((b) => b.agent === "Amazonbot"));
});

test("every user-agent we send names us: suffix and From header", () => {
  assert.match(SUFFIX, /SiteTillerResearch\/1\.0 \(\+https:\/\/sitetiller\.com\/research\)/);
  assert.ok(withSuffix(BOT_UA.GPTBot).endsWith(SUFFIX));
});

test("isBlocked: block statuses, Cloudflare challenge on 200, mitigated header; normal pages are not blocked", () => {
  assert.equal(isBlocked(res(403)), true);
  assert.equal(isBlocked(res(429)), true);
  assert.equal(isBlocked(res(200, "<title>Just a moment...</title>")), true);
  assert.equal(isBlocked(res(200, "ok", { "cf-mitigated": "challenge" })), true);
  assert.equal(isBlocked(res(200, page(long))), false);
  assert.equal(isBlocked(res(404)), false);
});

test("detectCdn and detectCms", () => {
  assert.equal(detectCdn(H({ "cf-ray": "abc" })), "cloudflare");
  assert.equal(detectCdn(H({ "x-vercel-id": "x" })), "vercel");
  assert.equal(detectCdn(H({})), "unknown");
  assert.equal(detectCms("<script src=/wp-content/x.js>"), "wordpress");
  assert.equal(detectCms("<script src=/_next/static/a.js>"), "nextjs");
  assert.equal(detectCms("<html></html>"), "unknown");
});

test("textFacts: server-rendered page is ok; empty app shell is js_only", () => {
  const ok = textFacts(page(long), "https://acme.dev/");
  assert.equal(ok.textClass, "ok"); assert.equal(ok.jsOnly, false); assert.equal(ok.title, "Acme");
  const spa = textFacts("<!doctype html><html><head><title>App</title></head><body><div id=\"root\"></div><script src=\"/a.js\"></script></body></html>", "https://x.dev/");
  assert.equal(spa.textClass, "empty"); assert.equal(spa.jsOnly, true); assert.equal(spa.appShell, true);
  const plain = textFacts("<!doctype html><html><head><title>t</title></head><body><h1>Hi</h1></body></html>", "https://x.dev/");
  assert.equal(plain.jsOnly, false, "short page without scripts is not JS-only");
});

test("verdict: same, blocked, status-diff, content-diff, control-failed", () => {
  const ok = res(200, page(long));
  assert.equal(verdict(ok, res(200, page(long))), "same");
  assert.equal(verdict(ok, res(403)), "blocked");
  assert.equal(verdict(ok, res(403, '<!DOCTYPE html><title>Checking search engine crawler...</title><script src="/__challenge/probes.js?v=1"></script>')), "verify-challenge");
  assert.equal(verdict(ok, res(200, "<title>Just a moment...</title>")), "blocked");
  assert.equal(verdict(ok, res(404)), "status-diff");
  assert.equal(verdict(ok, res(200, page("<p>tiny</p>"))), "content-diff");
  assert.equal(verdict(res(403), res(403)), "control-failed");
  assert.equal(verdict(ok, res(0)), "error");
});

test("opt-out list: comments, urls, www, subdomains; unrelated suffix hosts are not matched", () => {
  const l = parseOptout("# list\nExample.com\nhttps://www.foo.io/path # note\n\n");
  assert.deepEqual(l, ["example.com", "foo.io"]);
  assert.equal(isOptedOut("example.com", l), true);
  assert.equal(isOptedOut("blog.example.com", l), true);
  assert.equal(isOptedOut("www.foo.io", l), true);
  assert.equal(isOptedOut("notexample.com", l), false);
});

test("loadSites needs a host column and keeps the source", () => {
  const rows = loadSites("rank,host,source\n1,acme.dev,show-hn\n2,b.io,show-hn\n");
  assert.equal(rows.length, 2); assert.equal(rows[0].source, "show-hn");
  assert.throws(() => loadSites("a,b\n1,2\n"), /host column/);
});

test("limiter: at least the gap between requests to the same host, none between different hosts", async () => {
  let t = 0; const waits = [];
  const lim = makeLimiter(2000, { now: () => t, wait: async (ms) => { waits.push(ms); t += ms; } });
  await lim("a.com"); await lim("a.com"); await lim("b.com"); await lim("a.com");
  assert.deepEqual(waits, [2000, 2000], "second and third a.com request wait; first a.com and b.com do not");
});

const happy = {
  "/robots.txt": res(200, "User-agent: *\nAllow: /\nSitemap: https://acme.dev/sm.xml\n"),
  "/": res(200, page(long), { "cf-ray": "1" }),
  "/llms.txt": res(200, "# Acme\n> x\n"),
  "/sm.xml": res(200, "<urlset></urlset>"),
};

test("scanSite: allowed site, all four bot UAs same, llms and sitemap found, request budget respected", async () => {
  const log = [];
  const row = await scanSite({ host: "acme.dev", source: "t" }, { fetcher: fake(happy, log), now: () => "T" });
  assert.equal(row.home_status, 200); assert.equal(row.text_class, "ok"); assert.equal(row.js_only, false);
  assert.equal(row.cdn, "cloudflare"); assert.equal(row.title, "Acme"); assert.equal(row.noindex, false);
  assert.equal(row.llms_txt, true); assert.equal(row.sitemap, true); assert.equal(row.sitemap_declared_in_robots, true);
  assert.equal(row.ua_gptbot_verdict, "same"); assert.equal(row.mismatch_any, false); assert.equal(row.ua_tested, 4);
  assert.equal(log.length, 8, "robots, control, 4 bot UAs, llms, sitemap");
  assert.ok(log.every((x) => x.ua.endsWith(SUFFIX)), "every request identifies us");
  assert.ok(log.filter((x) => x.url === "https://acme.dev/").length === 5, "homepage only, no crawling deeper");
});

test("scanSite: robots allows GPTBot but the server blocks that UA: mismatch is recorded", async () => {
  const routes = { ...happy, "/|GPTBot": res(403, "Forbidden"), "/|ClaudeBot": res(200, "<title>Just a moment...</title>") };
  const row = await scanSite({ host: "acme.dev" }, { fetcher: fake(routes) });
  assert.equal(row.ua_gptbot_verdict, "blocked"); assert.equal(row.ua_claudebot_verdict, "blocked");
  assert.equal(row.ua_chatgpt_user_verdict, "same");
  assert.equal(row.mismatch_any, true); assert.equal(row.mismatch_blocked, true);
  assert.equal(row.mismatch_bots, "GPTBot|ClaudeBot");
});

test("scanSite: a bot that robots.txt disallows is not requested with its UA", async () => {
  const log = [];
  const routes = { ...happy, "/robots.txt": res(200, "User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n") };
  const row = await scanSite({ host: "acme.dev" }, { fetcher: fake(routes, log) });
  assert.equal(row.robots_gptbot, "blocked"); assert.equal(row.ua_gptbot_verdict, "skipped-robots");
  assert.equal(row.ua_tested, 3); assert.equal(log.length, 7);
  assert.ok(!log.some((x) => x.ua.includes("GPTBot")));
  assert.equal(row.robots_blocked_count, 1);
});

test("scanSite: robots.txt that keeps our own crawler out stops everything after robots.txt", async () => {
  const log = [];
  const routes = { ...happy, "/robots.txt": res(200, "User-agent: *\nDisallow: /\n") };
  const row = await scanSite({ host: "acme.dev" }, { fetcher: fake(routes, log) });
  assert.equal(row.skipped_by_robots, true); assert.equal(row.robots_star_blocks_all, true);
  assert.equal(log.length, 1); assert.equal(row.home_status, undefined);
});

test("scanSite: browser control blocked too means no mismatch is claimed", async () => {
  const routes = { ...happy, "/": res(403, "Forbidden") };
  const row = await scanSite({ host: "acme.dev" }, { fetcher: fake(routes) });
  assert.equal(row.control_blocked, true); assert.equal(row.mismatch_any, false); assert.equal(row.ua_tested, 0);
  assert.equal(row.ua_gptbot_verdict, "skipped-control-failed");
});

test("scanSite: JS-only homepage, missing robots.txt, HTML soft-404 for llms.txt and sitemap", async () => {
  const routes = {
    "/": res(200, "<!doctype html><html><head><title>App</title></head><body><div id=\"root\"></div><script src=\"/a.js\"></script></body></html>"),
    "/llms.txt": res(200, "<!doctype html><html><body>Not found</body></html>"),
    "/sitemap.xml": res(200, "<!doctype html><html><body>Not found</body></html>"),
  };
  const row = await scanSite({ host: "app.dev" }, { fetcher: fake(routes) });
  assert.equal(row.robots_found, false); assert.equal(row.robots_gptbot, "allowed");
  assert.equal(row.js_only, true); assert.equal(row.llms_txt, false); assert.equal(row.sitemap, false);
  assert.equal(row.canonical, "");
});

test("scanSite: noindex and cross-host canonical are read from the homepage", async () => {
  const routes = { ...happy, "/": res(200, page(long, "<title>T</title><meta name=\"robots\" content=\"noindex\"><link rel=\"canonical\" href=\"https://other.com/\">")) };
  const row = await scanSite({ host: "acme.dev" }, { fetcher: fake(routes) });
  assert.equal(row.noindex, true); assert.equal(row.canonical_cross_host, true);
});

test("runStudy: opted-out hosts are never requested; resume skips finished hosts; errors do not stop the run", async () => {
  const log = [];
  const base = fake(happy, log);
  const fetcher = async (u, o) => { if (u.includes("boom.dev")) throw new Error("kaput"); return base(u, o); };
  const out = [];
  const { rows, optedOut } = await runStudy([{ host: "acme.dev" }, { host: "gone.dev" }, { host: "boom.dev" }, { host: "done.dev" }], { fetcher, optout: ["gone.dev"], skip: new Set(["done.dev"]), concurrency: 2, onRow: (r) => out.push(r.host) });
  assert.equal(optedOut, 1);
  assert.ok(!log.some((x) => x.url.includes("gone.dev") || x.url.includes("done.dev")));
  assert.deepEqual(rows.map((r) => r.host).sort(), ["acme.dev", "boom.dev"]);
  assert.match(rows.find((r) => r.host === "boom.dev").errors, /scan:kaput/);
  assert.equal(out.length, 2);
});

test("wilson interval brackets the estimate; empty base gives nulls", () => {
  const w = wilson(10, 100);
  assert.equal(w.p, 0.1); assert.ok(w.lo < 0.1 && w.hi > 0.1 && w.lo > 0.05 && w.hi < 0.18);
  assert.equal(wilson(0, 0).p, null);
});

test("summarize and CSV: counts, mismatch rate, finding flag, markdown and CSV shapes", async () => {
  const mk = async (host, routes) => scanSite({ host }, { fetcher: fake(routes) });
  const rows = [
    await mk("a.dev", happy),
    await mk("b.dev", { ...happy, "/|GPTBot": res(403) }),
    await mk("c.dev", { ...happy, "/robots.txt": res(200, "User-agent: ClaudeBot\nDisallow: /\n") }),
    await mk("d.dev", { "/": res(200, "<!doctype html><html><head><title>x</title></head><body><div id=\"root\"></div><script src=\"/a.js\"></script></body></html>") }),
  ];
  const s = summarize(rows, { optedOut: 2 });
  assert.equal(s.scanned, 4); assert.equal(s.sites_in_list, 6);
  assert.equal(s.ua_test.mismatch_any.k, 1); assert.equal(s.ua_test.mismatch_any.n, 4);
  assert.equal(s.ua_test.by_cdn.cloudflare.mismatch, 1);
  assert.equal(s.js_only.k, 1);
  assert.equal(s.robots_blocked_by_bot.find((b) => b.bot === "ClaudeBot").k, 1);
  assert.equal(s.finding.mismatch_meets_threshold, true);
  const md = summaryMarkdown(s);
  assert.match(md, /UA-string test, not IP-verified/); assert.match(md, /\| GPTBot \|/);
  const csv = rowsToCsv(rows);
  assert.equal(csv.split("\n")[0].split(",").length, columns().length);
  assert.equal(csv.trim().split("\n").length, 5);
  assert.equal(summarize([await mk("a.dev", happy)]).finding.mismatch_meets_threshold, false);
});

// ---------- sample builder ----------

test("sample: mechanical exclusions, one row per host, deterministic order from the seed", () => {
  const stories = [
    { objectID: "1", url: "https://www.acme.dev/post", title: "Show HN: Acme", created_at: "2026-09-01T00:00:00Z" },
    { objectID: "2", url: "https://acme.dev/other", title: "Show HN: Acme 2", created_at: "2026-09-02T00:00:00Z" },
    { objectID: "3", url: "https://github.com/x/y", title: "Show HN: Repo", created_at: "2026-09-02T00:00:00Z" },
    { objectID: "4", url: "https://blog.medium.com/p", title: "x", created_at: "2026-09-02T00:00:00Z" },
    { objectID: "5", url: "http://10.0.0.1/", title: "x", created_at: "2026-09-02T00:00:00Z" },
    { objectID: "6", url: "https://beta.io/", title: "Show HN: Beta", created_at: "2026-09-03T00:00:00Z" },
  ];
  const hosts = hostsFromStories(stories);
  assert.deepEqual(hosts.map((h) => h.host), ["acme.dev", "beta.io"]);
  assert.equal(hosts[0].source_url, "https://news.ycombinator.com/item?id=1");
  const a = pick(hosts, "seed-1", 2).map((r) => r.host);
  assert.deepEqual(pick(hosts, "seed-1", 2).map((r) => r.host), a, "same seed, same order");
  assert.equal(rankKey("s", "a.dev"), rankKey("s", "a.dev"));
  assert.notEqual(rankKey("s1", "a.dev"), rankKey("s2", "a.dev"));
  assert.equal(pick(hosts, "seed-1", 1).length, 1);
});

test("textFacts: hero text in <header> and <noscript> fallbacks count, so a landing page is not called JS-only", async () => {
  const { textFacts } = await import("../cli/lib/study.mjs");
  const hero = `<html><body><header><h1>Fast invoices for freelancers</h1><p>${"Send, track and get paid without chasing clients. ".repeat(8)}</p></header><div id="root"></div><script src="/a.js"></script></body></html>`;
  assert.equal(textFacts(hero, "https://x.test/").jsOnly, false);
  const nos = `<html><body><div id="root"></div><noscript>${"This page lists every board and how to wire it up. ".repeat(6)}</noscript><script src="/a.js"></script></body></html>`;
  assert.equal(textFacts(nos, "https://x.test/").jsOnly, false);
  const shell = `<html><body><div id="root"></div><script>${"var a = 1; ".repeat(200)}</script><style>${"p{color:red} ".repeat(50)}</style></body></html>`;
  assert.equal(textFacts(shell, "https://x.test/").jsOnly, true);
});
