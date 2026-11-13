// Polite site crawler with per-page findings and a transparent, weighted site score.
// One request at a time, a delay between requests, robots.txt respected, same host only, private addresses refused.
// The score is a checklist ratio, not a ranking prediction: every point lost is traceable to a finding.
import { isPublicUrl, looksHtml, sleep, target, UA } from "./http.mjs";
import { analyzeHtml } from "./page.mjs";
import { imageAudit } from "./images.mjs";
import { decide, parseRobots } from "./robots.mjs";

export const WEIGHTS = { indexability: 30, onpage: 25, links: 20, content: 15, structured: 10 };
const SEV = { high: 1, medium: 0.5, low: 0.2 };
const SKIP_EXT = /\.(jpe?g|png|gif|webp|avif|svg|ico|pdf|zip|gz|mp4|webm|mp3|wav|css|js|mjs|json|xml|txt|woff2?|ttf|eot)$/i;
const sameSite = (a, b) => a.replace(/^www\./, "") === b.replace(/^www\./, "");

/** Form used for de-duplication: no fragment, no tracking parameters, lowercase host. Trailing slashes are kept:
 * /a and /a/ are different URLs to a server, and one often redirects to the other. */
export function normUrl(u) {
  try {
    const x = new URL(u);
    x.hash = "";
    x.hostname = x.hostname.toLowerCase();
    for (const k of [...x.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|msclkid$|ref$)/i.test(k)) x.searchParams.delete(k);
    return x.toString();
  } catch { return ""; }
}

/** Findings for one fetched page. Pure: facts come from analyzeHtml. */
export function pageFindings(p) {
  const f = [];
  const add = (category, severity, id, detail) => f.push({ category, severity, id, detail });
  if (p.status >= 400) { add("indexability", "high", "http-error", `HTTP ${p.status}`); return f; }
  if (p.status >= 300) return f; // redirects are reported at site level
  const x = p.facts;
  if (!x) { add("indexability", "medium", "not-html", "No HTML returned"); return f; }
  if (x.noindex) add("indexability", "medium", "noindex", "noindex in meta robots or X-Robots-Tag (fine if intended)");
  if (x.canonicalCount > 1) add("indexability", "high", "multiple-canonicals", `${x.canonicalCount} canonical tags`);
  else if (!x.canonical) add("indexability", "low", "no-canonical", "No canonical tag");
  else if (normUrl(new URL(x.canonical, p.url).toString()) !== normUrl(p.url)) add("indexability", "low", "canonical-elsewhere", `Canonical points to ${x.canonical}`);
  if (!x.title) add("onpage", "high", "no-title", "Missing <title>");
  else {
    if (x.titleCount > 1) add("onpage", "medium", "multiple-titles", `${x.titleCount} <title> tags`);
    if (x.title.length > 65) add("onpage", "low", "long-title", `${x.title.length} characters (often cut in results)`);
    if (x.title.length < 15) add("onpage", "low", "short-title", `${x.title.length} characters`);
  }
  if (!x.description) add("onpage", "medium", "no-description", "Missing meta description");
  else if (x.description.length > 160) add("onpage", "low", "long-description", `${x.description.length} characters (Bing flags over 160)`);
  if (x.h1.length === 0) add("onpage", "medium", "no-h1", "No H1");
  else if (x.h1.length > 1) add("onpage", "low", "multiple-h1", `${x.h1.length} H1 headings`);
  if (!x.lang) add("onpage", "low", "no-lang", "No lang attribute on <html>");
  if (x.internalLinks === 0) add("links", "low", "no-internal-links", "Page links to no other page on the site");
  if (p.depth > 3) add("links", "low", "deep-page", `${p.depth} clicks from the start page`);
  if (x.words < 200) add("content", "medium", "thin", `${x.words} words of main text`);
  if (p.altMissing) add("content", "low", "images-without-alt", `${p.altMissing} of ${x.images} images have no alt attribute`);
  const bad = x.schemaBlocks.filter((b) => !b.valid).length;
  if (bad) add("structured", "high", "invalid-json-ld", `${bad} JSON-LD block(s) do not parse`);
  if (!x.schemaTypes.length) add("structured", "low", "no-structured-data", "No structured data");
  return f;
}

/** Site score: per category, 100 x (1 - sum of severity weights / (pages x 1)), floored at 0; weighted average overall. */
export function scoreSite(pages, siteFindings = []) {
  const n = Math.max(1, pages.length);
  const loss = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, 0]));
  for (const p of pages) for (const f of p.findings) loss[f.category] += SEV[f.severity];
  for (const f of siteFindings) loss[f.category] += SEV[f.severity] * (f.count || 1);
  const categories = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, Math.max(0, Math.round(100 * (1 - loss[k] / n)))]));
  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const overall = Math.round(Object.entries(WEIGHTS).reduce((s, [k, w]) => s + categories[k] * w, 0) / total);
  return { overall, categories, weights: WEIGHTS, method: "Per category: 100 x (1 - severity-weighted findings per page). high=1, medium=0.5, low=0.2. Overall: weighted average. A checklist ratio, not a ranking prediction." };
}

/** Site-level findings: duplicates, broken and redirected internal links. */
export function siteFindings(pages, linksTo) {
  const out = [];
  const ok = pages.filter((p) => p.facts && p.status < 300);
  const dup = (key, id, label, category) => {
    const m = new Map();
    for (const p of ok) { const v = p.facts[key]; if (v) m.set(v, [...(m.get(v) || []), p.url]); }
    for (const [v, urls] of m) if (urls.length > 1) out.push({ category, severity: "medium", id, detail: `${label} "${v.slice(0, 80)}" on ${urls.length} pages`, urls, count: urls.length });
  };
  dup("title", "duplicate-title", "Title", "onpage");
  dup("description", "duplicate-description", "Description", "onpage");
  for (const p of pages) {
    const from = [...(linksTo.get(p.url) || [])];
    if (!from.length) continue;
    if (p.status >= 400) out.push({ category: "links", severity: "high", id: "broken-internal-link", detail: `${p.url} returns ${p.status}`, urls: from.slice(0, 10), count: from.length });
    else if (p.status >= 300) out.push({ category: "links", severity: "low", id: "link-to-redirect", detail: `${p.url} redirects to ${p.location}`, urls: from.slice(0, 10), count: from.length });
  }
  return out;
}

async function defaultFetch(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, { redirect: "manual", signal: ctrl.signal, headers: { "user-agent": UA, accept: "text/html,*/*;q=0.5" } });
    const ct = r.headers.get("content-type") || "";
    const text = r.status < 300 && /html/i.test(ct) ? (await r.text()).slice(0, 2_000_000) : "";
    return { status: r.status, headers: r.headers, location: r.headers.get("location") || "", text };
  } finally { clearTimeout(timer); }
}

/** Breadth-first crawl from a start URL. fetcher(url) -> {status, headers, location, text}; injectable for tests. */
export async function crawlSite(raw, { max = 50, delayMs = 1000, fetcher = defaultFetch, robotsTxt } = {}) {
  const t = target(raw);
  const start = normUrl(`${t.origin}${t.path}`);
  let groups = [];
  if (robotsTxt === undefined) {
    try { const r = await fetcher(`${t.origin}/robots.txt`); if (r.status === 200 && !looksHtml(r.text)) robotsTxt = r.text; } catch { /* none */ }
  }
  if (robotsTxt) groups = parseRobots(robotsTxt).groups;
  const allowed = (u) => { if (!groups.length) return true; const x = new URL(u); return decide(groups, "SiteTillerCLI", x.pathname + x.search).allowed !== false; };

  const queue = [{ url: start, depth: 0 }];
  const seen = new Set([start]);
  const linksTo = new Map();
  const pages = [];
  const blocked = [];
  while (queue.length && pages.length < max) {
    const { url, depth } = queue.shift();
    if (!allowed(url)) { blocked.push(url); continue; }
    let r;
    try { r = await fetcher(url); } catch (e) { pages.push({ url, depth, status: 0, error: String(e.message || e), findings: [{ category: "indexability", severity: "high", id: "unreachable", detail: "Request failed" }] }); continue; }
    const page = { url, depth, status: r.status, location: "" };
    if (r.status >= 300 && r.status < 400 && r.location) {
      const next = normUrl(new URL(r.location, url).toString());
      page.location = next;
      if (isPublicUrl(next) && sameSite(new URL(next).hostname, t.host) && !seen.has(next)) { seen.add(next); queue.push({ url: next, depth }); }
    }
    page.facts = r.text && looksHtml(r.text) ? analyzeHtml(r.text, { url, headers: r.headers || new Headers(), host: t.host }) : null;
    if (page.facts) {
      for (const l of page.facts.links) {
        if (!l.internal) continue;
        const u = normUrl(l.href);
        if (!u || SKIP_EXT.test(new URL(u).pathname) || !isPublicUrl(u)) continue;
        if (!linksTo.has(u)) linksTo.set(u, new Set());
        linksTo.get(u).add(url);
        if (!seen.has(u)) { seen.add(u); queue.push({ url: u, depth: depth + 1 }); }
      }
    }
    if (page.facts) page.altMissing = imageAudit(r.text, { url }).issueCounts["alt-missing"] || 0;
    page.findings = pageFindings(page);
    pages.push(page);
    if (delayMs && queue.length) await sleep(delayMs);
  }
  const site = siteFindings(pages, linksTo);
  const score = scoreSite(pages.filter((p) => !(p.status >= 300 && p.status < 400)), site);
  const counts = {};
  for (const f of [...pages.flatMap((p) => p.findings), ...site]) counts[f.id] = (counts[f.id] || 0) + (f.count || 1);
  return {
    start, crawled: pages.length, discovered: seen.size, notCrawled: Math.max(0, seen.size - pages.length - blocked.length), blockedByRobots: blocked,
    score, findingCounts: counts, siteFindings: site,
    pages: pages.map(({ facts, ...p }) => ({ ...p, title: facts?.title || "", words: facts?.words ?? null })),
  };
}
