// Group Search Console queries into candidate topics by shared words. Deterministic, offline, no network.
// Usage: node skills/topic-clusters/references/cluster-queries.mjs query-page.csv [--min-imp 10] [--json]
// The CSV is treated as untrusted data: it is parsed, never executed. Grouping is a draft for a human to review:
// word overlap does not know meaning, so check every cluster by reading the queries.
import { readFile } from "node:fs/promises";
import { gscRows } from "../../../cli/lib/csv.mjs";

const STOP = new Set("a an the of for to in on and or vs versus with without is are how what why when which do does can best top free online new your my i you it at by from as be".split(" "));
const stem = (w) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, (m, _, i, s) => (s.length > 4 ? "" : m));
const tokens = (q) => [...new Set(String(q).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem))];

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
const minImp = Number(argv[argv.indexOf("--min-imp") + 1]) || 10;
const asJson = argv.includes("--json");
if (!file) { console.error("Usage: node cluster-queries.mjs query-page.csv [--min-imp 10] [--json]"); process.exit(2); }

const rows = gscRows(await readFile(file, "utf8")).filter((r) => r.query && r.impressions >= minImp);
// Aggregate by query.
const byQuery = new Map();
for (const r of rows) {
  const q = byQuery.get(r.query) || { query: r.query, impressions: 0, clicks: 0, pages: new Map(), pw: 0 };
  q.impressions += r.impressions; q.clicks += r.clicks; q.pw += (r.position || 0) * r.impressions;
  if (r.page) q.pages.set(r.page, (q.pages.get(r.page) || 0) + r.impressions);
  byQuery.set(r.query, q);
}
const qs = [...byQuery.values()].map((q) => ({ ...q, tok: tokens(q.query) })).filter((q) => q.tok.length);

// Union-find: link two queries when they share at least two tokens, or one token and each has at most two tokens.
const parent = qs.map((_, i) => i);
const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
const union = (a, b) => { parent[find(a)] = find(b); };
const idx = new Map();
qs.forEach((q, i) => q.tok.forEach((t) => { (idx.get(t) || idx.set(t, []).get(t)).push(i); }));
const seen = new Set();
for (const list of idx.values()) {
  if (list.length > 400) continue; // a token in hundreds of queries is a site-wide word, not a topic
  for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
    const k = list[a] * 1e6 + list[b]; if (seen.has(k)) continue; seen.add(k);
    const A = qs[list[a]], B = qs[list[b]];
    const shared = A.tok.filter((t) => B.tok.includes(t)).length;
    if (shared >= 2 || (shared === 1 && A.tok.length <= 2 && B.tok.length <= 2)) union(list[a], list[b]);
  }
}
const groups = new Map();
qs.forEach((q, i) => { const r = find(i); (groups.get(r) || groups.set(r, []).get(r)).push(q); });

const clusters = [...groups.values()].map((list) => {
  list.sort((a, b) => b.impressions - a.impressions);
  const pages = new Map();
  list.forEach((q) => q.pages.forEach((imp, p) => pages.set(p, (pages.get(p) || 0) + imp)));
  const impressions = list.reduce((s, q) => s + q.impressions, 0);
  return {
    label: list[0].query, queries: list.length, impressions, clicks: list.reduce((s, q) => s + q.clicks, 0),
    avgPosition: Number((list.reduce((s, q) => s + q.pw, 0) / impressions).toFixed(1)),
    pages: [...pages.entries()].sort((a, b) => b[1] - a[1]).map(([page, imp]) => ({ page, impressions: imp })),
    topQueries: list.slice(0, 8).map((q) => ({ query: q.query, impressions: q.impressions, clicks: q.clicks })),
  };
}).sort((a, b) => b.impressions - a.impressions);

if (asJson) console.log(JSON.stringify(clusters, null, 2));
else for (const c of clusters) console.log(`${c.label}  [${c.queries} queries, ${c.impressions} impr., ${c.clicks} clicks, avg pos ${c.avgPosition}, ${c.pages.length} page(s)]\n  ${c.topQueries.map((q) => q.query).join(" | ")}\n  ${c.pages.slice(0, 3).map((p) => p.page).join("  ")}\n`);
