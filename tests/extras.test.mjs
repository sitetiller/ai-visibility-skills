import test from "node:test";
import assert from "node:assert/strict";
import { rateCwv, strikingDistance, pseoGate } from "../cli/lib/extras.mjs";
import { lintSchema } from "../cli/lib/schema-lint.mjs";

// ---------- Core Web Vitals thresholds (web.dev: LCP 2.5s/4s, INP 200/500ms, CLS 0.1/0.25) ----------
test("cwv: LCP bands", () => { assert.equal(rateCwv("largest_contentful_paint", 2500), "good"); assert.equal(rateCwv("largest_contentful_paint", 2501), "needs improvement"); assert.equal(rateCwv("largest_contentful_paint", 4001), "poor"); });
test("cwv: INP bands", () => { assert.equal(rateCwv("interaction_to_next_paint", 200), "good"); assert.equal(rateCwv("interaction_to_next_paint", 500), "needs improvement"); assert.equal(rateCwv("interaction_to_next_paint", 501), "poor"); });
test("cwv: CLS bands", () => { assert.equal(rateCwv("cumulative_layout_shift", 0.1), "good"); assert.equal(rateCwv("cumulative_layout_shift", 0.2), "needs improvement"); assert.equal(rateCwv("cumulative_layout_shift", 0.3), "poor"); });
test("cwv: unknown metric or missing value", () => { assert.equal(rateCwv("x", 1), null); assert.equal(rateCwv("cumulative_layout_shift", null), null); });

// ---------- striking distance ----------
test("striking: keeps positions 4-20 with impressions, ranks by impressions/position", () => {
  const r = strikingDistance([{ key: "a", position: 2, impressions: 9000 }, { key: "b", position: 5, impressions: 1000 }, { key: "c", position: 12, impressions: 6000 }, { key: "d", position: 8, impressions: 50 }, { key: "e", position: 25, impressions: 9000 }]);
  assert.deepEqual(r.map((x) => x.key), ["c", "b"]);
});

// ---------- pSEO gate ----------
const words = (n, seed) => Array.from({ length: n }, (_, i) => `${seed}${i % 97}w${i}`).join(" ");
const body = (n, seed) => `<p>${words(n, seed)}</p><table><tr><td>x</td></tr></table><pre>code</pre>`;
test("gate: good distinct pages pass", () => { const r = pseoGate([{ id: "a", body: body(700, "a"), sources: 3 }, { id: "b", body: body(700, "b"), sources: 3 }]); assert.equal(r.passed, true); });
test("gate: thin page fails", () => assert.ok(pseoGate([{ id: "a", body: body(100, "a"), sources: 3 }]).errors.some((e) => e.rule === "thin")));
test("gate: page without assets fails", () => assert.ok(pseoGate([{ id: "a", body: `<p>${words(700, "a")}</p>`, sources: 3 }]).errors.some((e) => e.rule === "no-assets")));
test("gate: unsourced page fails", () => assert.ok(pseoGate([{ id: "a", body: body(700, "a"), sources: 0 }]).errors.some((e) => e.rule === "unsourced")));
test("gate: near-duplicate pair fails", () => { const r = pseoGate([{ id: "a", body: body(700, "s"), sources: 3 }, { id: "b", body: body(700, "s") + "<p>extra</p>", sources: 3 }]); assert.ok(r.errors.some((e) => e.rule === "near-duplicate")); });
test("gate: shared template text is ignored with 4+ pages", () => {
  const tpl = `<nav>${words(300, "nav")}</nav>`;
  const pages = ["a", "b", "c", "d"].map((s) => ({ id: s, body: tpl + body(700, s), sources: 3 }));
  assert.equal(pseoGate(pages).errors.filter((e) => e.rule === "near-duplicate").length, 0);
});
test("gate: AI-tell pattern flagged", () => assert.ok(pseoGate([{ id: "a", body: body(700, "a") + "<p>It's not a tool, it's a partner.</p>", sources: 3 }]).errors.some((e) => e.rule === "ai-tell")));
test("gate: placeholder flagged", () => assert.ok(pseoGate([{ id: "a", body: body(700, "a") + "<p>TODO add data</p>", sources: 3 }]).errors.some((e) => e.rule === "placeholder")));
test("gate: duplicate titles flagged, entities decoded before length check", () => {
  const r = pseoGate([{ id: "a", title: "Invoice templates for freelancers &amp; teams", body: body(700, "a"), sources: 3 }, { id: "b", title: "Invoice templates for freelancers & teams", body: body(700, "b"), sources: 3 }]);
  assert.ok(r.errors.some((e) => e.rule === "duplicate-title"));
});
test("gate: markdown tables and images count as assets", () => assert.equal(pseoGate([{ id: "a", body: `${words(700, "m")}\n| a | b |\n|---|---|\n![chart](c.png)`, sources: 2 }]).passed, true));

// ---------- schema lint ----------
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
test("schema: SoftwareApplication without rating flagged as missing required", () => {
  const r = lintSchema(ld({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Acme", offers: { "@type": "Offer", price: "12" } }));
  assert.ok(r.findings.some((f) => f.level === "error" && /aggregateRating or review/.test(f.message)));
});
test("schema: complete SoftwareApplication has no errors", () => {
  const r = lintSchema(ld({ "@type": "SoftwareApplication", name: "Acme", offers: { price: "0" }, aggregateRating: { ratingValue: 4.8, ratingCount: 10 }, applicationCategory: "BusinessApplication", operatingSystem: "Web" }));
  assert.equal(r.findings.filter((f) => f.level === "error").length, 0);
});
test("schema: Product needs one of review, aggregateRating, offers", () => { assert.ok(lintSchema(ld({ "@type": "Product", name: "X" })).findings.some((f) => f.level === "error")); assert.equal(lintSchema(ld({ "@type": "Product", name: "X", offers: { price: 5 } })).findings.filter((f) => f.level === "error").length, 0); });
test("schema: subtype BlogPosting checked as Article (no required, only recommended)", () => { const r = lintSchema(ld({ "@type": "BlogPosting", headline: "h" })); assert.equal(r.findings.filter((f) => f.level === "error").length, 0); assert.ok(r.findings.some((f) => f.level === "warning")); });
test("schema: FAQPage reported as removed", () => assert.ok(lintSchema(ld({ "@type": "FAQPage", mainEntity: [] })).findings.some((f) => f.level === "info" && /2026-05-07/.test(f.message))));
test("schema: @graph entities are read", () => assert.deepEqual(Object.keys(lintSchema(ld({ "@context": "https://schema.org", "@graph": [{ "@type": "Organization" }, { "@type": "WebSite" }] })).types).sort(), ["Organization", "WebSite"]));
test("schema: duplicate Organization blocks warned", () => assert.ok(lintSchema(ld({ "@type": "Organization" }) + ld({ "@type": "Organization" })).findings.some((f) => /2 Organization/.test(f.message))));
test("schema: invalid JSON reported", () => assert.ok(lintSchema('<script type="application/ld+json">{bad</script>').findings.some((f) => f.level === "error" && /Invalid/.test(f.message))));
test("schema: Event requires location", () => assert.ok(lintSchema(ld({ "@type": "Event", name: "E", startDate: "2026-12-01" })).findings.some((f) => /location/.test(f.message))));
test("schema: LocalBusiness subtype requires address", () => assert.ok(lintSchema(ld({ "@type": "Dentist", name: "D" })).findings.some((f) => /address/.test(f.message))));

// ---------- citability ----------
import { sections, citability } from "../cli/lib/citability.mjs";
const CH = `<body><nav>menu</nav><h1>Invoice software</h1><p>Intro text that is long enough to count as a section with twenty five words in it for the threshold used by the citability summary function here ok.</p>
<h2>How much does it cost?</h2><p>Plans start at $12 per month. The free plan covers 2 users and unlimited invoices, which suits most freelancers who send fewer than 40 invoices a month.</p><table><tr><td>Solo</td></tr></table>
<h2>Why it matters</h2><p>In today's world, many businesses find that managing finances can be challenging and time consuming, and there are lots of different things to consider when choosing tools for the job ahead of them.</p></body>`;
test("cite: sections split by headings, nav removed", () => { const s = sections(CH); assert.deepEqual(s.map((x) => x.heading), ["Invoice software", "How much does it cost?", "Why it matters"]); });
test("cite: question heading, numbers, table detected", () => { const s = sections(CH)[1]; assert.equal(s.question, true); assert.ok(s.numbers >= 3); assert.equal(s.hasTable, true); assert.equal(s.firstSentenceWords, 6); });
test("cite: summary shares", () => { const c = citability(CH).summary; assert.equal(c.sectionCount, 3); assert.equal(c.questionHeadings, 1); assert.ok(c.specificShare > 0.3 && c.specificShare < 0.4); });
test("cite: dots inside tokens do not split sentences", () => {
  const s = sections("<body><h2>Setup</h2><p>Put llms.txt at the root, e.g. example.com/llms.txt and version 3.5 works. Then test it.</p></body>")[0];
  assert.equal(s.firstSentence, "Put llms.txt at the root, e.g. example.com/llms.txt and version 3.5 works.");
});
