// RFC 4180-style CSV parsing, tolerant of BOM, CRLF and quoted commas. No dependencies.
export function parseCsv(text) {
  const s = String(text).replace(/^﻿/, "");
  const rows = []; let row = []; let cell = ""; let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] || "").trim());
}

export const num = (v) => { const x = parseFloat(String(v ?? "").replace(/[%\s]/g, "").replace(",", ".")); return Number.isFinite(x) ? x : 0; };

/** Map a Search Console export (any language order) to {key, clicks, impressions, ctr, position}. */
export function gscRows(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const hd = rows[0].map((h) => h.toLowerCase().trim());
  const col = (re) => hd.findIndex((h) => re.test(h));
  const iC = col(/^clicks/), iI = col(/^impressions/), iP = col(/^position/), iQ = col(/^(query|top queries|queries)/), iU = col(/^(page|url|top pages|pages|landing)/);
  if (iC < 0 || iI < 0) throw new Error("CSV needs Clicks and Impressions columns (Search Console English export).");
  return rows.slice(1).map((r) => {
    const impressions = num(r[iI]), clicks = num(r[iC]);
    return { key: r[0], query: iQ >= 0 ? r[iQ] : undefined, page: iU >= 0 ? r[iU] : undefined, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: iP >= 0 ? num(r[iP]) : null };
  }).filter((r) => r.impressions > 0);
}

export function toCsv(rows, cols) {
  const c = cols || Object.keys(rows[0] || {});
  const esc = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [c.join(","), ...rows.map((r) => c.map((k) => esc(r[k])).join(","))].join("\n") + "\n";
}
