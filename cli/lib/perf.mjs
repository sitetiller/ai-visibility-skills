// Core Web Vitals history from the CrUX History API: weekly p75 trend for up to 40 collection periods,
// plus LCP subparts (TTFB, resource load delay, resource load duration, element render delay) to show where LCP time goes.
// Docs: https://developer.chrome.com/docs/crux/history-api (checked 2026-11-13).
import { rateCwv } from "./extras.mjs";
import { target } from "./http.mjs";

export const CORE = ["largest_contentful_paint", "interaction_to_next_paint", "cumulative_layout_shift"];
export const LCP_PARTS = [
  "largest_contentful_paint_image_time_to_first_byte",
  "largest_contentful_paint_image_resource_load_delay",
  "largest_contentful_paint_image_resource_load_duration",
  "largest_contentful_paint_image_element_render_delay",
];

const p75s = (m) => (m?.percentilesTimeseries?.p75s || []).map((v) => (v == null ? null : Number(v)));

/** Pure: turn a queryHistoryRecord response into a trend per metric and the latest LCP breakdown. */
export function summarizeHistory(j) {
  const rec = j?.record || {};
  const periods = (rec.collectionPeriods || []).map((p) => { const d = p.lastDate || {}; return d.year ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : null; });
  const metrics = {};
  for (const k of CORE) {
    const s = p75s(rec.metrics?.[k]);
    if (!s.length) continue;
    const vals = s.filter((v) => v != null);
    const last = [...s].reverse().find((v) => v != null) ?? null;
    const first = s.find((v) => v != null) ?? null;
    const recent = vals.slice(-4), earlier = vals.slice(-8, -4);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const change = recent.length && earlier.length ? (avg(recent) - avg(earlier)) / avg(earlier) : null;
    metrics[k] = { series: s, latest: last, latestRating: rateCwv(k, last), first, change4w: change == null ? null : Math.round(change * 1000) / 10,
      trend: change == null ? "unknown" : change > 0.1 ? "worse" : change < -0.1 ? "better" : "flat" };
  }
  const parts = {};
  for (const k of LCP_PARTS) { const s = p75s(rec.metrics?.[k]); const v = [...s].reverse().find((x) => x != null); if (v != null) parts[k.replace("largest_contentful_paint_image_", "")] = v; }
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  const lcpBreakdown = total ? Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, { ms: v, share: Math.round((v / total) * 100) / 100 }])) : null;
  const biggest = lcpBreakdown ? Object.entries(lcpBreakdown).sort((a, b) => b[1].ms - a[1].ms)[0][0] : null;
  const ADVICE = {
    time_to_first_byte: "Server response: caching, CDN, fewer redirects, faster backend.",
    resource_load_delay: "The LCP image is discovered late: put it in the HTML (not CSS/JS), add fetchpriority=high or a preload, do not lazy-load it.",
    resource_load_duration: "The LCP image is heavy: smaller dimensions, AVIF/WebP, srcset, CDN.",
    element_render_delay: "The image arrived but rendering waited: render-blocking CSS/JS, client-side rendering, fonts.",
  };
  return { periods, metrics, lcpBreakdown, biggestLcpPart: biggest, advice: biggest ? ADVICE[biggest] : null,
    note: "p75 per weekly collection period (28-day rolling windows). Subparts are p75s of each part separately, so they need not add up to LCP p75." };
}

export async function cruxHistory(raw, { key = process.env.CRUX_API_KEY, formFactor = "PHONE", origin = false, periods = 25, fetcher = fetch } = {}) {
  if (!key) throw new Error("Set CRUX_API_KEY (Google Cloud API key with the Chrome UX Report API enabled).");
  const t = target(raw);
  const body = { ...(origin ? { origin: t.origin } : { url: `${t.origin}${t.path}` }), ...(formFactor ? { formFactor } : {}), metrics: [...CORE, ...LCP_PARTS], collectionPeriodCount: Math.min(40, Math.max(1, Number(periods) || 25)) };
  const r = await fetcher(`https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { target: body.url || body.origin, formFactor, available: false, status: r.status, note: j.error?.message || "No CrUX history (not enough Chrome traffic). Try --origin." };
  return { target: body.url || body.origin, formFactor, available: true, ...summarizeHistory(j) };
}
