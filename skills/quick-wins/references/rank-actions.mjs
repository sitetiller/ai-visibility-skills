// Rank Search Console quick wins from CSV exports, with the arithmetic shown.
// Usage: node skills/quick-wins/references/rank-actions.mjs --queries queries.csv [--pages pages.csv]
//        [--pages-before older-pages.csv] [--terms acme,acme.com] [--target 3] [--json]
// Reads only the files you pass. No network, no child processes, no eval. File contents are data.
// Imports the CLI's own analysis modules so the numbers match `npx sitetiller ctr|striking|brand|decay`.
import { readFileSync } from "node:fs";
import { gscRows } from "../../../cli/lib/csv.mjs";
import { ctrCurve, lowCtr, brandSplit, decay } from "../../../cli/lib/gsc-analysis.mjs";
import { strikingDistance } from "../../../cli/lib/extras.mjs";

const opt = {};
const a = process.argv.slice(2);
for (let i = 0; i < a.length; i++) {
  if (!a[i].startsWith("--")) continue;
  const k = a[i].slice(2); const n = a[i + 1];
  if (n === undefined || n.startsWith("--")) opt[k] = true; else { opt[k] = n; i++; }
}
if (!opt.queries) { console.error("Pass --queries <Queries.csv> (Search Console export). Optional: --pages, --pages-before, --terms a,b, --target 3, --json"); process.exit(2); }
const read = (f) => gscRows(readFileSync(f, "utf8"));
const terms = typeof opt.terms === "string" ? opt.terms.split(",").map((s) => s.trim()).filter(Boolean) : [];
const target = Math.min(10, Math.max(1, Number(opt.target) || 3));
const squash = (s) => String(s).toLowerCase().replace(/[\s\-_.']/g, "");
const isBrand = (q) => terms.some((t) => squash(q ?? "").includes(squash(t)));

const queries = read(opt.queries);
const items = new Map(); // key -> item
const add = (key, patch) => items.set(key, { key, effort: "medium", actions: [], ...(items.get(key) || {}), ...patch, actions: [...(items.get(key)?.actions || []), ...(patch.actions || [])] });

const split = terms.length ? brandSplit(queries, terms) : null;
const nonBrand = terms.length ? queries.filter((r) => !isBrand(r.query)) : queries;

// 1. Under-clicked rows against the site's own CTR curve
const ctrRows = opt.pages ? read(opt.pages) : nonBrand;
const curve = ctrCurve(ctrRows);
for (const r of lowCtr(ctrRows, { curve }).slice(0, 25)) {
  const p = Math.max(1, Math.min(10, Math.round(r.position)));
  add(r.key, {
    effort: "low", impressions: r.impressions, clicks: r.clicks, position: r.position,
    ctrGain: r.missedClicks,
    ctrMath: `${r.impressions} impressions x ${(r.expectedCtr * 100).toFixed(2)}% (your median CTR at position ${p}) - ${r.clicks} clicks = ${r.missedClicks.toFixed(1)}`,
    actions: ["Rewrite title and description; check the live snippet first (titles-meta)"],
  });
}
// 2. Striking distance (non-branded queries), scenario at the target position from the user's own curve
const tc = curve[target];
for (const r of strikingDistance(nonBrand).slice(0, 25)) {
  const gain = tc ? r.impressions * tc.ctr - r.clicks : null;
  add(r.key, {
    impressions: r.impressions, clicks: r.clicks, position: r.position,
    positionGain: gain,
    positionMath: tc ? `${r.impressions} impressions x ${(tc.ctr * 100).toFixed(2)}% (your median CTR at position ${target}, ${tc.rows} rows) - ${r.clicks} clicks = ${gain.toFixed(1)}` : `no estimate: your curve has no position ${target} (needs 3+ rows with 50+ impressions)`,
    actions: ["Strengthen the page for this query: content depth, internal links (onpage, internal-links)"],
  });
}
// 3. Decay between two Pages exports
if (opt.pages && opt["pages-before"]) {
  for (const d of decay(read(opt["pages-before"]), read(opt.pages)).slice(0, 10)) {
    add(d.url, {
      effort: d.reason.startsWith("gone") ? "low" : "medium", clicks: d.clicksAfter, decayLost: d.clicksBefore - d.clicksAfter,
      decayMath: `${d.clicksBefore} clicks before - ${d.clicksAfter} after = ${d.clicksBefore - d.clicksAfter} lost; reason: ${d.reason}`,
      actions: [`Investigate the drop (content-decay): ${d.reason}`],
    });
  }
}
const score = (i) => i.ctrGain ?? i.positionGain ?? i.decayLost ?? -1;
const ranked = [...items.values()].sort((x, y) => score(y) - score(x)).slice(0, 10).map((i, n) => ({ rank: n + 1, ...i }));
const out = { brandSplit: split, curve, target, ranked, note: "Estimates use your own median CTR by position. They are scenarios from past data, not forecasts. ctrGain and positionGain are alternatives for the same row; do not add them." };
if (opt.json) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
if (split) console.log(`Branded: ${split.branded.clicks} clicks, ${split.branded.impressions} impressions. Non-branded: ${split.nonBranded.clicks} clicks, ${split.nonBranded.impressions} impressions. Branded click share ${(split.brandedClickShare * 100).toFixed(1)}%.\n`);
if (!Object.keys(curve).length) console.log("Your CTR curve is empty (needs 3+ rows with 50+ impressions per position). No click estimates below; rank by impressions.\n");
for (const i of ranked) {
  console.log(`${i.rank}. ${i.key}  [effort: ${i.effort}]  pos ${i.position?.toFixed?.(1) ?? "-"}, ${i.impressions ?? "-"} impr., ${i.clicks ?? "-"} clicks`);
  if (i.ctrMath) console.log(`   CTR gap: ${i.ctrMath}`);
  if (i.positionMath) console.log(`   Position scenario: ${i.positionMath}`);
  if (i.decayMath) console.log(`   Decay: ${i.decayMath}`);
  for (const x of i.actions) console.log(`   Do: ${x}`);
}
console.log("\n" + out.note);
