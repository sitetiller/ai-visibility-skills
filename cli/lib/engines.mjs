// Search Console, Bing Webmaster and GA4 connectors, plus the Google-vs-Bing comparison.
// Docs: Search Analytics query https://developers.google.com/webmaster-tools/v1/searchanalytics/query
//       URL Inspection https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
//       Bing Webmaster API https://learn.microsoft.com/en-us/bingwebmaster/getting-access (API key; data updated weekly)
//       GA4 Data API runReport https://developers.google.com/analytics/devguides/reporting/data/v1
import { googleJson } from "./google-auth.mjs";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

/** Search Console property id: "sc-domain:example.com" for domain properties, or a URL-prefix like "https://example.com/". */
export function gscProperty(site) {
  if (/^sc-domain:/.test(site) || /^https?:\/\//.test(site)) return site;
  return `sc-domain:${site.replace(/^www\./, "")}`;
}

/** Search Analytics rows, paged 25,000 at a time with startRow. Google returns top rows, not every row. */
export async function gscQuery(site, { start, end, dimensions = ["query"], rowLimit = 25000, maxRows = 100000, filters, type = "web", keyFile } = {}) {
  const prop = encodeURIComponent(gscProperty(site));
  const rows = [];
  for (let startRow = 0; startRow < maxRows; startRow += rowLimit) {
    const body = { startDate: start, endDate: end, dimensions, rowLimit, startRow, type, ...(filters ? { dimensionFilterGroups: [{ filters }] } : {}) };
    const j = await googleJson(`https://www.googleapis.com/webmasters/v3/sites/${prop}/searchAnalytics/query`, { scope: GSC_SCOPE, body, keyFile });
    const batch = (j.rows || []).map((r) => { const o = { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }; dimensions.forEach((d, i) => { o[d] = r.keys[i]; }); o.key = r.keys[0]; return o; });
    rows.push(...batch);
    if (batch.length < rowLimit) break;
  }
  return rows;
}

export async function gscInspect(site, url, { keyFile } = {}) {
  const j = await googleJson("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", { scope: GSC_SCOPE, body: { inspectionUrl: url, siteUrl: gscProperty(site) }, keyFile });
  const r = j.inspectionResult || {};
  const ix = r.indexStatusResult || {};
  return { url, verdict: ix.verdict, coverageState: ix.coverageState, robotsTxtState: ix.robotsTxtState, indexingState: ix.indexingState, lastCrawlTime: ix.lastCrawlTime, googleCanonical: ix.googleCanonical, userCanonical: ix.userCanonical, pageFetchState: ix.pageFetchState, link: r.inspectionResultLink };
}

// ---- Bing ----
const bingDate = (s) => { const m = /\/Date\((-?\d+)/.exec(String(s)); return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : String(s).slice(0, 10); };

export async function bingCall(method, params, { apiKey = process.env.BING_WEBMASTER_API_KEY } = {}) {
  if (!apiKey) throw new Error("No Bing key. Set BING_WEBMASTER_API_KEY (Bing Webmaster Tools → Settings → API Access).");
  const q = new URLSearchParams({ ...params, apikey: apiKey });
  const r = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/${method}?${q}`, { headers: { "content-type": "application/json; charset=utf-8" } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Bing API ${r.status}: ${j.Message || JSON.stringify(j).slice(0, 200)}`);
  return j.d ?? j;
}

/** Bing query stats (weekly rows) aggregated per query over [start, end]. */
export async function bingQueries(siteUrl, { start, end, apiKey } = {}) {
  const raw = await bingCall("GetQueryStats", { siteUrl }, { apiKey });
  return aggregateBing(raw, "Query", start, end);
}
export async function bingPages(siteUrl, { start, end, apiKey } = {}) {
  const raw = await bingCall("GetPageStats", { siteUrl }, { apiKey });
  return aggregateBing(raw, "Query", start, end);
}
export function aggregateBing(raw, keyField, start, end) {
  const m = new Map();
  for (const r of raw || []) {
    const d = bingDate(r.Date);
    if ((start && d < start) || (end && d > end)) continue;
    const k = r[keyField];
    const x = m.get(k) || { key: k, clicks: 0, impressions: 0, posW: 0 };
    x.clicks += r.Clicks || 0; x.impressions += r.Impressions || 0; x.posW += (r.AvgImpressionPosition || 0) * (r.Impressions || 0);
    m.set(k, x);
  }
  return [...m.values()].map((x) => ({ key: x.key, clicks: x.clicks, impressions: x.impressions, ctr: x.impressions ? x.clicks / x.impressions : 0, position: x.impressions ? x.posW / x.impressions : null }));
}

/** Join Google and Bing rows by key (query or page) and flag where one engine is far ahead. */
export function compareEngines(google, bing, { minImp = 20 } = {}) {
  const norm = (k) => String(k || "").trim().toLowerCase();
  const g = new Map(google.map((r) => [norm(r.key ?? r.query), r]));
  const b = new Map(bing.map((r) => [norm(r.key), r]));
  const keys = new Set([...g.keys(), ...b.keys()]);
  const rows = [];
  for (const k of keys) {
    const x = g.get(k), y = b.get(k);
    if ((x?.impressions || 0) + (y?.impressions || 0) < minImp) continue;
    rows.push({ key: k, googleClicks: x?.clicks || 0, googleImpressions: x?.impressions || 0, googlePosition: x?.position ?? null, bingClicks: y?.clicks || 0, bingImpressions: y?.impressions || 0, bingPosition: y?.position ?? null });
  }
  const only = (eng) => rows.filter((r) => (eng === "google" ? r.bingImpressions === 0 : r.googleImpressions === 0)).sort((a, z) => (eng === "google" ? z.googleImpressions - a.googleImpressions : z.bingImpressions - a.bingImpressions));
  const gap = rows.filter((r) => r.googlePosition != null && r.bingPosition != null).map((r) => ({ ...r, positionGap: r.bingPosition - r.googlePosition })).sort((a, z) => Math.abs(z.positionGap) - Math.abs(a.positionGap));
  const tot = (f) => rows.reduce((s, r) => s + r[f], 0);
  return { totals: { googleClicks: tot("googleClicks"), bingClicks: tot("bingClicks"), googleImpressions: tot("googleImpressions"), bingImpressions: tot("bingImpressions") }, onlyGoogle: only("google").slice(0, 50), onlyBing: only("bing").slice(0, 50), biggestPositionGaps: gap.slice(0, 50), rows };
}

// ---- GA4 ----
/** Sessions by session source and landing page for AI assistant referrals (full-match regex, as GA4 requires). */
export async function ga4AiSessions(propertyId, { start, end, keyFile } = {}) {
  const re = ".*(chatgpt\\.com|chat\\.openai\\.com|perplexity\\.ai|copilot\\.microsoft\\.com|gemini\\.google\\.com|claude\\.ai).*";
  const j = await googleJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    scope: GA_SCOPE, keyFile,
    body: { dateRanges: [{ startDate: start, endDate: end }], dimensions: [{ name: "sessionSource" }, { name: "landingPage" }], metrics: [{ name: "sessions" }, { name: "keyEvents" }],
      dimensionFilter: { filter: { fieldName: "sessionSource", stringFilter: { matchType: "FULL_REGEXP", value: re } } }, limit: 1000 },
  });
  return (j.rows || []).map((r) => ({ source: r.dimensionValues[0].value, landingPage: r.dimensionValues[1].value, sessions: Number(r.metricValues[0].value), keyEvents: Number(r.metricValues[1].value) }));
}
