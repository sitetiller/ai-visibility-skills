// Test a URL mapping CSV (columns: old,new) with `sitetiller page`.
// Usage: node check-map.mjs map.csv [--delay 500]
// Reports per old URL: hops, first status, final URL, final status, and a verdict.
// Reads only. Waits between requests. Calls the CLI library directly (no shell).
import { readFileSync } from "node:fs";
import { pageReport } from "../../../cli/lib/page.mjs";

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
if (!file) { console.error("Usage: node check-map.mjs map.csv [--delay 500]"); process.exit(2); }
const delay = Number(opt("delay", 500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (u) => { try { const x = new URL(u); return x.origin + x.pathname + x.search; } catch { return u; } };

const rows = readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  .map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
if (/^old/i.test(rows[0][0])) rows.shift();

const out = [];
for (const [oldUrl, newUrl] of rows) {
  let r;
  try { r = await pageReport(oldUrl); }
  catch (e) { out.push({ oldUrl, verdict: "ERROR could not fetch" }); continue; }
  const hops = r.chain.length - 1;
  const first = r.chain[0].status;
  const flags = [];
  if (norm(r.finalUrl) !== norm(newUrl)) flags.push("final URL differs from map");
  if (r.status !== 200) flags.push(`final status ${r.status}`);
  if (hops > 1) flags.push(`chain of ${hops} redirects`);
  if (hops === 0) flags.push("no redirect");
  if (hops >= 1 && ![301, 308].includes(first)) flags.push(`first hop is ${first}, not 301/308`);
  if (r.noindex) flags.push("noindex on destination");
  if (r.canonical && norm(r.canonical) !== norm(r.finalUrl)) flags.push("canonical differs from final URL");
  out.push({ oldUrl, hops, first, finalUrl: r.finalUrl, status: r.status, verdict: flags.length ? flags.join("; ") : "ok" });
  if (delay) await sleep(delay);
}
console.log(JSON.stringify(out, null, 2));
const bad = out.filter((o) => o.verdict !== "ok").length;
console.error(`${out.length - bad} ok, ${bad} to review`);
