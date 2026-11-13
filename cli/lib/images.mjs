// Image SEO and performance checks for one page: alt text, dimensions (layout shift), lazy-loading the likely LCP image,
// modern formats, responsive srcset, descriptive file names, preview image, and (optionally) byte size with HEAD requests.
import { isPublicUrl, sleep, UA } from "./http.mjs";

const attr = (tag, n) => { const m = tag.match(new RegExp(`\\s${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")); return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null; };
const GENERIC = /^(img|image|dsc|dscn|pxl|photo|pic|screenshot|screen[-_ ]?shot|untitled|whatsapp[-_ ]image|unnamed|download)[-_ ]?\d*/i;
const HASHY = /^[a-f0-9]{16,}$|^[A-Za-z0-9_-]{20,}$/;

export function fileName(src) {
  try { return decodeURIComponent(new URL(src, "https://x.invalid/").pathname.split("/").pop() || ""); } catch { return ""; }
}
export function format(src) {
  const ext = (fileName(src).match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || "";
  if (/^data:image\/(\w+)/i.test(src)) return src.match(/^data:image\/(\w+)/i)[1].toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

/** Pure audit of the <img> tags in an HTML document. */
export function imageAudit(html, { url = "" } = {}) {
  const body = (String(html).match(/<body[\s\S]*$/i) || [html])[0];
  const main = (body.match(/<main\b[\s\S]*?<\/main>/i) || [body])[0];
  const tags = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const firstMain = (main.match(/<img\b[^>]*>/i) || [])[0] || tags[0] || null;
  const images = tags.map((tag, i) => {
    const src = attr(tag, "src") || attr(tag, "data-src") || "";
    let abs = src; try { abs = new URL(src, url || "https://x.invalid/").toString(); } catch { /* keep */ }
    const alt = attr(tag, "alt");
    const name = fileName(src);
    const fmt = format(src);
    const issues = [];
    if (alt === null) issues.push({ id: "alt-missing", severity: "medium", detail: "No alt attribute (use alt=\"\" only for decorative images)" });
    else if (alt.length > 125) issues.push({ id: "alt-long", severity: "low", detail: `${alt.length} characters of alt text` });
    else if (alt && (alt.toLowerCase() === name.toLowerCase() || /\.(jpe?g|png|webp|gif)$/i.test(alt))) issues.push({ id: "alt-is-filename", severity: "low", detail: "Alt text is a file name" });
    else if (/^(image|picture|photo|graphic) of\b/i.test(alt || "")) issues.push({ id: "alt-redundant-prefix", severity: "low", detail: "Alt text starts with 'image of'" });
    if (attr(tag, "width") === null || attr(tag, "height") === null) if (!/aspect-ratio/i.test(attr(tag, "style") || "")) issues.push({ id: "no-dimensions", severity: "medium", detail: "No width/height: the layout can shift while it loads (CLS)" });
    const lazy = (attr(tag, "loading") || "").toLowerCase() === "lazy";
    if (tag === firstMain && lazy) issues.push({ id: "lazy-lcp-candidate", severity: "high", detail: "The first content image is lazy-loaded; if it is the LCP element this delays LCP" });
    if (["jpg", "png", "gif", "bmp", "tif", "tiff"].includes(fmt) && !/<picture\b/i.test(body.slice(Math.max(0, body.indexOf(tag) - 600), body.indexOf(tag)))) issues.push({ id: "legacy-format", severity: "low", detail: `${fmt.toUpperCase()} without a WebP/AVIF alternative in <picture>` });
    if (["jpg", "png", "webp", "avif"].includes(fmt) && attr(tag, "srcset") === null) issues.push({ id: "no-srcset", severity: "low", detail: "No srcset: phones may download a desktop-sized file" });
    const stem = name.replace(/\.[a-z0-9]+$/i, "");
    if (stem && (GENERIC.test(stem) || HASHY.test(stem))) issues.push({ id: "generic-filename", severity: "low", detail: `File name "${name}" says nothing about the image` });
    return { index: i, src: abs, alt, format: fmt, lazy, width: attr(tag, "width"), height: attr(tag, "height"), firstContentImage: tag === firstMain, issues };
  });
  const og = (String(html).match(/<meta[^>]+property\s*=\s*["']og:image["'][^>]*>/i) || [])[0];
  const counts = {};
  for (const im of images) for (const x of im.issues) counts[x.id] = (counts[x.id] || 0) + 1;
  return {
    images: images.length, issueCounts: counts,
    ogImage: og ? attr(og, "content") : null,
    pageIssues: og ? [] : [{ id: "no-og-image", severity: "low", detail: "No og:image: shared links and some AI answer cards show no preview" }],
    list: images,
  };
}

/** Optional byte sizes for up to n images with HEAD requests, one at a time. Flags files over maxKb. */
export async function imageSizes(list, { n = 20, maxKb = 200, delayMs = 200, fetcher = fetch } = {}) {
  const out = [];
  for (const im of list.slice(0, n)) {
    if (!isPublicUrl(im.src)) continue;
    try {
      const r = await fetcher(im.src, { method: "HEAD", redirect: "follow", headers: { "user-agent": UA } });
      const kb = Math.round(Number(r.headers.get("content-length") || 0) / 1024) || null;
      out.push({ src: im.src, status: r.status, kb, type: r.headers.get("content-type") || "", tooLarge: kb != null && kb > maxKb });
    } catch { out.push({ src: im.src, status: 0, kb: null }); }
    if (delayMs) await sleep(delayMs);
  }
  return out;
}
