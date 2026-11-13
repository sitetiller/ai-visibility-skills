// Backlinks from first-party data only: Search Console "Links" exports (CSV) and the Bing Webmaster API
// (GetLinkCounts, GetUrlLinks). No third-party index is needed; paid indexes (Ahrefs, Moz, DataForSEO) are optional
// and out of scope for this file. Docs (checked 2026-11-13):
// https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getlinkcounts
// https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.geturllinks
import { num, parseCsv } from "./csv.mjs";
import { bingCall } from "./engines.mjs";
import { sleep } from "./http.mjs";

/** Detect which Search Console links export a CSV is and return normalised rows. */
export function gscLinksCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { kind: "empty", rows: [] };
  const hd = rows[0].map((h) => h.toLowerCase().trim());
  const has = (re) => hd.findIndex((h) => re.test(h));
  const body = rows.slice(1);
  if (has(/^(site|linking site|top linking sites?)$/) >= 0 || (hd[0] === "site" && has(/linking pages/) >= 0)) {
    const iP = has(/linking pages/), iT = has(/target pages/);
    return { kind: "linking-sites", rows: body.map((r) => ({ site: r[0], linkingPages: num(r[iP]), targetPages: iT >= 0 ? num(r[iT]) : null })) };
  }
  if (has(/^(target page|top linked pages?|page)$/) >= 0 && has(/incoming links|links/) >= 0) {
    const iL = has(/incoming links|^links$/), iS = has(/linking sites/);
    return { kind: "linked-pages", rows: body.map((r) => ({ page: r[0], links: num(r[iL]), linkingSites: iS >= 0 ? num(r[iS]) : null })) };
  }
  if (has(/linking text|anchor/) >= 0) return { kind: "anchors", rows: body.map((r) => ({ anchor: r[0] })) };
  throw new Error("Unrecognised CSV. Export one of Search Console > Links: Top linking sites, Top linked pages or Top linking text.");
}

const SPAM = /\b(casino|bet(ting)?|poker|slots?|viagra|cialis|porn|xxx|escort|payday|loans?|replica|essay writing|crypto (signals|pump))\b/i;

/** Anchor mix: brand, URL, generic, other; plus anchors that warrant a manual look. */
export function anchorMix(anchors, { brand = [] } = {}) {
  const b = brand.map((x) => x.toLowerCase()).filter(Boolean);
  const kind = (a) => {
    const s = a.toLowerCase().trim();
    if (!s) return "empty";
    if (/^(https?:\/\/|www\.)|\.[a-z]{2,}(\/|$)/.test(s)) return "url";
    if (b.some((x) => s.includes(x))) return "brand";
    if (/^(click here|here|this|link|read more|learn more|website|visit|source|more|this site|this article|view|see more)$/.test(s)) return "generic";
    return "other";
  };
  const counts = { brand: 0, url: 0, generic: 0, other: 0, empty: 0 };
  for (const a of anchors) counts[kind(a)]++;
  const n = anchors.length || 1;
  const shares = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Math.round((v / n) * 100) / 100]));
  return { total: anchors.length, counts, shares, review: anchors.filter((a) => SPAM.test(a)).slice(0, 50) };
}

/** Concentration of linking sites: share of all linking pages that the top site and top 10 sites hold. */
export function concentration(sites) {
  const s = [...sites].sort((a, b) => b.linkingPages - a.linkingPages);
  const total = s.reduce((n, x) => n + x.linkingPages, 0) || 1;
  const top10 = s.slice(0, 10).reduce((n, x) => n + x.linkingPages, 0);
  return { linkingSites: s.length, linkingPages: total, topSite: s[0] || null, topSiteShare: Math.round(((s[0]?.linkingPages || 0) / total) * 100) / 100,
    top10Share: Math.round((top10 / total) * 100) / 100, review: s.filter((x) => SPAM.test(x.site)).slice(0, 50) };
}

/** Bing: pages on your site with inbound links and their counts (all result pages, capped). */
export async function bingLinkCounts(siteUrl, { apiKey, maxPages = 20, delayMs = 500, call = bingCall } = {}) {
  const out = [];
  for (let page = 0; page < maxPages; page++) {
    const d = await call("GetLinkCounts", { siteUrl, page: String(page) }, { apiKey });
    for (const l of d?.Links || []) out.push({ url: l.Url, count: Number(l.Count) || 0 });
    if (page + 1 >= Number(d?.TotalPages || 0)) break;
    if (delayMs) await sleep(delayMs);
  }
  return out.sort((a, b) => b.count - a.count);
}

/** Bing: linking URLs and anchor texts for one page of your site. */
export async function bingUrlLinks(siteUrl, link, { apiKey, maxPages = 10, delayMs = 500, call = bingCall } = {}) {
  const out = [];
  for (let page = 0; page < maxPages; page++) {
    const d = await call("GetUrlLinks", { siteUrl, link, page: String(page) }, { apiKey });
    for (const l of d?.Details || []) out.push({ from: l.Url, anchor: l.AnchorText || "" });
    if (page + 1 >= Number(d?.TotalPages || 0)) break;
    if (delayMs) await sleep(delayMs);
  }
  const domains = {};
  for (const l of out) { try { const h = new URL(l.from).hostname.replace(/^www\./, ""); domains[h] = (domains[h] || 0) + 1; } catch { /* skip */ } }
  return { link, links: out, linkingDomains: Object.entries(domains).sort((a, b) => b[1] - a[1]).map(([domain, links]) => ({ domain, links })) };
}
