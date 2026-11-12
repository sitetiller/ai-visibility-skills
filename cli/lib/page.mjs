// Read what a crawler sees on one page: status chain, title, description, robots, canonical, H1s, schema types, text.
import { get, looksHtml, target, ToolError, UA } from "./http.mjs";
import { decide, parseRobots } from "./robots.mjs";

const dec = (s) => String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
const attr = (tag, n) => (tag.match(new RegExp(`${n}\\s*=\\s*["']([^"']*)["']`, "i")) || [])[1] || "";
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ");

/** Visible, readable text with headings marked as #, ## ... */
export function readable(html) {
  let b = strip((html.match(/<body[\s\S]*$/i) || [html])[0]);
  b = b.replace(/<(nav|footer|header|aside|form)\b[\s\S]*?<\/\1>/gi, " ");
  b = b.replace(/<h([1-4])[^>]*>/gi, (_m, n) => "\n" + "#".repeat(Number(n)) + " ").replace(/<\/h[1-4]>/gi, "\n");
  b = b.replace(/<(p|li|tr|div|br)\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ");
  return b.split("\n").map((l) => dec(l)).filter(Boolean).join("\n");
}

/** Pure analysis of an HTML document. */
export function analyzeHtml(html, { url = "", headers = new Headers(), host = "" } = {}) {
  const head = html.slice(0, 250_000);
  const metaBy = (n) => (head.match(new RegExp(`<meta[^>]+(?:name|property)\\s*=\\s*["']${n}["'][^>]*>`, "gi")) || []).map((m) => dec(attr(m, "content")));
  const titles = [...head.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => dec(m[1]));
  const desc = metaBy("description");
  const robotsMeta = [...metaBy("robots"), ...metaBy("googlebot")];
  const xRobots = headers.get?.("x-robots-tag") || "";
  const canon = (head.match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]*>/gi) || []).map((m) => attr(m, "href"));
  const hreflang = (head.match(/<link[^>]+rel\s*=\s*["']alternate["'][^>]*>/gi) || []).filter((m) => /hreflang/i.test(m)).map((m) => ({ lang: attr(m, "hreflang"), href: attr(m, "href") }));
  const body = (html.match(/<body[\s\S]*$/i) || [html])[0];
  const h1 =[...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => dec(m[1].replace(/<[^>]+>/g, " ")));
  const headings = [...body.matchAll(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: dec(m[2].replace(/<[^>]+>/g, " ")) }));
  const schemaBlocks = [];
  const schemaTypes = new Set();
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed = null; let error = null;
    try { parsed = JSON.parse(m[1].trim()); } catch (e) { error = String(e.message).slice(0, 120); }
    const types = [...m[1].matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)].flatMap((t) => [...t[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
    types.forEach((t) => schemaTypes.add(t));
    schemaBlocks.push({ types, valid: !error, error });
  }
  for (const m of html.matchAll(/itemtype\s*=\s*["']https?:\/\/schema\.org\/(\w+)/gi)) schemaTypes.add(m[1]);
  const text = readable(html);
  const words = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const links = [];
  for (const m of body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let abs = ""; try { abs = new URL(m[1], url || "https://x.invalid/").toString(); } catch { continue; }
    let internal = false; try { internal = new URL(abs).hostname.replace(/^www\./, "") === host.replace(/^www\./, ""); } catch { /* ignore */ }
    links.push({ href: abs, internal, anchor: dec(m[2].replace(/<[^>]+>/g, " ")).slice(0, 120) });
  }
  const noindex = robotsMeta.some((v) => /noindex|none/i.test(v)) || /noindex|none/i.test(xRobots);
  return {
    title: titles[0] || "", titleCount: titles.length,
    description: desc[0] || "", descriptionCount: desc.length,
    robotsMeta, xRobots, noindex,
    canonical: canon[0] || "", canonicalCount: canon.length, hreflang,
    h1, headings, questionHeadings: headings.filter((h) => /\?\s*$/.test(h.text)).length,
    schemaTypes: [...schemaTypes], schemaBlocks,
    ogTitle: metaBy("og:title")[0] || "", ogDescription: metaBy("og:description")[0] || "",
    lang: (head.match(/<html[^>]+lang\s*=\s*["']([^"']+)["']/i) || [])[1] || "",
    words, tables: (body.match(/<table\b/gi) || []).length,
    images: imgs.length, imagesWithoutAlt: imgs.filter((t) => !/\balt\s*=\s*["'][^"']+["']/i.test(t)).length,
    links, internalLinks: links.filter((l) => l.internal).length, text,
  };
}

/** Fetch one URL like a crawler (manual redirects, max 6 hops) and analyse it, plus robots.txt for Googlebot. */
export async function pageReport(raw) {
  const t = target(raw);
  let url = `${t.origin}${t.path}`;
  const chain = [];
  let res = null;
  for (let i = 0; i < 6; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try { res = await fetch(url, { redirect: "manual", signal: ctrl.signal, headers: { "user-agent": UA } }); }
    catch { throw new ToolError(`Could not reach ${url}`); } finally { clearTimeout(timer); }
    chain.push({ url, status: res.status });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, url).toString(); continue; }
    break;
  }
  const html = res.status < 400 ? (await res.text()).slice(0, 2_000_000) : "";
  const facts = looksHtml(html) ? analyzeHtml(html, { url, headers: res.headers, host: t.host }) : null;
  let robots = null;
  try {
    const rb = await get(`${new URL(url).origin}/robots.txt`, { ms: 6000, maxBytes: 600_000 });
    if (rb.status === 200 && !looksHtml(rb.text)) { const u = new URL(url); robots = decide(parseRobots(rb.text).groups, "Googlebot", u.pathname + u.search); }
  } catch { /* ignore */ }
  return { requested: `${t.origin}${t.path}`, finalUrl: url, status: res.status, chain, contentType: res.headers.get("content-type") || "", robotsTxtGooglebot: robots, ...(facts || {}) };
}
