// Agent readiness: can AI assistants and browsing agents fetch, read and act on a page without running JavaScript?
// Combines crawler access (robots.txt, Content-Signal), server-rendered text, semantic landmarks, accessible names
// (what an accessibility tree, which agents use, would expose), structured data and llms.txt. Deterministic checks.
import { get, target } from "./http.mjs";
import { analyzeHtml } from "./page.mjs";
import { robotsReport } from "./robots.mjs";
import { imageAudit } from "./images.mjs";

const attr = (tag, n) => { const m = tag.match(new RegExp(`\\s${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i")); return m ? (m[1] ?? m[2] ?? "") : null; };
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Pure: page-level checks from server HTML. */
export function agentChecks(html, { url = "" } = {}) {
  const h = String(html);
  const body = (h.match(/<body[\s\S]*$/i) || [h])[0];
  const f = analyzeHtml(h, { url, host: (() => { try { return new URL(url).hostname; } catch { return ""; } })() });
  const scripts = (h.match(/<script\b(?![^>]*application\/ld\+json)[^>]*>/gi) || []).length;
  const appShell = /<div[^>]+id\s*=\s*["'](root|app|__next|__nuxt|svelte)["'][^>]*>\s*<\/div>/i.test(body);
  // Skip hidden, button-like and honeypot fields (tabindex=-1 keeps them out of keyboard and assistive navigation).
  const inputs = [...body.matchAll(/<(input|select|textarea)\b[^>]*>/gi)].map((m) => m[0]).filter((t) => !/type\s*=\s*["']?(hidden|submit|button|image|reset)/i.test(t) && attr(t, "tabindex") !== "-1");
  const wrapped = [...body.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)].map((m) => m[1]).join("\n");
  const labelled = inputs.filter((t) => { const id = attr(t, "id"); if (wrapped.includes(t)) return true; return attr(t, "aria-label") || attr(t, "aria-labelledby") || attr(t, "title") || (id && new RegExp(`<label[^>]+for\\s*=\\s*["']${id.replace(/[^\w-]/g, "")}["']`, "i").test(body)); }).length;
  const buttons = [...body.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  const namedButtons = buttons.filter((m) => strip(m[2]) || /aria-label\s*=|title\s*=/.test(m[1])).length;
  const links = [...body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const emptyLinks = links.filter((m) => !strip(m[2]) && !/aria-label\s*=|title\s*=/.test(m[1]) && !/<img[^>]+alt\s*=\s*["'][^"']+/i.test(m[2])).length;
  const fakeLinks = (body.match(/<(div|span)\b[^>]*onclick\s*=/gi) || []).length;
  const img = imageAudit(h, { url });
  const checks = [
    ["Main text is in the server HTML (150+ words)", f.words >= 150, `${f.words} words without running JavaScript${appShell ? "; empty app-shell root found" : ""}`],
    ["One H1 and a heading outline", f.h1.length === 1 && f.headings.length >= 2, `${f.h1.length} H1, ${f.headings.length} H2-H4`],
    ["Landmarks: <main> and <nav>", /<main\b/i.test(body) && /<nav\b/i.test(body), ""],
    ["<html lang> set", !!f.lang, f.lang || "missing"],
    ["Form fields have labels", inputs.length === labelled, `${labelled}/${inputs.length}`],
    ["Buttons have accessible names", buttons.length === namedButtons, `${namedButtons}/${buttons.length}`],
    ["No empty links", emptyLinks === 0, `${emptyLinks} empty`],
    ["Clickable things are links or buttons (no onclick divs)", fakeLinks === 0, `${fakeLinks} onclick div/span`],
    ["Images have alt attributes", !(img.issueCounts["alt-missing"] > 0), `${img.issueCounts["alt-missing"] || 0} missing`],
    ["Structured data present and valid", f.schemaTypes.length > 0 && f.schemaBlocks.every((b) => b.valid), f.schemaTypes.join(", ") || "none"],
    ["Not noindex", !f.noindex, ""],
  ].map(([check, pass, detail]) => ({ check, pass: !!pass, detail }));
  return { words: f.words, scripts, appShell, checks, passed: checks.filter((c) => c.pass).length, of: checks.length };
}

export async function agentReport(raw) {
  const t = target(raw);
  const url = `${t.origin}${t.path}`;
  const r = await get(url, { ms: 10000, maxBytes: 3_000_000 });
  const page = agentChecks(r.text, { url: r.url });
  const robots = await robotsReport(raw);
  const userBots = robots.bots.filter((b) => b.purpose === "search" || b.purpose === "user");
  let llms = { status: 0 };
  try { const l = await get(`${t.origin}/llms.txt`, { ms: 6000, maxBytes: 300_000 }); llms = { status: l.status, found: l.status === 200 && /^#\s/m.test(l.text) }; } catch { /* none */ }
  const access = [
    { check: "AI search and user-triggered agents allowed by robots.txt", pass: userBots.every((b) => b.allowed), detail: userBots.filter((b) => !b.allowed).map((b) => b.agent).join(", ") || "all allowed" },
    { check: "Content-Signal preferences stated (optional)", pass: robots.contentSignals.length > 0, detail: robots.contentSignals.map((c) => Object.entries(c.signals).map(([k, v]) => `${k}=${v}`).join(", ")).join(" | ") || "none", optional: true },
    { check: "/llms.txt present (optional)", pass: !!llms.found, detail: `HTTP ${llms.status}`, optional: true },
  ];
  const all = [...access, ...page.checks];
  const required = all.filter((c) => !c.optional);
  return { url: r.url, status: r.status, ...page, access, passed: required.filter((c) => c.pass).length, of: required.length,
    note: "Checks are proxies: semantic HTML and accessible names help any client that reads the page without a screen. Firewall or CDN bot rules can still block agents and are not visible here." };
}
