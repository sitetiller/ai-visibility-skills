// Check hreflang annotations in HTML <link> tags with `sitetiller page`.
// Usage: node check-hreflang.mjs <url> [--max 10] [--delay 500]
// Checks: self-reference, x-default, code shape, reserved region codes, absolute URLs, duplicate codes,
// and reciprocal links on up to --max alternates (fetched one at a time).
// Does NOT read hreflang in HTTP Link headers or XML sitemaps, and does not check that a language code
// is a real ISO 639-1 code (it only flags codes that are not two letters, so you can review them).
import { pageReport } from "../../../cli/lib/page.mjs";

const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith("--"));
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
if (!url) { console.error('Usage: node check-hreflang.mjs <url> [--max 10] [--delay 500]'); process.exit(2); }
const max = Number(opt("max", 10));
const delay = Number(opt("delay", 500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (u) => { try { const x = new URL(u); return x.origin + x.pathname.replace(/\/+$/, "") + x.search; } catch { return u; } };
// Calls the CLI library directly (no shell), so URLs from pages or files are never run as commands.
const page = (u) => pageReport(u);
const RESERVED_REGIONS = new Set(["EU", "UN", "UK"]);

const root = await page(url);
const here = norm(root.finalUrl);
const tags = root.hreflang || [];
const findings = [];
const add = (level, message, detail) => findings.push({ level, message, ...(detail ? { detail } : {}) });

if (!tags.length) add("info", "No hreflang <link> tags found in the HTML (headers and sitemaps are not read by this script).");
if (tags.length && !tags.some((t) => norm(t.href) === here)) add("error", "Page does not list itself (self-reference missing)", root.finalUrl);
if (tags.length && !tags.some((t) => t.lang.toLowerCase() === "x-default")) add("info", "No x-default (optional: a fallback for users whose language matches nothing)");

const seen = new Map();
for (const t of tags) {
  const lang = t.lang;
  if (!/^https?:\/\//i.test(t.href)) add("error", "hreflang URL is not fully qualified", t);
  const m = /^([a-z]{2,3})(?:-([a-z]{2}))?$/i.exec(lang);
  if (lang.toLowerCase() !== "x-default") {
    if (!m) add("review", "Code is not language or language-region in the simple form", t);
    else {
      if (m[1].length === 3) add("review", "3-letter language code; Google documents ISO 639-1 (2-letter)", t);
      if (m[2] && RESERVED_REGIONS.has(m[2].toUpperCase())) add("error", "Reserved region code has no effect (use GB for the United Kingdom)", t);
    }
  }
  const k = lang.toLowerCase();
  if (seen.has(k) && norm(seen.get(k)) !== norm(t.href)) add("review", "Same code points to different URLs", { lang, urls: [seen.get(k), t.href] });
  seen.set(k, t.href);
}

const targets = [...new Map(tags.filter((t) => norm(t.href) !== here).map((t) => [norm(t.href), t])).values()].slice(0, max);
for (const t of targets) {
  try {
    const p = await page(t.href);
    const back = (p.hreflang || []).some((x) => norm(x.href) === here);
    if (p.status >= 400) add("error", `Alternate answers HTTP ${p.status}`, t);
    else if (norm(p.finalUrl) !== norm(t.href)) add("error", "Alternate redirects to another URL (list the final URL)", { lang: t.lang, href: t.href, finalUrl: p.finalUrl });
    else if (!back) add("error", "No return link: alternate does not point back (Google ignores the tags)", t);
    if (p.noindex) add("error", "Alternate is noindex", t);
  } catch { add("error", "Could not fetch alternate", t); }
  if (delay) await sleep(delay);
}
console.log(JSON.stringify({ url: root.finalUrl, tags: tags.length, alternatesChecked: targets.length, alternatesNotChecked: Math.max(0, new Set(tags.map((t) => norm(t.href))).size - 1 - targets.length), findings }, null, 2));
