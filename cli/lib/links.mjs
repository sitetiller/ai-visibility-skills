// Internal links: crawl a spread of sitemap pages, collect <a href> links, find sitemap URLs nobody links to.
import { get, looksHtml, sleep } from "./http.mjs";
import { analyzeHtml } from "./page.mjs";
import { sitemapUrls, spread } from "./sitemap.mjs";

const norm = (u) => { try { const x = new URL(u); return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "")).toLowerCase(); } catch { return ""; } };

export async function linkReport(raw, { pages = 50, delayMs = 300 } = {}) {
  const s = await sitemapUrls(raw);
  if (!s.sitemapUrl) throw new Error("Needs an XML sitemap to compare against; none found.");
  const list = [...new Set(s.urls.filter((u) => !/\.(jpg|jpeg|png|gif|webp|svg|pdf|xml)$/i.test(u)))];
  const sample = [`${s.origin}/`, ...spread(list, pages - 1)];
  const inbound = new Map();
  const anchors = new Map();
  let crawled = 0;
  for (const u of sample) {
    try {
      const r = await get(u, { ms: 8000 });
      if (r.status >= 400 || !looksHtml(r.text)) continue;
      crawled++;
      const f = analyzeHtml(r.text, { url: r.url, headers: r.headers, host: s.host });
      const seen = new Set();
      for (const l of f.links) {
        if (!l.internal) continue;
        const k = norm(l.href);
        if (seen.has(k)) continue;
        seen.add(k);
        inbound.set(k, (inbound.get(k) || 0) + 1);
        if (l.anchor) { const a = anchors.get(k) || new Map(); a.set(l.anchor, (a.get(l.anchor) || 0) + 1); anchors.set(k, a); }
      }
    } catch { /* skip */ }
    if (delayMs) await sleep(delayMs);
  }
  const rows = list.map((u) => ({ url: u, linkedFrom: inbound.get(norm(u)) || 0, anchors: [...(anchors.get(norm(u)) || new Map()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t) }));
  return {
    sitemapUrl: s.sitemapUrl, listed: list.length, crawled,
    orphans: rows.filter((r) => r.linkedFrom === 0),
    weak: rows.filter((r) => r.linkedFrom > 0 && r.linkedFrom <= 2).sort((a, b) => a.linkedFrom - b.linkedFrom),
    note: "Orphan means not linked from the crawled sample. Increase --pages for more coverage.",
  };
}

/** Facts for up to n pages spread across the sitemap (titles, descriptions, schema, noindex, words). */
export async function pagesReport(raw, { pages = 20, delayMs = 300 } = {}) {
  const s = await sitemapUrls(raw);
  const clean = s.urls.filter((u) => !/\/(tag|category|author|page)\//i.test(u) && !/\.(jpg|jpeg|png|gif|webp|pdf|xml)$/i.test(u));
  const urls = clean.length ? spread(clean, pages) : [`${s.origin}/`];
  const out = [];
  for (const u of urls) {
    try {
      const r = await get(u, { ms: 8000 });
      if (r.status >= 400 || !looksHtml(r.text)) { out.push({ url: u, status: r.status, error: true }); continue; }
      const f = analyzeHtml(r.text, { url: r.url, headers: r.headers, host: s.host });
      out.push({ url: r.url, status: r.status, title: f.title, titleLength: f.title.length, description: f.description, descriptionLength: f.description.length, h1Count: f.h1.length, canonical: f.canonical, noindex: f.noindex, schemaTypes: f.schemaTypes, invalidSchemaBlocks: f.schemaBlocks.filter((b) => !b.valid).length, words: f.words, questionHeadings: f.questionHeadings, tables: f.tables });
    } catch { out.push({ url: u, status: 0, error: true }); }
    if (delayMs) await sleep(delayMs);
  }
  const ok = out.filter((p) => !p.error);
  const dupDesc = new Map(); ok.forEach((p) => { if (p.description) dupDesc.set(p.description, [...(dupDesc.get(p.description) || []), p.url]); });
  const dupTitle = new Map(); ok.forEach((p) => { if (p.title) dupTitle.set(p.title, [...(dupTitle.get(p.title) || []), p.url]); });
  const schema = {}; ok.forEach((p) => p.schemaTypes.forEach((t) => { schema[t] = (schema[t] || 0) + 1; }));
  return {
    sitemapUrl: s.sitemapUrl, listed: s.urls.length, read: ok.length, pages: out,
    summary: {
      missingDescription: ok.filter((p) => !p.descriptionLength).length,
      shortDescription: ok.filter((p) => p.descriptionLength && p.descriptionLength < 70).length,
      longDescription: ok.filter((p) => p.descriptionLength > 160).length,
      duplicateDescriptions: [...dupDesc.entries()].filter(([, v]) => v.length > 1).map(([d, v]) => ({ description: d, pages: v })),
      duplicateTitles: [...dupTitle.entries()].filter(([, v]) => v.length > 1).map(([t, v]) => ({ title: t, pages: v })),
      noindex: ok.filter((p) => p.noindex).map((p) => p.url),
      multipleOrNoH1: ok.filter((p) => p.h1Count !== 1).map((p) => p.url),
      schemaTypes: schema,
      invalidSchema: ok.filter((p) => p.invalidSchemaBlocks).map((p) => p.url),
    },
  };
}
