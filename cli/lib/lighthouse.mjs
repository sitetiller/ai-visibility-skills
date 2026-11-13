// Lab performance for many pages with the PageSpeed Insights API (Lighthouse run by Google), one URL at a time.
// Lab data finds causes; field data (cwv, crux-history) decides pass or fail. Docs (checked 2026-11-13):
// https://developers.google.com/speed/docs/insights/v5/get-started and https://developers.google.com/speed/docs/insights/rest/v5/pagespeedapi/runpagespeed
import { isPublicUrl, sleep } from "./http.mjs";

const AUDITS = { lcpMs: "largest-contentful-paint", fcpMs: "first-contentful-paint", tbtMs: "total-blocking-time", cls: "cumulative-layout-shift", speedIndexMs: "speed-index" };

/** Pure: pick the numbers that matter from a runPagespeed response. */
export function summarizePsi(j) {
  const lr = j?.lighthouseResult || {};
  const cat = lr.categories || {};
  const score = (k) => (cat[k]?.score == null ? null : Math.round(cat[k].score * 100));
  const out = { finalUrl: lr.finalDisplayedUrl || lr.finalUrl || j?.id || "", lighthouseVersion: lr.lighthouseVersion || "",
    scores: { performance: score("performance"), accessibility: score("accessibility"), bestPractices: score("best-practices"), seo: score("seo") }, metrics: {} };
  for (const [k, id] of Object.entries(AUDITS)) { const v = lr.audits?.[id]?.numericValue; out.metrics[k] = v == null ? null : k === "cls" ? Math.round(v * 1000) / 1000 : Math.round(v); }
  out.opportunities = Object.values(lr.audits || {}).filter((a) => a?.details?.type === "opportunity" && (a.details.overallSavingsMs || 0) > 0)
    .sort((a, b) => b.details.overallSavingsMs - a.details.overallSavingsMs).slice(0, 5).map((a) => ({ id: a.id, title: a.title, savingsMs: Math.round(a.details.overallSavingsMs) }));
  return out;
}

export async function lighthouseBatch(urls, { strategy = "mobile", key = process.env.PSI_API_KEY || process.env.CRUX_API_KEY, delayMs = 2000, fetcher = fetch } = {}) {
  const rows = [];
  for (const u of urls) {
    if (!isPublicUrl(u)) { rows.push({ url: u, error: "not a public URL" }); continue; }
    const q = new URLSearchParams({ url: u, strategy });
    for (const c of ["performance", "accessibility", "best-practices", "seo"]) q.append("category", c);
    if (key) q.set("key", key);
    try {
      const r = await fetcher(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`);
      const j = await r.json().catch(() => ({}));
      rows.push(r.ok ? { url: u, ...summarizePsi(j) } : { url: u, error: j.error?.message || `HTTP ${r.status}` });
    } catch (e) { rows.push({ url: u, error: String(e.message || e) }); }
    if (delayMs && rows.length < urls.length) await sleep(delayMs);
  }
  const ok = rows.filter((r) => !r.error);
  const median = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
  return { strategy, tested: rows.length, failed: rows.length - ok.length,
    median: { performance: median(ok.map((r) => r.scores.performance)), lcpMs: median(ok.map((r) => r.metrics.lcpMs)), tbtMs: median(ok.map((r) => r.metrics.tbtMs)), cls: median(ok.map((r) => r.metrics.cls)) },
    worst: [...ok].sort((a, b) => (a.scores.performance ?? 101) - (b.scores.performance ?? 101)).slice(0, 5).map((r) => ({ url: r.url, performance: r.scores.performance, lcpMs: r.metrics.lcpMs })),
    rows, note: "Lab data from one simulated load per URL. Use it to find causes; judge Core Web Vitals on field data (cwv, crux-history)." };
}
