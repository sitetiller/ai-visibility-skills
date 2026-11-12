// Analyses that run on Search Console data (CSV exports or API rows). Pure functions, no network.

const median = (a) => { const s = a.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** The site's own CTR by rounded position 1-10: median CTR of rows with >= minImp impressions, positions with >= minRows rows. */
export function ctrCurve(rows, { minImp = 50, minRows = 3 } = {}) {
  const b = {};
  for (const r of rows) {
    if (r.position == null || r.position > 10.5 || r.impressions < minImp) continue;
    const p = Math.max(1, Math.min(10, Math.round(r.position)));
    (b[p] = b[p] || []).push(r.ctr);
  }
  const curve = {};
  for (const p of Object.keys(b)) if (b[p].length >= minRows) curve[p] = { ctr: median(b[p]), rows: b[p].length };
  return curve;
}

/** Rows earning below `ratio` of the site's own median CTR at their position, ranked by missed clicks. */
export function lowCtr(rows, { minImp = 100, ratio = 0.6, curve = ctrCurve(rows) } = {}) {
  return rows
    .filter((r) => r.position != null && r.position <= 10.5 && r.impressions >= minImp)
    .map((r) => { const c = curve[Math.max(1, Math.min(10, Math.round(r.position)))]; return c ? { ...r, expectedCtr: c.ctr, missedClicks: r.impressions * c.ctr - r.clicks } : null; })
    .filter((r) => r && r.ctr < r.expectedCtr * ratio)
    .sort((a, b) => b.missedClicks - a.missedClicks);
}

const squash = (s) => String(s).toLowerCase().replace(/[\s\-_.']/g, "");

/** Split queries into branded / non-branded by brand terms (space, hyphen, dot and apostrophe insensitive). */
export function brandSplit(rows, terms) {
  const keys = terms.map(squash).filter(Boolean);
  const g = { branded: { queries: 0, clicks: 0, impressions: 0, pw: 0 }, nonBranded: { queries: 0, clicks: 0, impressions: 0, pw: 0 } };
  for (const r of rows) {
    const q = squash(r.query ?? r.key);
    const x = keys.some((k) => q.includes(k)) ? g.branded : g.nonBranded;
    x.queries++; x.clicks += r.clicks; x.impressions += r.impressions; x.pw += (r.position || 0) * r.impressions;
  }
  for (const x of Object.values(g)) { x.ctr = x.impressions ? x.clicks / x.impressions : 0; x.avgPosition = x.impressions ? x.pw / x.impressions : null; delete x.pw; }
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[ -]?");
  return { ...g, brandedClickShare: (g.branded.clicks + g.nonBranded.clicks) ? g.branded.clicks / (g.branded.clicks + g.nonBranded.clicks) : 0, gscRegex: `(${terms.map(esc).join("|")})` };
}

/** Queries where a second URL takes >= share of impressions (rows need query + page). */
export function cannibalization(rows, { minImp = 50, share = 0.2 } = {}) {
  const by = new Map();
  for (const r of rows) { if (!r.query || !r.page || r.impressions < minImp) continue; if (!by.has(r.query)) by.set(r.query, []); by.get(r.query).push(r); }
  const out = [];
  for (const [query, list] of by) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.impressions - a.impressions);
    const total = list.reduce((s, x) => s + x.impressions, 0);
    if (list[1].impressions / total >= share) out.push({ query, impressions: total, urls: list.map((x) => ({ page: x.page, impressions: x.impressions, share: x.impressions / total, clicks: x.clicks, position: x.position })) });
  }
  return out.sort((a, b) => b.impressions - a.impressions);
}

/** Pages losing clicks between two periods, with a likely reason. */
export function decay(before, after, { minClicks = 20, drop = 0.3 } = {}) {
  const b = new Map(before.map((r) => [r.page ?? r.key, r]));
  const a = new Map(after.map((r) => [r.page ?? r.key, r]));
  const out = [];
  for (const [url, x] of b) {
    if (x.clicks < minClicks) continue;
    const y = a.get(url);
    const change = y ? y.clicks / x.clicks - 1 : -1;
    if (change > -drop) continue;
    let reason = "mixed";
    if (!y) reason = "gone from report (not indexed, redirected, renamed or below export limits)";
    else if (y.impressions < x.impressions * 0.8 && y.position != null && x.position != null && y.position > x.position + 1) reason = "lost rankings";
    else if (y.impressions < x.impressions * 0.8) reason = "less demand at a similar position";
    else if (y.ctr < x.ctr * 0.8) reason = "lower CTR at similar impressions";
    out.push({ url, clicksBefore: x.clicks, clicksAfter: y ? y.clicks : 0, impressionsBefore: x.impressions, impressionsAfter: y ? y.impressions : 0, positionBefore: x.position, positionAfter: y ? y.position : null, change, reason });
  }
  return out.sort((p, q) => (p.clicksAfter - p.clicksBefore) - (q.clicksAfter - q.clicksBefore));
}
