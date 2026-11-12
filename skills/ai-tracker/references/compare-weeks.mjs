// Compare tracker results week by week, with margins of error.
// Usage: node compare-weeks.mjs .sitetiller/track/*.jsonl     (the shell expands the glob; or list files)
// Reads only the files you pass. No network, no child processes, no eval. File contents are treated as data:
// every line is parsed as JSON inside try/catch and only a few known fields are used.
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) { console.error("Pass one or more .jsonl files from .sitetiller/track/"); process.exit(2); }

const week = (iso) => { // ISO week label, e.g. 2026-W46
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return null;
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(); const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
};
const wilson = (k, n, z = 1.96) => { // Wilson score interval, better than the plain formula at small n
  if (!n) return [null, null]; const p = k / n; const d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d; const h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
};
const pct = (x) => (x == null ? "-" : `${(x * 100).toFixed(0)}%`);

const cells = new Map(); let bad = 0; let errors = 0;
for (const f of files) {
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { bad++; continue; }
    if (!r || typeof r !== "object") { bad++; continue; }
    if (r.error) { errors++; continue; }
    const w = week(r.at); const e = String(r.engine || "").replace(/[^\w.-]/g, "").slice(0, 20);
    if (!w || !e) { bad++; continue; }
    const key = `${w}\t${e}`;
    const c = cells.get(key) || { n: 0, mentioned: 0, cited: 0 };
    c.n++; if (r.mentioned === true) c.mentioned++; if (r.cited === true) c.cited++;
    cells.set(key, c);
  }
}
console.log("week      engine       answers  mentioned (95% Wilson)   cited (95% Wilson)   plain +/- at p");
for (const [key, c] of [...cells].sort()) {
  const [w, e] = key.split("\t");
  const [ml, mh] = wilson(c.mentioned, c.n); const [cl, ch] = wilson(c.cited, c.n);
  const p = c.cited / c.n; const plain = 1.96 * Math.sqrt(p * (1 - p) / c.n);
  console.log(`${w}  ${e.padEnd(11)}  ${String(c.n).padStart(6)}   ${pct(c.mentioned / c.n).padStart(4)} (${pct(ml)}-${pct(mh)})      ${pct(p).padStart(4)} (${pct(cl)}-${pct(ch)})     ${pct(plain)}`);
}
console.log(`\nSkipped: ${bad} unreadable lines, ${errors} failed calls. Treat two weeks as different only when their intervals do not overlap (a conservative rule). Prompts and answers are a sample either way.`);
