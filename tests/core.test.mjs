// Offline unit tests for the CLI core. Run: node --test tests
import test from "node:test";
import assert from "node:assert/strict";
import { parseRobots, decide, ruleMatches } from "../cli/lib/robots.mjs";
import { analyzeHtml, readable } from "../cli/lib/page.mjs";
import { lintLlms, buildLlms } from "../cli/lib/llms.mjs";
import { parseCsv, gscRows, toCsv, num } from "../cli/lib/csv.mjs";
import { ctrCurve, lowCtr, brandSplit, cannibalization, decay } from "../cli/lib/gsc-analysis.mjs";
import { didTotals, didDaily } from "../cli/lib/measure.mjs";
import { parseLine, inCidr, analyzeLogs } from "../cli/lib/logs.mjs";
import { fingerprint, diff } from "../cli/lib/versions.mjs";
import { aggregateBing, compareEngines, gscProperty } from "../cli/lib/engines.mjs";
import { spread, locs } from "../cli/lib/sitemap.mjs";
import { target } from "../cli/lib/http.mjs";

// ---------- robots.txt (Google's documented matching) ----------
const R = parseRobots(`# test
User-agent: *
Disallow: /private/
Allow: /private/public-page
Disallow: /*.pdf$
Disallow: /search

User-agent: GPTBot
User-agent: CCBot
Disallow: /

User-agent: Googlebot
Disallow: /nogoogle/
Allow: /page
Disallow: /page

Sitemap: https://example.com/sitemap.xml
Crawl-delay: 5
Nonsense line
Foo: bar`);

test("robots: sitemap lines collected", () => assert.deepEqual(R.sitemaps, ["https://example.com/sitemap.xml"]));
test("robots: groups parsed, multiple agents share a group", () => { assert.equal(R.groups.length, 3); assert.deepEqual(R.groups[1].agents, ["gptbot", "ccbot"]); });
test("robots: invalid and unknown lines reported, crawl-delay ignored silently", () => { assert.equal(R.problems.length, 2); assert.match(R.problems[0].text, /Nonsense/); assert.match(R.problems[1].text, /Foo/); });
test("robots: star group blocks a private path", () => assert.equal(decide(R.groups, "Bingbot", "/private/x").allowed, false));
test("robots: longer Allow beats shorter Disallow", () => assert.equal(decide(R.groups, "Bingbot", "/private/public-page").allowed, true));
test("robots: $ anchors the end", () => { assert.equal(decide(R.groups, "Bingbot", "/a/file.pdf").allowed, false); assert.equal(decide(R.groups, "Bingbot", "/a/file.pdf?x=1").allowed, true); });
test("robots: named group replaces the star group entirely", () => { assert.equal(decide(R.groups, "Googlebot", "/private/x").allowed, true); assert.equal(decide(R.groups, "Googlebot", "/nogoogle/a").allowed, false); });
test("robots: equal-length tie goes to Allow", () => assert.equal(decide(R.groups, "Googlebot", "/page").allowed, true));
test("robots: agent matching is case-insensitive", () => assert.equal(decide(R.groups, "gptbot", "/").allowed, false));
test("robots: shared group applies to each listed agent", () => assert.equal(decide(R.groups, "CCBot", "/anything").allowed, false));
test("robots: no rules means allowed", () => assert.equal(decide(parseRobots("").groups, "GPTBot", "/").allowed, true));
test("robots: empty Disallow allows everything", () => assert.equal(decide(parseRobots("User-agent: *\nDisallow:").groups, "GPTBot", "/x").allowed, true));
test("robots: winning rule and line are reported", () => { const d = decide(R.groups, "GPTBot", "/"); assert.equal(d.rule, "Disallow: /"); assert.equal(d.line, 10); });
test("robots: wildcard in the middle", () => { assert.equal(ruleMatches("/a/*/c", "/a/b/c/d"), true); assert.equal(ruleMatches("/a/*/c", "/a/c"), false); });
test("robots: rule before any user-agent is a problem", () => assert.equal(parseRobots("Disallow: /x\nUser-agent: *").problems.length, 1));
test("robots: comments are stripped", () => assert.equal(decide(parseRobots("User-agent: * # all\nDisallow: /a # note").groups, "X", "/a").allowed, false));

// ---------- page analysis ----------
const HTML = `<!doctype html><html lang="en"><head><title>Acme Pricing | Acme</title>
<meta name="description" content="Plans from $12/month.">
<meta name="robots" content="index,follow"><link rel="canonical" href="https://acme.example/pricing">
<meta property="og:title" content="Acme pricing">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Acme"}</script>
<script type="application/ld+json">{ broken json </script></head>
<body><nav><a href="/">Home</a></nav><h1>Pricing</h1><h2>How much does Acme cost?</h2><p>From $12.</p>
<table><tr><td>Solo</td></tr></table><img src="a.png"><img src="b.png" alt="chart">
<a href="/docs">Docs</a><a href="https://other.example/x">Other</a><footer>f</footer></body></html>`;
const P = analyzeHtml(HTML, { url: "https://acme.example/pricing", headers: new Headers({ "x-robots-tag": "" }), host: "acme.example" });
test("page: title, description, canonical, lang", () => { assert.equal(P.title, "Acme Pricing | Acme"); assert.equal(P.description, "Plans from $12/month."); assert.equal(P.canonical, "https://acme.example/pricing"); assert.equal(P.lang, "en"); });
test("page: h1 and question headings", () => { assert.deepEqual(P.h1, ["Pricing"]); assert.equal(P.questionHeadings, 1); });
test("page: schema types and invalid block detected", () => { assert.deepEqual(P.schemaTypes, ["SoftwareApplication"]); assert.equal(P.schemaBlocks.filter((b) => !b.valid).length, 1); });
test("page: images without alt counted", () => { assert.equal(P.images, 2); assert.equal(P.imagesWithoutAlt, 1); });
test("page: internal vs external links", () => { assert.equal(P.internalLinks, 2); assert.equal(P.links.filter((l) => !l.internal).length, 1); });
test("page: not noindex", () => assert.equal(P.noindex, false));
test("page: noindex from meta", () => assert.equal(analyzeHtml('<head><meta name="robots" content="noindex"></head><body></body>').noindex, true));
test("page: noindex from header", () => assert.equal(analyzeHtml("<body></body>", { headers: new Headers({ "x-robots-tag": "noindex" }) }).noindex, true));
test("page: none counts as noindex", () => assert.equal(analyzeHtml('<head><meta name="googlebot" content="none"></head>').noindex, true));
test("page: readable text excludes nav and footer, keeps headings", () => { const t = readable(HTML); assert.match(t, /^# Pricing/m); assert.doesNotMatch(t, /Home/); });
test("page: entities decoded", () => assert.equal(analyzeHtml("<title>A &amp; B</title>").title, "A & B"));

// ---------- llms.txt ----------
const L = `# Acme\n\n> Invoicing for freelancers.\n\n## Docs\n\n- [Start](https://acme.example/start): install\n- [API](https://acme.example/api)\n\n## Optional\n\n- [Blog](https://acme.example/blog)\n`;
test("llms: valid file passes all format checks", () => { const r = lintLlms(L); assert.ok(r.checks.every((c) => c.ok)); assert.equal(r.links.length, 3); assert.equal(r.optional, true); });
test("llms: missing H1 fails", () => assert.equal(lintLlms("Some text\n## A\n- [x](y)").checks.find((c) => c.id === "h1").ok, false));
test("llms: link note captured", () => assert.equal(lintLlms(L).links[0].note, "install"));
test("llms: build groups by section and round-trips through lint", () => { const t = buildLlms({ name: "Acme", summary: "Invoicing.", pages: [{ section: "Docs", url: "https://a/x", title: "X", note: "n" }, { section: "Docs", url: "https://a/y", title: "Y" }] }); assert.match(t, /^# Acme\n\n> Invoicing\.\n\n## Docs\n\n- \[X\]\(https:\/\/a\/x\): n\n- \[Y\]/); assert.ok(lintLlms(t).checks.find((c) => c.id === "h1").ok); });

// ---------- CSV ----------
test("csv: quotes, commas, CRLF and BOM", () => assert.deepEqual(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n'), [["a", "b"], ["x, y", 'he said "hi"']]));
test("csv: num handles percent and comma decimals", () => { assert.equal(num("1.8%"), 1.8); assert.equal(num("1,5"), 1.5); assert.equal(num(""), 0); });
const GSC = `Top queries,Clicks,Impressions,CTR,Position
acme login,820,1400,58.6%,1.1
acme-analytics pricing,100,300,33%,1.0
invoice software for freelancers,216,12000,1.8%,4.3
best invoice app,50,9000,0.6%,4.4
invoice template,300,10000,3%,4.0
free invoice maker,280,9000,3.1%,4.2
zero,0,0,0%,9
`;
test("csv: gsc export mapped and zero-impression rows dropped", () => { const r = gscRows(GSC); assert.equal(r.length, 6); assert.equal(r[2].ctr, 216 / 12000); });
test("csv: missing columns throw", () => assert.throws(() => gscRows("a,b\n1,2")));
test("csv: toCsv escapes", () => assert.equal(toCsv([{ a: 'x,"y"', b: 1 }]), 'a,b\n"x,""y""",1\n'));

// ---------- GSC analyses ----------
const rows = gscRows(GSC);
test("ctr curve: median per position with enough rows", () => { const c = ctrCurve(rows); assert.ok(c[4]); assert.equal(c[4].rows, 4); });
test("ctr curve: positions with too few rows skipped", () => assert.equal(ctrCurve(rows)[1], undefined));
test("low ctr: under-clicked rows ranked by missed clicks", () => { const l = lowCtr(rows); assert.ok(l.length >= 1); assert.equal(l[0].key, "best invoice app"); });
test("brand split: hyphen and space insensitive", () => { const b = brandSplit(rows, ["acme analytics", "acme"]); assert.equal(b.branded.queries, 2); assert.equal(b.branded.clicks, 920); });
test("brand split: regex generated with optional separator", () => assert.equal(brandSplit(rows, ["acme analytics"]).gscRegex, "(acme[ -]?analytics)"));
test("cannibal: query split across two pages flagged", () => { const r = cannibalization([{ query: "q", page: "/a", impressions: 600, clicks: 10, position: 5 }, { query: "q", page: "/b", impressions: 400, clicks: 4, position: 8 }, { query: "z", page: "/a", impressions: 900, clicks: 9 }, { query: "z", page: "/c", impressions: 60, clicks: 0 }]); assert.equal(r.length, 1); assert.equal(r[0].query, "q"); });
test("decay: reasons classified", () => {
  const before = [{ key: "/a", clicks: 200, impressions: 8000, ctr: 0.025, position: 4 }, { key: "/b", clicks: 100, impressions: 3000, ctr: 0.033, position: 3 }, { key: "/c", clicks: 50, impressions: 1000, ctr: 0.05, position: 2 }, { key: "/d", clicks: 100, impressions: 4000, ctr: 0.025, position: 3 }];
  const after = [{ key: "/a", clicks: 90, impressions: 4000, ctr: 0.0225, position: 7 }, { key: "/b", clicks: 98, impressions: 3100, ctr: 0.0316, position: 3.1 }, { key: "/d", clicks: 40, impressions: 4000, ctr: 0.01, position: 3 }];
  const d = decay(before, after);
  assert.deepEqual(d.map((x) => x.url), ["/a", "/d", "/c"]);
  assert.equal(d[0].reason, "lost rankings"); assert.equal(d[1].reason, "lower CTR at similar impressions"); assert.match(d[2].reason, /gone/);
});

// ---------- measurement ----------
test("did totals: removes the control trend", () => { const r = didTotals({ changedBefore: 1000, changedAfter: 1300, controlBefore: 5000, controlAfter: 5500 }); assert.equal(Math.round(r.expected), 1100); assert.equal(Math.round(r.effect), 200); assert.ok(Math.abs(r.lift - 0.1818) < 0.001); });
test("did totals: without control gives raw only", () => { const r = didTotals({ changedBefore: 100, changedAfter: 150 }); assert.equal(r.raw, 0.5); assert.equal(r.effect, null); });
test("did totals: invalid baseline throws", () => assert.throws(() => didTotals({ changedBefore: 0, changedAfter: 1 })));
const days = (base, n = 28, jitter = 0.05) => Array.from({ length: n }, (_, i) => Math.round(base * (1 + jitter * Math.sin(i * 1.7))));
test("did daily: clear win detected", () => { const r = didDaily({ changedBefore: days(100), changedAfter: days(150), controlBefore: days(500), controlAfter: days(500) }); assert.equal(r.verdict, "win"); assert.ok(r.low > 0.3); });
test("did daily: no change is unclear or tight around zero", () => { const r = didDaily({ changedBefore: days(100, 28, 0.3), changedAfter: days(100, 28, 0.3), controlBefore: days(500, 28, 0.3), controlAfter: days(500, 28, 0.3) }); assert.ok(r.low <= 0.05 && r.high >= -0.05); });
test("did daily: deterministic with a seed", () => { const a = didDaily({ changedBefore: days(100), changedAfter: days(120), controlBefore: days(500), controlAfter: days(510) }); const b = didDaily({ changedBefore: days(100), changedAfter: days(120), controlBefore: days(500), controlAfter: days(510) }); assert.deepEqual(a, b); });
test("did daily: needs a week of data", () => assert.throws(() => didDaily({ changedBefore: [1], changedAfter: [1], controlBefore: [1], controlAfter: [1] })));

// ---------- logs ----------
test("logs: combined format parsed", () => { const r = parseLine('203.0.113.5 - - [12/Nov/2026:10:00:00 +0000] "GET /pricing?x=1 HTTP/1.1" 200 512 "https://chatgpt.com/" "Mozilla/5.0 GPTBot/1.4"'); assert.equal(r.path, "/pricing?x=1"); assert.equal(r.status, 200); assert.equal(r.referer, "https://chatgpt.com/"); });
test("logs: common format without referer/agent parsed", () => assert.equal(parseLine('1.1.1.1 - - [12/Nov/2026:10:00:00 +0000] "GET / HTTP/1.0" 304 -').status, 304));
test("logs: garbage line ignored", () => assert.equal(parseLine("hello"), null));
test("cidr: ipv4 in and out", () => { assert.ok(inCidr("104.210.140.130", "104.210.140.128/28")); assert.ok(!inCidr("104.210.140.144", "104.210.140.128/28")); });
test("cidr: /32 exact", () => { assert.ok(inCidr("18.97.43.80", "18.97.43.80/32")); assert.ok(!inCidr("18.97.43.81", "18.97.43.80/32")); });
test("cidr: ipv6 compressed", () => { assert.ok(inCidr("2001:4860:4801:10::abcd", "2001:4860:4801:10::/64")); assert.ok(!inCidr("2001:4860:4801:11::1", "2001:4860:4801:10::/64")); });
test("cidr: family mismatch is false", () => assert.ok(!inCidr("1.2.3.4", "2001:db8::/32")));
test("logs: verified, spoofed, unverifiable and AI referrals counted", async () => {
  const ranges = new Map([["https://openai.com/gptbot.json", ["20.0.0.0/24"]]]);
  const lines = [
    '20.0.0.5 - - [12/Nov/2026:10:00:00 +0000] "GET /a HTTP/1.1" 200 1 "-" "Mozilla/5.0; compatible; GPTBot/1.4"',
    '9.9.9.9 - - [12/Nov/2026:10:00:01 +0000] "GET /a HTTP/1.1" 200 1 "-" "Mozilla/5.0; compatible; GPTBot/1.4"',
    '8.8.4.4 - - [12/Nov/2026:10:00:02 +0000] "GET /b HTTP/1.1" 200 1 "-" "Mozilla/5.0 (compatible; ClaudeBot/1.0)"',
    '5.5.5.5 - - [12/Nov/2026:10:00:03 +0000] "GET /pricing HTTP/1.1" 200 1 "https://chatgpt.com/" "Mozilla/5.0 Chrome"',
    "garbage",
  ];
  const r = await analyzeLogs(lines, { verify: true, ranges });
  const g = r.bots.find((b) => b.name === "GPTBot");
  assert.equal(g.verified, 1); assert.equal(g.spoofed, 1);
  assert.equal(r.bots.find((b) => b.name === "ClaudeBot").unverifiable, 1);
  assert.equal(r.aiReferrals[0].source, "ChatGPT"); assert.equal(r.parsed, 4);
});

// ---------- versions ----------
test("versions: diff reports changed fields and heading changes", () => {
  const a = fingerprint({ status: 200, finalUrl: "u", title: "Old", description: "d", h1: ["H"], headings: [{ level: 2, text: "A" }], schemaTypes: ["Article"], words: 100, text: "x" });
  const b = fingerprint({ status: 200, finalUrl: "u", title: "New", description: "d", h1: ["H"], headings: [{ level: 2, text: "A" }, { level: 2, text: "B" }], schemaTypes: ["Article"], words: 150, text: "y" });
  const d = diff(a, b);
  assert.deepEqual(d.find((c) => c.field === "title"), { field: "title", from: "Old", to: "New" });
  assert.deepEqual(d.find((c) => c.field === "headings").added, ["## B"]);
  assert.ok(d.find((c) => c.field === "textHash"));
  assert.ok(!d.find((c) => c.field === "description"));
});
test("versions: identical fingerprints have no diff", () => { const f = fingerprint({ title: "t", text: "x" }); assert.deepEqual(diff(f, f), []); });

// ---------- engines ----------
test("bing: weekly rows aggregated and date-filtered", () => {
  const raw = [{ Query: "a", Clicks: 2, Impressions: 10, AvgImpressionPosition: 5, Date: "/Date(1767225600000-0700)/" }, { Query: "a", Clicks: 3, Impressions: 30, AvgImpressionPosition: 3, Date: "/Date(1767830400000-0700)/" }, { Query: "old", Clicks: 1, Impressions: 1, Date: "/Date(1316156400000-0700)/" }];
  const r = aggregateBing(raw, "Query", "2026-01-01", "2026-12-31");
  assert.equal(r.length, 1); assert.equal(r[0].clicks, 5); assert.equal(r[0].position, 3.5);
});
test("engines: only-in-one and gaps", () => {
  const c = compareEngines([{ key: "a", clicks: 10, impressions: 100, position: 3 }, { key: "g", clicks: 5, impressions: 50, position: 4 }], [{ key: "A", clicks: 2, impressions: 40, position: 9 }, { key: "b", clicks: 1, impressions: 30, position: 2 }]);
  assert.equal(c.onlyGoogle[0].key, "g"); assert.equal(c.onlyBing[0].key, "b"); assert.equal(c.biggestPositionGaps[0].positionGap, 6);
});
test("gsc property: bare domain becomes sc-domain", () => { assert.equal(gscProperty("www.acme.example"), "sc-domain:acme.example"); assert.equal(gscProperty("https://acme.example/"), "https://acme.example/"); });

// ---------- helpers ----------
test("spread: evenly spaced sample", () => assert.deepEqual(spread([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5), [1, 3, 5, 7, 9]));
test("locs: decodes &amp;", () => assert.deepEqual(locs("<url><loc> https://a/x?a=1&amp;b=2 </loc></url>"), ["https://a/x?a=1&b=2"]));
test("target: adds https and rejects private hosts", () => { assert.equal(target("example.com/a?b").origin, "https://example.com"); assert.throws(() => target("localhost")); assert.throws(() => target("printer.local")); });
