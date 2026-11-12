// IndexNow submission, Core Web Vitals field data (CrUX API), striking-distance queries, pSEO quality gate.
import { createHash } from "node:crypto";
import { get, target } from "./http.mjs";

// ---------- IndexNow (https://www.indexnow.org/documentation) ----------
/** Submit up to 10,000 URLs of one host. Verifies the key file is reachable first. */
export async function indexNow(urls, { key = process.env.INDEXNOW_KEY, keyLocation, endpoint = "https://api.indexnow.org/indexnow" } = {}) {
  if (!key || !/^[A-Za-z0-9-]{8,128}$/.test(key)) throw new Error("INDEXNOW_KEY must be 8-128 characters: letters, digits, dashes.");
  if (!urls.length) throw new Error("No URLs to submit.");
  const host = new URL(urls[0]).hostname;
  if (urls.some((u) => new URL(u).hostname !== host)) throw new Error("All URLs must be on one host per request.");
  const loc = keyLocation || `https://${host}/${key}.txt`;
  const kf = await get(loc, { ms: 8000, maxBytes: 1000 });
  if (kf.status !== 200 || kf.text.trim() !== key) throw new Error(`Key file not found or wrong content at ${loc} (HTTP ${kf.status}). Upload a UTF-8 file containing only the key.`);
  const out = [];
  for (let i = 0; i < urls.length; i += 10000) {
    const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ host, key, keyLocation: loc, urlList: urls.slice(i, i + 10000) }) });
    const meaning = { 200: "submitted", 202: "received, key validation pending", 400: "invalid format", 403: "key invalid", 422: "URLs not on host or key mismatch", 429: "too many requests" }[r.status] || "unexpected";
    out.push({ status: r.status, meaning, count: Math.min(10000, urls.length - i) });
  }
  return { host, keyLocation: loc, batches: out };
}

// ---------- Core Web Vitals field data (https://developer.chrome.com/docs/crux/api) ----------
const THRESH = { largest_contentful_paint: [2500, 4000], interaction_to_next_paint: [200, 500], cumulative_layout_shift: [0.1, 0.25] };
export function rateCwv(metric, p75) { const t = THRESH[metric]; if (!t || p75 == null) return null; return p75 <= t[0] ? "good" : p75 <= t[1] ? "needs improvement" : "poor"; }

export async function cwv(raw, { key = process.env.CRUX_API_KEY, formFactor = "PHONE", origin = false } = {}) {
  if (!key) throw new Error("Set CRUX_API_KEY (Google Cloud API key with the Chrome UX Report API enabled).");
  const t = target(raw);
  const body = { ...(origin ? { origin: t.origin } : { url: `${t.origin}${t.path}` }), ...(formFactor ? { formFactor } : {}), metrics: Object.keys(THRESH) };
  const r = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { target: body.url || body.origin, formFactor, available: false, status: r.status, note: j.error?.message || "No CrUX data (not enough Chrome traffic for this URL or origin). Try --origin." };
  const m = j.record?.metrics || {};
  const metrics = Object.keys(THRESH).map((k) => { const p75 = m[k]?.percentiles?.p75 != null ? Number(m[k].percentiles.p75) : null; return { metric: k, p75, rating: rateCwv(k, p75) }; });
  return { target: body.url || body.origin, formFactor, available: true, collectionPeriod: j.record?.collectionPeriod, metrics, passes: metrics.every((x) => x.rating === "good") };
}

// ---------- Striking distance ----------
/** Queries or pages ranking 4-20 with real impressions: closest to page one / top three. */
export function strikingDistance(rows, { min = 4, max = 20, minImp = 100 } = {}) {
  return rows.filter((r) => r.position != null && r.position >= min && r.position <= max && r.impressions >= minImp)
    .map((r) => ({ ...r, opportunity: r.impressions / r.position }))
    .sort((a, b) => b.opportunity - a.opportunity);
}

const decodeEntities = (s) => String(s).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// ---------- pSEO quality gate (same rules as sitetiller.com's own gate) ----------
const text = (h) => String(h).replace(/<(script|style|svg|pre)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const shingles = (t, k = 8) => { const w = t.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []; const s = new Set(); for (let i = 0; i + k <= w.length; i++) s.add(w.slice(i, i + k).join(" ")); return s; };

/**
 * pages: [{id, title?, description?, body (HTML or Markdown), sources?: n}]
 * Fails thin pages, near-duplicates (shared 8-word phrases > maxShared of the smaller page), missing assets,
 * placeholders, banned AI-tell pattern, unsourced pages, and title/description outside limits.
 */
export function pseoGate(pages, { minWords = 600, maxShared = 0.12, minSources = 2, requireAssets = 2 } = {}) {
  const errs = [];
  const seen = { title: new Map(), description: new Map() };
  const sh = new Map();
  for (const p of pages) {
    const t = text(p.body);
    const words = t.split(" ").filter(Boolean).length;
    if (words < minWords) errs.push({ id: p.id, rule: "thin", detail: `${words} words (min ${minWords})` });
    const assets = [/<table|^\|.+\|\s*$/im, /<figure|<svg|!\[[^\]]*\]\(/i, /<pre|```/i, /<form|data-tool/i].filter((re) => re.test(p.body)).length;
    if (assets < requireAssets) errs.push({ id: p.id, rule: "no-assets", detail: `${assets} of table/figure/code/tool (min ${requireAssets})` });
    if ((p.sources ?? 0) < minSources) errs.push({ id: p.id, rule: "unsourced", detail: `${p.sources ?? 0} sources (min ${minSources})` });
    if (/lorem ipsum|\bTODO\b|\bTBD\b|\[citation/i.test(t)) errs.push({ id: p.id, rule: "placeholder", detail: "placeholder text" });
    if (/it'?s not (just )?\w+[^.]{0,40}, it'?s /i.test(t)) errs.push({ id: p.id, rule: "ai-tell", detail: `"it's not X, it's Y" pattern` });
    for (const k of ["title", "description"]) {
      p[k] = p[k] ? decodeEntities(p[k]).trim() : p[k];
      const v = (p[k] || "").toLowerCase();
      if (!v) continue;
      if (seen[k].has(v)) errs.push({ id: p.id, rule: `duplicate-${k}`, detail: `same as ${seen[k].get(v)}` });
      seen[k].set(v, p.id);
    }
    if (p.title && (p.title.length < 25 || p.title.length > 65)) errs.push({ id: p.id, rule: "title-length", detail: `${p.title.length} chars (25-65)` });
    if (p.description && (p.description.length < 110 || p.description.length > 165)) errs.push({ id: p.id, rule: "description-length", detail: `${p.description.length} chars (110-165)` });
    sh.set(p.id, shingles(t));
  }
  // Remove template text: phrases present on more than half the pages (navigation, footer, shared CTA).
  if (pages.length >= 4) {
    const df = new Map();
    for (const set of sh.values()) for (const x of set) df.set(x, (df.get(x) || 0) + 1);
    const common = new Set([...df.entries()].filter(([, n]) => n > pages.length / 2).map(([x]) => x));
    for (const [k, set] of sh) sh.set(k, new Set([...set].filter((x) => !common.has(x))));
  }
  const ids = [...sh.keys()];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = sh.get(ids[i]), b = sh.get(ids[j]);
    if (!a.size || !b.size) continue;
    let inter = 0; for (const x of a) if (b.has(x)) inter++;
    const share = inter / Math.min(a.size, b.size);
    if (share > maxShared) errs.push({ id: `${ids[i]} ~ ${ids[j]}`, rule: "near-duplicate", detail: `${(share * 100).toFixed(0)}% shared 8-word phrases` });
  }
  return { pages: pages.length, passed: errs.length === 0, errors: errs };
}

export const sha = (s) => createHash("sha256").update(s).digest("hex");
