// Offline tests for crawl, images, quality, schema-gen, CrUX history, backlinks, Ghost and GitHub publishing, URL safety.
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isPublicUrl } from "../cli/lib/http.mjs";
import { analyzeHtml } from "../cli/lib/page.mjs";
import { normUrl, pageFindings, scoreSite, crawlSite } from "../cli/lib/crawl.mjs";
import { imageAudit, imageSizes, format, fileName } from "../cli/lib/images.mjs";
import { syllables, readability, contentQuality } from "../cli/lib/quality.mjs";
import { generateSchema } from "../cli/lib/schema-gen.mjs";
import { summarizeHistory, cruxHistory } from "../cli/lib/perf.mjs";
import { gscLinksCsv, anchorMix, concentration, bingLinkCounts, bingUrlLinks } from "../cli/lib/backlinks.mjs";
import { ghostToken, ghostCreate, ghostUpdate, isGhostOwned } from "../cli/lib/ghost.mjs";
import { safePath, githubPut, githubDelete } from "../cli/lib/github-publish.mjs";

const html = (body, head = "<title>A page title that is fine</title><meta name=\"description\" content=\"d\">") => `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`;
const res = (status, j = {}, headers = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => j, headers: new Headers(headers) });

// ---------- URL safety ----------
test("isPublicUrl: accepts public https and rejects private, literal, credentialed and odd-port addresses", () => {
  assert.ok(isPublicUrl("https://example.com/a?b=1"));
  assert.ok(isPublicUrl("http://www.example.co.uk:8080/"));
  for (const u of ["http://127.0.0.1/", "http://10.0.0.5/", "http://[::1]/", "http://0x7f000001/", "http://localhost/", "http://printer.local/", "http://db.internal/", "http://router.home.arpa/",
    "https://user:pw@example.com/", "https://example.com:22/", "file:///etc/passwd", "ftp://example.com/", "javascript:alert(1)", "http://2130706433/", "not a url"]) assert.equal(isPublicUrl(u), false, u);
});

test("analyzeHtml: <title> inside an inline SVG in the body is not a page title", () => {
  const f = analyzeHtml(html('<svg><title>icon</title></svg><svg><title>logo</title></svg><h1>H</h1>'));
  assert.equal(f.titleCount, 1);
  assert.equal(f.title, "A page title that is fine");
});

// ---------- crawl ----------
test("normUrl: drops fragments and tracking parameters, keeps trailing slashes", () => {
  assert.equal(normUrl("https://Example.com/a/?utm_source=x&id=2#top"), "https://example.com/a/?id=2");
  assert.notEqual(normUrl("https://example.com/a"), normUrl("https://example.com/a/"));
});

test("pageFindings: flags missing title, multiple canonicals, thin text, invalid JSON-LD", () => {
  const facts = analyzeHtml(html('<h1>x</h1><script type="application/ld+json">{bad</script>', '<link rel="canonical" href="/a"><link rel="canonical" href="/b">'), { url: "https://e.com/a", host: "e.com" });
  const ids = pageFindings({ url: "https://e.com/a", status: 200, depth: 0, facts }).map((f) => f.id);
  for (const id of ["no-title", "multiple-canonicals", "thin", "invalid-json-ld", "no-description"]) assert.ok(ids.includes(id), id);
  assert.deepEqual(pageFindings({ url: "u", status: 404 }).map((f) => f.id), ["http-error"]);
});

test("scoreSite: arithmetic is per category and weighted", () => {
  const pages = [{ findings: [{ category: "onpage", severity: "high" }] }, { findings: [] }];
  const s = scoreSite(pages);
  assert.equal(s.categories.onpage, 50);
  assert.equal(s.categories.indexability, 100);
  assert.equal(s.overall, Math.round((100 * 30 + 50 * 25 + 100 * 20 + 100 * 15 + 100 * 10) / 100));
});

test("crawlSite: same host only, robots.txt respected, redirects followed once, broken links attributed, private links ignored", async () => {
  const pages = {
    "https://e.com/robots.txt": { status: 200, text: "User-agent: *\nDisallow: /private" },
    "https://e.com/": { status: 200, text: html('<h1>Home</h1><a href="/a">a</a><a href="/old">old</a><a href="/gone">gone</a><a href="/private/x">p</a><a href="https://other.com/">o</a><a href="http://127.0.0.1/admin">x</a><a href="/img.png">i</a>') },
    "https://e.com/a": { status: 200, text: html('<h1>A</h1><a href="/">home</a>') },
    "https://e.com/old": { status: 301, location: "/a" },
    "https://e.com/gone": { status: 404 },
  };
  const seen = [];
  const fetcher = async (u) => { seen.push(u); const p = pages[u]; if (!p) throw new Error("unexpected fetch " + u); return { headers: new Headers(), location: "", text: "", ...p }; };
  const r = await crawlSite("e.com", { delayMs: 0, fetcher });
  assert.ok(!seen.some((u) => /other\.com|127\.0\.0\.1|img\.png|private/.test(u)), seen.join(" "));
  assert.deepEqual(r.blockedByRobots, ["https://e.com/private/x"]);
  const ids = r.siteFindings.map((f) => f.id);
  assert.ok(ids.includes("broken-internal-link"));
  assert.ok(ids.includes("link-to-redirect"));
  assert.equal(r.siteFindings.find((f) => f.id === "broken-internal-link").urls[0], "https://e.com/");
  assert.ok(r.score.overall >= 0 && r.score.overall <= 100);
});

test("crawlSite: stops at max pages", async () => {
  let i = 0;
  const fetcher = async (u) => (u.endsWith("robots.txt") ? { status: 404, text: "" } : { status: 200, headers: new Headers(), text: html(`<h1>p</h1><a href="/p${++i}">n</a><a href="/q${i}">m</a>`) });
  const r = await crawlSite("e.com", { delayMs: 0, fetcher, max: 3 });
  assert.equal(r.crawled, 3);
  assert.ok(r.discovered > 3);
});

// ---------- images ----------
test("imageAudit: alt missing vs decorative, dimensions, lazy first image, legacy format, generic names, og:image", () => {
  const r = imageAudit(html('<main><img src="/IMG_1234.jpg" loading="lazy"><img src="/hero.webp" alt="" width="10" height="10" srcset="a 1x"><picture><source srcset="x.avif"><img src="/chart.png" alt="Revenue chart" width="1" height="1" srcset="a 1x"></picture></main>'), { url: "https://e.com/" });
  const a = r.list[0].issues.map((x) => x.id);
  for (const id of ["alt-missing", "no-dimensions", "lazy-lcp-candidate", "legacy-format", "no-srcset", "generic-filename"]) assert.ok(a.includes(id), id);
  assert.deepEqual(r.list[1].issues, []);
  assert.ok(!r.list[2].issues.some((x) => x.id === "legacy-format"));
  assert.equal(r.pageIssues[0].id, "no-og-image");
  assert.equal(format("/a/b.JPEG?x=1"), "jpg");
  assert.equal(fileName("https://e.com/a/b%20c.png"), "b c.png");
});

test("imageSizes: HEAD only, skips private hosts, flags large files", async () => {
  const calls = [];
  const fetcher = async (u, init) => { calls.push([u, init.method]); return { status: 200, headers: new Headers({ "content-length": String(300 * 1024), "content-type": "image/jpeg" }) }; };
  const r = await imageSizes([{ src: "https://e.com/a.jpg" }, { src: "http://192.168.1.1/x.jpg" }], { delayMs: 0, fetcher });
  assert.deepEqual(calls, [["https://e.com/a.jpg", "HEAD"]]);
  assert.equal(r[0].tooLarge, true);
});

// ---------- quality ----------
test("syllables and Flesch reading ease are in a sane range", () => {
  assert.equal(syllables("cat"), 1);
  assert.equal(syllables("table"), 2);
  assert.ok(syllables("readability") >= 4);
  const easy = readability("The cat sat on the mat. The dog ran to the park. We like it a lot.");
  const hard = readability("Notwithstanding considerable organisational heterogeneity, interdisciplinary collaboration necessitates comprehensive institutional reconfiguration.");
  assert.ok(easy.fleschReadingEase > hard.fleschReadingEase);
});

test("contentQuality: finds author, dates, sources, first-hand work, filler and vague claims", () => {
  const page = html(`<main><p>By Jane Smith. Updated Nov 2026.</p><p>We tested 12 tools and measured load time. Studies show that it's important to note this. In today's fast-paced world we delve deeper.</p>
    <a href="https://a.org/x">a</a><a href="https://b.org/y">b</a><table><tr><td>1</td></tr></table><a href="/about/">About</a></main>`,
    '<title>t</title><script type="application/ld+json">{"@type":"Article","author":{"name":"Jane"},"datePublished":"2026-01-01"}</script>');
  const q = contentQuality(page, { url: "https://e.com/x" });
  assert.equal(q.signals.author, true);
  assert.equal(q.signals.datePublished, true);
  assert.equal(q.signals.dateModified, true);
  assert.equal(q.signals.externalSources, 2);
  assert.equal(q.signals.firstHand, 1);
  assert.ok(q.filler.some((f) => f.label === "delve"));
  assert.ok(q.vagueClaims.includes("studies show"));
  assert.equal(q.of, 10);
});

// ---------- schema-gen ----------
test("generateSchema: product without invented ratings, lint runs, unknown type throws", () => {
  const r = generateSchema("product", { name: "Mug", price: "12", currency: "USD", rating: "5" });
  assert.equal(r.jsonld.offers.price, 12);
  assert.equal(r.jsonld.aggregateRating, undefined);
  assert.ok(r.notes.some((n) => /real reviews/.test(n)));
  assert.ok(Array.isArray(r.lint.findings));
  assert.throws(() => generateSchema("recipe", {}), /Unknown type/);
});

test("generateSchema: software without offers fails Google's required properties; empty fields are omitted", () => {
  const r = generateSchema("software", { name: "App", category: "" });
  assert.ok(r.lint.findings.some((f) => f.level === "error" && /offers.price/.test(f.message)));
  assert.equal("applicationCategory" in r.jsonld, false);
  assert.ok(!r.html.includes("</script><"), "script content is escaped");
});

test("generateSchema: breadcrumb and local business shapes", () => {
  const b = generateSchema("breadcrumb", { items: "Home|https://e.com/,Guides|https://e.com/g/" });
  assert.equal(b.jsonld.itemListElement[1].position, 2);
  const l = generateSchema("localbusiness", { name: "Cafe", street: "1 Main", city: "Town", lat: "1.5", lng: "2" });
  assert.equal(l.jsonld.address.addressLocality, "Town");
  assert.equal(l.jsonld.geo.latitude, 1.5);
});

// ---------- CrUX history ----------
const hist = { record: { collectionPeriods: [1, 2, 3, 4, 5, 6, 7, 8].map((d) => ({ lastDate: { year: 2026, month: 10, day: d } })), metrics: {
  largest_contentful_paint: { percentilesTimeseries: { p75s: [2000, 2000, 2000, 2000, 3000, 3000, 3000, 3000] } },
  cumulative_layout_shift: { percentilesTimeseries: { p75s: ["0.10", "0.10", "0.10", "0.10", "0.10", "0.10", "0.10", null] } },
  largest_contentful_paint_image_time_to_first_byte: { percentilesTimeseries: { p75s: [600] } },
  largest_contentful_paint_image_resource_load_delay: { percentilesTimeseries: { p75s: [1500] } },
  largest_contentful_paint_image_resource_load_duration: { percentilesTimeseries: { p75s: [300] } },
  largest_contentful_paint_image_element_render_delay: { percentilesTimeseries: { p75s: [100] } } } } };

test("summarizeHistory: trend, rating, LCP breakdown and advice", () => {
  const s = summarizeHistory(hist);
  assert.equal(s.periods[0], "2026-10-01");
  assert.equal(s.metrics.largest_contentful_paint.trend, "worse");
  assert.equal(s.metrics.largest_contentful_paint.change4w, 50);
  assert.equal(s.metrics.largest_contentful_paint.latestRating, "needs improvement");
  assert.equal(s.metrics.cumulative_layout_shift.latest, 0.1);
  assert.equal(s.biggestLcpPart, "resource_load_delay");
  assert.match(s.advice, /discovered late/);
});

test("cruxHistory: posts to queryHistoryRecord with periods capped at 40", async () => {
  let sent;
  const r = await cruxHistory("e.com/x", { key: "k", periods: 99, fetcher: async (u, init) => { sent = { u, body: JSON.parse(init.body) }; return res(200, hist); } });
  assert.match(sent.u, /records:queryHistoryRecord\?key=k$/);
  assert.equal(sent.body.collectionPeriodCount, 40);
  assert.equal(sent.body.url, "https://e.com/x");
  assert.equal(r.available, true);
});

// ---------- backlinks ----------
test("gscLinksCsv: recognises the three Search Console link exports", () => {
  assert.equal(gscLinksCsv("Site,Linking pages,Target pages\na.com,10,2\nb.com,5,1").kind, "linking-sites");
  assert.equal(gscLinksCsv("Target page,Incoming links,Linking sites\nhttps://e.com/,40,7").rows[0].links, 40);
  assert.equal(gscLinksCsv("Linking text\nacme\nclick here").kind, "anchors");
  assert.throws(() => gscLinksCsv("foo,bar\n1,2"), /Unrecognised/);
});

test("anchorMix and concentration", () => {
  const m = anchorMix(["Acme", "acme.com", "click here", "best crm", "cheap casino bonus"], { brand: ["acme"] });
  assert.deepEqual([m.counts.brand, m.counts.url, m.counts.generic, m.counts.other], [1, 1, 1, 2]);
  assert.deepEqual(m.review, ["cheap casino bonus"]);
  const c = concentration([{ site: "a.com", linkingPages: 80 }, { site: "b.com", linkingPages: 20 }]);
  assert.equal(c.topSiteShare, 0.8);
  assert.equal(c.top10Share, 1);
});

test("bing link calls page through TotalPages and group linking domains", async () => {
  const calls = [];
  const call = async (m, p) => { calls.push([m, p.page]); return m === "GetLinkCounts" ? { Links: [{ Url: `https://e.com/${p.page}`, Count: Number(p.page) + 1 }], TotalPages: 2 } : { Details: [{ Url: "https://www.a.com/x", AnchorText: "Acme" }, { Url: "https://a.com/y", AnchorText: "" }], TotalPages: 1 }; };
  const counts = await bingLinkCounts("https://e.com/", { call, delayMs: 0 });
  assert.deepEqual(calls.map((c) => c[1]), ["0", "1"]);
  assert.equal(counts[0].count, 2);
  const u = await bingUrlLinks("https://e.com/", "https://e.com/p", { call, delayMs: 0 });
  assert.deepEqual(u.linkingDomains, [{ domain: "a.com", links: 2 }]);
});

// ---------- Ghost ----------
test("ghostToken: HS256 JWT with kid, aud /admin/, 5-minute expiry, hex-decoded secret", () => {
  const key = "abc123:" + "0f".repeat(32);
  const t = ghostToken(key, 1000);
  const [h, b, s] = t.split(".");
  const dec = (x) => JSON.parse(Buffer.from(x.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
  assert.deepEqual(dec(h), { alg: "HS256", kid: "abc123", typ: "JWT" });
  assert.deepEqual(dec(b), { iat: 1000, exp: 1300, aud: "/admin/" });
  const expect = createHmac("sha256", Buffer.from("0f".repeat(32), "hex")).update(`${h}.${b}`).digest("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  assert.equal(s, expect);
  assert.throws(() => ghostToken("nocolon"), /id>:<hex/);
});

test("ghost: create is a draft tagged #sitetiller, recorded as owned; update reads updated_at; foreign ids refused", async () => {
  const root = await mkdtemp(join(tmpdir(), "st-"));
  const key = "id1:" + "aa".repeat(32);
  const calls = [];
  const fetcher = async (u, init) => { calls.push({ u, init }); if (init.method === "GET") return res(200, { posts: [{ id: "p1", updated_at: "2026-11-13T00:00:00.000Z" }] }); return res(200, { posts: [{ id: "p1", url: "https://g.example/x/", status: JSON.parse(init.body).posts[0].status || "draft" }] }); };
  const c = await ghostCreate("https://g.example/ghost/", { title: "T", html: "<p>x</p>", meta_title: "M", author_id: "evil" }, { key, root, fetcher });
  const body = JSON.parse(calls[0].init.body).posts[0];
  assert.equal(calls[0].u, "https://g.example/ghost/api/admin/posts/?source=html");
  assert.match(calls[0].init.headers.authorization, /^Ghost [\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(body.status, "draft");
  assert.deepEqual(body.tags, [{ name: "#sitetiller" }]);
  assert.equal(body.author_id, undefined);
  assert.equal(c.owned, true);
  const u = await ghostUpdate("https://g.example", { id: "p1", meta_description: "D" }, { key, root, fetcher });
  assert.equal(JSON.parse(calls.at(-1).init.body).posts[0].updated_at, "2026-11-13T00:00:00.000Z");
  assert.deepEqual(u.updated, ["meta_description"]);
  await assert.rejects(ghostUpdate("https://g.example", { id: "someone-elses", title: "x" }, { key, root, fetcher }), /Refusing to edit/);
  assert.equal(isGhostOwned({ ghost: [] }, "https://g.example", "posts", "p1"), false);
});

// ---------- GitHub static sites ----------
test("safePath: stays inside the folder, content files only, no .git", () => {
  assert.equal(safePath("content/sitetiller/", "guides/a.md"), "content/sitetiller/guides/a.md");
  for (const [d, f] of [["content/sitetiller", "../../package.json"], ["content/sitetiller", "a/../../b.md"],["..", "a.md"], ["", "a.md"], ["content/sitetiller", "a.js"], [".github", "workflows/x.yaml"]]) {
    assert.throws(() => safePath(d, f), undefined, `${d} ${f}`);
  }
  assert.equal(safePath("content/sitetiller", "/etc/x.md"), "content/sitetiller/etc/x.md");
});

test("github: refuses to overwrite a file it did not create, creates new ones, deletes only its own", async () => {
  const root = await mkdtemp(join(tmpdir(), "st-"));
  const existing = new Set(["content/sitetiller/old.md"]);
  const calls = [];
  const fetcher = async (u, init) => {
    calls.push({ u, init });
    const p = decodeURIComponent(u.split("/contents/")[1].split("?")[0]);
    if (init.method === "GET") return existing.has(p) ? res(200, { sha: "s1" }) : res(404, { message: "Not Found" });
    if (init.method === "PUT") { existing.add(p); return res(201, { commit: { sha: "c1" }, content: { html_url: "h" } }); }
    if (init.method === "DELETE") { existing.delete(p); return res(200, { commit: { sha: "c2" } }); }
  };
  const o = { token: "t", root, fetcher };
  await assert.rejects(githubPut("me/site", { dir: "content/sitetiller", file: "old.md", content: "x" }, o), /Refusing to overwrite/);
  const c = await githubPut("me/site", { dir: "content/sitetiller", file: "new.md", content: "# Hi" }, o);
  assert.equal(c.created, true);
  assert.equal(Buffer.from(JSON.parse(calls.at(-1).init.body).content, "base64").toString(), "# Hi");
  const u = await githubPut("me/site", { dir: "content/sitetiller", file: "new.md", content: "# Hi 2" }, o);
  assert.equal(u.created, false);
  assert.equal(JSON.parse(calls.at(-1).init.body).sha, "s1");
  await assert.rejects(githubDelete("me/site", { dir: "content/sitetiller", file: "old.md" }, o), /not created by this tool/);
  assert.equal((await githubDelete("me/site", { dir: "content/sitetiller", file: "new.md" }, o)).deleted, true);
});
