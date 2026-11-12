// Find, read and sample XML sitemaps. Limits per Google: 50,000 URLs or 50 MB uncompressed per file.
import { get, looksHtml, target, sleep, UA } from "./http.mjs";
import { parseRobots } from "./robots.mjs";

export const locs = (xml) => [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));

/** Candidate sitemap URLs: the given path if it looks like a sitemap, robots.txt Sitemap lines, then common paths. */
export async function candidates(t) {
  const c = [];
  if (/\.xml(\.gz)?$/i.test(t.path) || /sitemap/i.test(t.path)) c.push(`${t.origin}${t.path}`);
  let fromRobots = [];
  try {
    const rb = await get(`${t.origin}/robots.txt`, { ms: 6000, maxBytes: 600_000 });
    if (rb.status === 200 && !looksHtml(rb.text)) fromRobots = parseRobots(rb.text).sitemaps;
  } catch { /* ignore */ }
  c.push(...fromRobots, `${t.origin}/sitemap.xml`, `${t.origin}/sitemap_index.xml`, `${t.origin}/wp-sitemap.xml`);
  return { list: [...new Set(c)], fromRobots };
}

/** All page URLs from the first working sitemap; for an index, reads up to `maxChildren` child sitemaps. */
export async function sitemapUrls(raw, { maxChildren = 10 } = {}) {
  const t = target(raw);
  const { list, fromRobots } = await candidates(t);
  const tried = [];
  for (const sm of list.slice(0, 6)) {
    let r;
    try { r = await get(sm, { ms: 10000, maxBytes: 52_000_000 }); } catch { tried.push({ url: sm, status: 0, kind: "unreachable" }); continue; }
    const kind = /<sitemapindex/i.test(r.text) ? "index" : /<urlset/i.test(r.text) ? "urlset" : looksHtml(r.text) ? "html" : "other";
    tried.push({ url: sm, status: r.status, kind });
    if (r.status !== 200 || (kind !== "index" && kind !== "urlset")) continue;
    const children = [];
    let urls = [];
    if (kind === "index") {
      const kids = locs(r.text);
      for (const k of kids.slice(0, maxChildren)) {
        try { const c = await get(k, { ms: 10000, maxBytes: 52_000_000 }); const l = c.status === 200 ? locs(c.text) : []; children.push({ url: k, status: c.status, urls: l.length }); urls.push(...l); }
        catch { children.push({ url: k, status: 0, urls: 0 }); }
      }
      if (kids.length > maxChildren) children.push({ url: `(${kids.length - maxChildren} more child sitemaps not read)`, status: null, urls: null });
    } else urls = locs(r.text);
    return { host: t.host, origin: t.origin, sitemapUrl: sm, kind, inRobots: fromRobots.includes(sm), robotsSitemaps: fromRobots, lastmod: (r.text.match(/<lastmod>/gi) || []).length, children, urls, tried };
  }
  return { host: t.host, origin: t.origin, sitemapUrl: null, kind: null, inRobots: false, robotsSitemaps: fromRobots, lastmod: 0, children: [], urls: [], tried };
}

/** Evenly spaced sample of n items. */
export function spread(arr, n) {
  if (arr.length <= n) return arr.slice();
  const out = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

/** Full sitemap report with a sample of listed URLs checked for status, redirect and noindex. */
export async function sitemapReport(raw, { sample = 20, delayMs = 300 } = {}) {
  const s = await sitemapUrls(raw);
  const issues = [];
  if (!s.sitemapUrl) return { ...s, found: false, issues: ["No XML sitemap found at robots.txt Sitemap lines or the usual paths."], sample: [] };
  const host = s.host.replace(/^www\./, "");
  const foreign = s.urls.filter((u) => { try { return new URL(u).hostname.replace(/^www\./, "") !== host; } catch { return true; } });
  if (!s.inRobots) issues.push(`Not listed in robots.txt. Add: Sitemap: ${s.sitemapUrl}`);
  if (foreign.length) issues.push(`${foreign.length} URL(s) on another host, e.g. ${foreign[0]}`);
  if (s.urls.length > 50000 && s.kind === "urlset") issues.push("More than 50,000 URLs in one file (Google's limit).");
  const http = s.urls.filter((u) => u.startsWith("http://")).length;
  if (http && s.origin.startsWith("https")) issues.push(`${http} http:// URL(s) on an https site`);
  if (!s.lastmod) issues.push("No <lastmod> values. Google uses accurate lastmod to schedule recrawls.");
  const checked = [];
  for (const u of spread(s.urls, sample)) {
    try {
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
      const x = await fetch(u, { redirect: "manual", signal: ctrl.signal, headers: { "user-agent": UA } });
      clearTimeout(timer);
      const txt = x.status === 200 ? (await x.text()).slice(0, 150_000) : "";
      const noindex = /<meta[^>]+name\s*=\s*["'](robots|googlebot)["'][^>]+noindex/i.test(txt) || /noindex/i.test(x.headers.get("x-robots-tag") || "");
      checked.push({ url: u, status: x.status, noindex, redirectedTo: x.status >= 300 && x.status < 400 ? x.headers.get("location") || "" : "" });
    } catch { checked.push({ url: u, status: 0, noindex: false, redirectedTo: "" }); }
    if (delayMs) await sleep(delayMs);
  }
  const bad = checked.filter((c) => c.status !== 200 || c.noindex);
  if (bad.length) issues.push(`${bad.length} of ${checked.length} sampled URLs are not clean 200 + indexable`);
  return { ...s, found: true, urlCount: s.urls.length, issues, sample: checked, urls: undefined };
}
