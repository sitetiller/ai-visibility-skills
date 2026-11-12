// Build the self-contained HTML report from a values JSON file.
// Usage: node skills/seo-report/references/fill-report.mjs values.json report.html
// Reads the two files you name plus report-template.html next to this script. No network, no child processes,
// no eval. Every value is HTML-escaped. A row that has no `source` (the command output file it came from)
// is refused, so a number cannot enter the report without a trace.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const [valuesPath, outPath] = process.argv.slice(2);
if (!valuesPath || !outPath) { console.error("Usage: node fill-report.mjs values.json report.html"); process.exit(2); }
let v;
try { v = JSON.parse(readFileSync(valuesPath, "utf8")); } catch (e) { console.error(`Cannot read ${valuesPath} as JSON: ${e.message}`); process.exit(2); }

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const problems = [];
const need = (rows, name, fields) => (Array.isArray(rows) ? rows : []).map((r, i) => {
  for (const f of fields) if (r?.[f] == null || String(r[f]).trim() === "") problems.push(`${name}[${i}] is missing "${f}"`);
  return r || {};
});
const table = (head, rows, cols) => `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td${c === "source" ? ' class="src"' : ""}>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const section = (h, inner) => (inner ? `<h2>${esc(h)}</h2>\n${inner}\n` : "");

const summary = (Array.isArray(v.summary) ? v.summary : []).map((s) => `<li>${esc(s)}</li>`).join("");
const search = need(v.search, "search", ["metric", "value", "source"]);
const versions = need(v.versions, "versions", ["page", "change", "verdict", "source"]);
const ai = need(v.ai, "ai", ["metric", "value", "source"]);
const actions = need(v.actions, "actions", ["action", "why"]);
const limits = (Array.isArray(v.limits) ? v.limits : []).map((s) => `<li>${esc(s)}</li>`).join("");
if (problems.length) { console.error("Refusing to build the report:\n- " + problems.join("\n- ")); process.exit(1); }

const body = [
  section("Summary", summary && `<ul>${summary}</ul>`),
  section("Search: non-branded first", search.length && table(["Metric", "Value", "Compared with", "Source file"], search, ["metric", "value", "compare", "source"])),
  section("Changes shipped and measured", versions.length && table(["Page", "Change", "Lift and interval", "Verdict", "Source file"], versions, ["page", "change", "lift", "verdict", "source"])),
  section("AI citations", ai.length && table(["Metric", "Value", "Note", "Source file"], ai, ["metric", "value", "note", "source"])),
  section("Next actions", actions.length && table(["Action", "Why", "Effort", "Owner"], actions, ["action", "why", "effort", "owner"])),
  section("What this report does not cover", limits && `<ul class="note">${limits}</ul>`),
].join("");

const here = dirname(fileURLToPath(import.meta.url));
const tpl = readFileSync(join(here, "report-template.html"), "utf8");
const html = tpl
  .replaceAll("{{title}}", esc(v.title || "SEO report"))
  .replace("{{subtitle}}", esc(v.subtitle || ""))
  .replace("{{footer}}", esc(v.footer || "Every number traces to a command output file listed in its row."))
  .replace("{{body}}", () => body);
writeFileSync(outPath, html);
console.log(`Wrote ${outPath}`);
