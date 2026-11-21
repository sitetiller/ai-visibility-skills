// Data study scanner: what do AI crawlers actually get from a site's public pages?
// Per host, at most one GET each of: robots.txt, the homepage with a browser user agent (control), the homepage once per
// tested AI-bot user-agent string, /llms.txt and one sitemap. No crawling, no login, no forms, no CAPTCHA or block bypass.
// Every request carries a From header and a user-agent suffix that name us. Same host: at least 2 s between requests.
// This is a UA-STRING test, not IP-verified: firewalls that verify real bot IP ranges may answer the real bot differently.
// Method: https://sitetiller.com/research . Reuses robots parsing (parseRobots, decide) and page analysis (agentChecks).
import { get, isPublicUrl, looksHtml, target, sleep, ToolError } from "./http.mjs";
import { parseRobots, decide, BOTS } from "./robots.mjs";
import { agentChecks } from "./agent.mjs";
import { analyzeHtml } from "./page.mjs";
import { toCsv, parseCsv } from "./csv.mjs";

export const STUDY_VERSION = "1";
export const CONTACT_URL = "https://sitetiller.com/research";
export const FROM = "hello@sitetiller.com";
export const SUFFIX = `SiteTillerResearch/${STUDY_VERSION}.0 (+${CONTACT_URL})`;
export const MIN_GAP_MS = 2000;
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// robots.txt rules are measured for all 14; the UA-string request is sent only for the bots in `uaBots`.
const EXTRA = [
  { agent: "Bytespider", owner: "ByteDance", purpose: "training" },
  { agent: "Meta-ExternalAgent", owner: "Meta", purpose: "training" },
  { agent: "Amazonbot", owner: "Amazon", purpose: "search" },
  { agent: "Claude-User", owner: "Anthropic", purpose: "user" },
  { agent: "Claude-SearchBot", owner: "Anthropic", purpose: "search" },
];
const WANT = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider", "Meta-ExternalAgent", "Amazonbot"];
const ALL = [...BOTS, ...EXTRA];
export const STUDY_BOTS = WANT.map((a) => ALL.find((b) => b.agent === a));

// Published user-agent strings of the vendors (each vendor documents its own; see skills/ai-crawlers/references/sources.md).
export const BOT_UA = {
  GPTBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1; +https://openai.com/gptbot)",
  "OAI-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
  "ChatGPT-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  ClaudeBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  "Claude-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)",
  "Claude-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +searchbot@anthropic.com)",
  PerplexityBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  "Perplexity-User": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
  CCBot: "CCBot/2.0 (https://commoncrawl.org/faq/)",
};
export const DEFAULT_UA_BOTS = ["GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot"];

const slug = (a) => a.toLowerCase().replace(/[^a-z0-9]+/g, "_");
export const withSuffix = (ua) => `${ua} ${SUFFIX}`;
export const stdHeaders = (ua) => ({ "user-agent": ua, from: FROM });

// ---------- pure helpers ----------

/** Challenge or block pages that answer HTTP 200, and the usual block statuses. */
const BLOCK_STATUS = new Set([401, 403, 406, 429, 451, 503]);
const CHALLENGE = /just a moment\.\.\.|cf-chl|attention required! \| cloudflare|checking your browser|enable javascript and cookies to continue|px-captcha|pardon our interruption|access denied|request blocked|you have been blocked|verify you are human|ddos protection by/i;
/** Crawler verification pages (e.g. "Checking search engine crawler...", hashcash probes): the server checks whether a
 * request that claims to be a known bot comes from that bot's IP ranges. A UA-string test from our IP cannot pass them,
 * but the real bot usually does, so they are not evidence of a block. */
const CRAWLER_VERIFY = /checking search engine crawler|__challenge\/probes\.js|HASHCASH_CONFIG/i;
export function isCrawlerVerify(r) {
  return !!(r && r.status && r.text && CRAWLER_VERIFY.test(r.text.slice(0, 20_000)));
}

export function isBlocked(r) {
  if (!r || !r.status) return false;
  if (BLOCK_STATUS.has(r.status)) return true;
  const mit = r.headers?.get?.("cf-mitigated");
  if (mit) return true;
  return r.status === 200 && r.text.length < 20_000 && CHALLENGE.test(r.text.slice(0, 20_000));
}

export function detectCdn(h) {
  const g = (k) => (h?.get?.(k) || "").toLowerCase();
  if (g("cf-ray") || g("server") === "cloudflare") return "cloudflare";
  if (g("x-vercel-id") || g("server") === "vercel") return "vercel";
  if (g("x-nf-request-id") || g("server") === "netlify") return "netlify";
  if (g("x-amz-cf-id") || g("via").includes("cloudfront")) return "cloudfront";
  if (g("x-served-by").includes("cache-") || g("x-fastly-request-id")) return "fastly";
  if (g("x-github-request-id")) return "github-pages";
  if (g("x-akamai-transformed") || g("server").includes("akamai")) return "akamai";
  if (g("x-sucuri-id") || g("server").includes("sucuri")) return "sucuri";
  if (g("x-azure-ref")) return "azure";
  return g("server") ? "other" : "unknown";
}

export function detectCms(html, h) {
  const t = String(html).slice(0, 250_000);
  const gen = (t.match(/<meta[^>]+name\s*=\s*["']generator["'][^>]*content\s*=\s*["']([^"']+)/i) || [])[1] || "";
  if (/wordpress/i.test(gen) || /\/wp-content\/|\/wp-includes\//.test(t)) return "wordpress";
  if (/webflow/i.test(gen) || /data-wf-(page|site)|webflow\.com/i.test(t)) return "webflow";
  if (/framer/i.test(gen) || /framerusercontent\.com|data-framer/i.test(t)) return "framer";
  if (/wix\.com|wixstatic\.com/i.test(t) || /wix/i.test(gen)) return "wix";
  if (/squarespace/i.test(gen) || /static1\.squarespace\.com/i.test(t)) return "squarespace";
  if (/cdn\.shopify\.com|shopify/i.test(t) && /shopify/i.test(t)) return "shopify";
  if (/ghost/i.test(gen)) return "ghost";
  if (/__next|_next\/static/.test(t)) return "nextjs";
  if (/__nuxt|_nuxt\//.test(t)) return "nuxt";
  if (/astro-island|astro-/i.test(t) || /astro/i.test(gen)) return "astro";
  if (/hugo|jekyll|docusaurus|gatsby|hexo|eleventy|mkdocs/i.test(gen)) return gen.split(/[\s]/)[0].toLowerCase();
  if (/lovable|gptengineer/i.test(t)) return "lovable";
  return "unknown";
}

/** Homepage text without JavaScript. js_empty = nothing the crawler could read; js_thin = under 150 words. */
/** Every word a reader without JavaScript can see in the body: scripts, styles, svg and templates removed, noscript kept. */
export function visibleWords(html) {
  const body = (String(html).match(/<body[\s\S]*$/i) || [String(html)])[0];
  const t = body.replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&[a-z]+;|&#\d+;/gi, " ");
  return t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function textFacts(html, finalUrl) {
  const a = agentChecks(html, { url: finalUrl });
  const f = analyzeHtml(html, { url: finalUrl, host: (() => { try { return new URL(finalUrl).hostname; } catch { return ""; } })() });
  const words = a.words;
  // "Is there text without JavaScript" must count everything a non-JS reader gets, including the hero in <header>,
  // nav labels and <noscript> fallbacks. a.words is the main-content count (nav/header/footer removed) and undercounts
  // landing pages: the pilot flagged 41 sites, hand check confirmed 22 (2026-11-16).
  const visible = visibleWords(html);
  const jsHint = a.appShell || /<noscript[^>]*>[^<]*(enable|requires?)[^<]*javascript/i.test(html);
  return {
    words, visibleWords: visible, scripts: a.scripts, appShell: a.appShell,
    textClass: words >= 150 ? "ok" : words >= 50 ? "thin" : "empty",
    jsOnly: visible < 50 && (a.scripts > 0 || jsHint),
    title: f.title, titleLen: f.title.length, canonical: f.canonical, noindex: f.noindex, h1: f.h1.length, schema: f.schemaTypes.length > 0,
  };
}

/** Compare a bot-UA response with the control response. */
export function verdict(control, bot, wordsOf = (t) => textFacts(t, "").words) {
  if (!bot || !bot.status) return "error";
  if (!control || !control.status) return "no-control";
  if (isBlocked(control) || control.status >= 400) return "control-failed";
  if (isCrawlerVerify(bot)) return "verify-challenge";
  if (isBlocked(bot)) return "blocked";
  if (bot.status >= 400) return "status-diff";
  if (bot.status !== control.status && Math.floor(bot.status / 100) !== Math.floor(control.status / 100)) return "status-diff";
  const cw = wordsOf(control.text), bw = wordsOf(bot.text);
  if (cw >= 50 && bw < cw * 0.5) return "content-diff";
  return "same";
}

const hostMatches = (host, entry) => host === entry || host.endsWith("." + entry);
export function parseOptout(text) {
  return String(text || "").split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "")).filter(Boolean);
}
export const isOptedOut = (host, list) => list.some((e) => hostMatches(host.replace(/^www\./, ""), e));

export function loadSites(csvText) {
  const rows = parseCsv(csvText);
  const hd = rows[0].map((h) => h.toLowerCase().trim());
  const iH = hd.indexOf("host");
  if (iH < 0) throw new ToolError("Sites CSV needs a host column.");
  return rows.slice(1).map((r) => Object.fromEntries(hd.map((h, i) => [h, r[i] ?? ""]))).filter((r) => r.host);
}

// ---------- fetching with per-host spacing ----------

/** Serialises requests per host and enforces the minimum gap; different hosts are not delayed by each other. */
export function makeLimiter(gap = MIN_GAP_MS, { now = () => Date.now(), wait = sleep } = {}) {
  const next = new Map();
  return async (host) => {
    const prev = next.get(host) || Promise.resolve(-Infinity);
    const mine = prev.then(async (at) => {
      const d = at + gap - now();
      if (d > 0) await wait(d);
      return now();
    });
    next.set(host, mine);
    return mine;
  };
}

/** One logical GET: follows up to 4 redirects by hand, only to public URLs, spacing every hop per host. */
export function makeFetcher({ limiter = makeLimiter(), ms = 12000, maxBytes = 1_500_000 } = {}) {
  return async (url, { ua }) => {
    let cur = url;
    for (let hop = 0; hop < 5; hop++) {
      if (!isPublicUrl(cur)) return { status: 0, text: "", error: "non-public-redirect", url: cur, headers: new Headers() };
      await limiter(new URL(cur).hostname);
      let r;
      try { r = await get(cur, { ms, maxBytes, manual: true, headers: { ...stdHeaders(ua), accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.5" } }); }
      catch (e) { return { status: 0, text: "", error: e.name === "AbortError" ? "timeout" : String(e.cause?.code || e.message).slice(0, 60), url: cur, headers: new Headers() }; }
      const loc = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && loc) { try { cur = new URL(loc, cur).toString(); } catch { return { ...r, url: cur }; } continue; }
      return { ...r, url: cur };
    }
    return { status: 0, text: "", error: "too-many-redirects", url: cur, headers: new Headers() };
  };
}

// ---------- scanning one site ----------

const ALLOW_ALL = { groups: [], sitemaps: [] };

/** `fetcher(url, {ua})` returns {status, text, headers, url}. Injectable for tests. */
export async function scanSite(site, { fetcher, uaBots = DEFAULT_UA_BOTS, now = () => new Date().toISOString() } = {}) {
  const host = String(site.host).toLowerCase().replace(/^www\./, "");
  const t = target(host);
  const origin = t.origin;
  const row = { host, source: site.source || "", scanned_at: now(), errors: [] };
  const plainUa = SUFFIX;

  // 1. robots.txt (our own UA)
  const rb = await fetcher(`${origin}/robots.txt`, { ua: plainUa });
  row.robots_status = rb.status;
  row.robots_found = rb.status === 200 && !looksHtml(rb.text);
  if (rb.error) row.errors.push(`robots:${rb.error}`);
  const parsed = row.robots_found ? parseRobots(rb.text) : ALLOW_ALL;
  const groups = parsed.groups;
  for (const b of STUDY_BOTS) { const d = decide(groups, b.agent, "/"); row[`robots_${slug(b.agent)}`] = d.allowed ? "allowed" : "blocked"; }
  row.robots_star_blocks_all = !decide(groups, "*", "/").allowed && !groups.some((g) => g.agents.some((x) => x !== "*"));
  row.robots_content_signal = row.robots_found && parseRobots(rb.text).contentSignals.length > 0;
  row.robots_blocked_count = STUDY_BOTS.filter((b) => row[`robots_${slug(b.agent)}`] === "blocked").length;

  // our own token is honoured: if robots.txt keeps SiteTillerResearch out of "/", nothing more is requested.
  const ours = decide(groups, "SiteTillerResearch", "/");
  row.robots_blocks_research_ua = !ours.allowed;
  row.skipped_by_robots = !ours.allowed;
  if (!ours.allowed) { return finish(row, uaBots); }

  // 2. homepage, browser UA (control): server text, title, canonical, noindex, CDN, CMS
  const control = await fetcher(`${origin}/`, { ua: withSuffix(CHROME) });
  row.home_status = control.status;
  row.home_final_url = control.url || "";
  if (control.error) row.errors.push(`home:${control.error}`);
  row.control_blocked = isBlocked(control);
  row.cdn = detectCdn(control.headers);
  const isHtml = control.status === 200 && looksHtml(control.text);
  if (isHtml) {
    const f = textFacts(control.text, control.url);
    Object.assign(row, { home_words: f.words, home_visible_words: f.visibleWords, home_scripts: f.scripts, app_shell: f.appShell, text_class: f.textClass, js_only: f.jsOnly, title: f.title, title_len: f.titleLen, canonical: f.canonical, noindex: f.noindex, h1_count: f.h1, schema: f.schema });
    row.canonical_cross_host = !!f.canonical && hostOf(f.canonical) !== hostOf(control.url);
    row.cms = detectCms(control.text, control.headers);
  } else { row.cms = "unknown"; }

  // 3. homepage once per tested bot UA, only where robots.txt allows that bot
  const redirectedAway = control.url && hostOf(control.url) !== hostOf(origin);
  for (const bot of uaBots) {
    const k = slug(bot);
    if (row[`robots_${k}`] === "blocked") { row[`ua_${k}_status`] = ""; row[`ua_${k}_verdict`] = "skipped-robots"; continue; }
    if (!BOT_UA[bot]) { row[`ua_${k}_verdict`] = "no-ua-string"; continue; }
    if (!control.status || row.control_blocked) { row[`ua_${k}_status`] = ""; row[`ua_${k}_verdict`] = "skipped-control-failed"; continue; }
    const r = await fetcher(redirectedAway ? control.url : `${origin}/`, { ua: withSuffix(BOT_UA[bot]) });
    row[`ua_${k}_status`] = r.status;
    row[`ua_${k}_verdict`] = verdict(control, r);
    if (r.error) row.errors.push(`ua_${k}:${r.error}`);
  }

  // 4. llms.txt, one GET
  const ll = await fetcher(`${origin}/llms.txt`, { ua: plainUa });
  row.llms_txt = ll.status === 200 && !looksHtml(ll.text) && /^#\s/m.test(ll.text);
  row.llms_status = ll.status;

  // 5. sitemap, one GET: first Sitemap line of robots.txt that is on this host, else /sitemap.xml
  const declared = (parsed.sitemaps || []).find((s) => { try { return hostOf(s) === hostOf(origin); } catch { return false; } });
  const smUrl = declared || `${origin}/sitemap.xml`;
  const sm = await fetcher(smUrl, { ua: plainUa });
  row.sitemap = sm.status === 200 && /<urlset|<sitemapindex/i.test(sm.text);
  row.sitemap_declared_in_robots = !!declared;
  row.sitemap_status = sm.status;
  return finish(row, uaBots);
}

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

function finish(row, uaBots) {
  const bad = uaBots.filter((b) => ["blocked", "status-diff", "content-diff"].includes(row[`ua_${slug(b)}_verdict`]));
  row.ua_tested = uaBots.filter((b) => ["same", "blocked", "status-diff", "content-diff", "error"].includes(row[`ua_${slug(b)}_verdict`])).length;
  row.mismatch_bots = bad.join("|");
  row.mismatch_any = bad.length > 0;
  row.mismatch_blocked = uaBots.some((b) => row[`ua_${slug(b)}_verdict`] === "blocked");
  row.errors = row.errors.join("|");
  return row;
}

// ---------- columns and summary ----------

export function columns(uaBots = DEFAULT_UA_BOTS) {
  return ["host", "source", "scanned_at", "robots_status", "robots_found", ...STUDY_BOTS.map((b) => `robots_${slug(b.agent)}`), "robots_blocked_count", "robots_star_blocks_all", "robots_content_signal", "robots_blocks_research_ua", "skipped_by_robots",
    "home_status", "home_final_url", "control_blocked", "home_words", "home_scripts", "app_shell", "text_class", "js_only", "title", "title_len", "canonical", "canonical_cross_host", "noindex", "h1_count", "schema", "cdn", "cms",
    ...uaBots.flatMap((b) => [`ua_${slug(b)}_status`, `ua_${slug(b)}_verdict`]), "ua_tested", "mismatch_any", "mismatch_blocked", "mismatch_bots", "llms_txt", "llms_status", "sitemap", "sitemap_declared_in_robots", "sitemap_status", "errors"];
}
export const rowsToCsv = (rows, uaBots) => toCsv(rows, columns(uaBots));

/** Wilson 95% interval for k of n. */
export function wilson(k, n, z = 1.96) {
  if (!n) return { p: null, lo: null, hi: null, k, n };
  const p = k / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n), m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { p, lo: Math.max(0, (c - m) / d), hi: Math.min(1, (c + m) / d), k, n };
}
export const FINDING_THRESHOLD = 0.03; // plan: mismatch >= 3% of robots-allowed sites counts as a finding [T]

export function summarize(rows, { uaBots = DEFAULT_UA_BOTS, optedOut = 0 } = {}) {
  const reached = rows.filter((r) => r.home_status && !r.skipped_by_robots);
  const t = (v) => v === true || v === "true";
  const perBotRobotsAll = STUDY_BOTS.map((b) => ({ bot: b.agent, purpose: b.purpose, ...wilson(rows.filter((r) => r[`robots_${slug(b.agent)}`] === "blocked").length, rows.length) }));
  const perBotUa = uaBots.map((b) => {
    const k = slug(b);
    const tested = rows.filter((r) => ["same", "blocked", "status-diff", "content-diff"].includes(r[`ua_${k}_verdict`]));
    const out = { bot: b, tested: tested.length };
    for (const v of ["same", "blocked", "status-diff", "content-diff"]) out[v] = tested.filter((r) => r[`ua_${k}_verdict`] === v).length;
    out.mismatch = wilson(out.blocked + out["status-diff"] + out["content-diff"], tested.length);
    return out;
  });
  const testedAny = rows.filter((r) => Number(r.ua_tested) > 0);
  const mismatch = wilson(testedAny.filter((r) => t(r.mismatch_any)).length, testedAny.length);
  const mismatchBlocked = wilson(testedAny.filter((r) => t(r.mismatch_blocked)).length, testedAny.length);
  const byCdn = {};
  for (const r of testedAny) { const c = r.cdn || "unknown"; (byCdn[c] ||= { n: 0, mismatch: 0 }).n++; if (t(r.mismatch_any)) byCdn[c].mismatch++; }
  const htmlRows = rows.filter((r) => r.text_class);
  const byCms = {};
  for (const r of htmlRows) { const c = r.cms || "unknown"; (byCms[c] ||= { n: 0, jsOnly: 0, empty: 0 }).n++; if (t(r.js_only)) byCms[c].jsOnly++; if (r.text_class === "empty") byCms[c].empty++; }
  const out = {
    sites_in_list: rows.length + optedOut, opted_out: optedOut, scanned: rows.length,
    homepage_reached: reached.length, homepage_unreachable: rows.filter((r) => !r.home_status && !r.skipped_by_robots).length,
    skipped_by_robots_for_our_ua: rows.filter((r) => t(r.skipped_by_robots)).length,
    control_blocked: rows.filter((r) => t(r.control_blocked)).length,
    robots_txt_found: wilson(rows.filter((r) => t(r.robots_found)).length, rows.length),
    robots_blocked_by_bot: perBotRobotsAll,
    robots_any_ai_bot_blocked: wilson(rows.filter((r) => Number(r.robots_blocked_count) > 0).length, rows.length),
    robots_star_blocks_all: wilson(rows.filter((r) => t(r.robots_star_blocks_all)).length, rows.length),
    robots_content_signal: wilson(rows.filter((r) => t(r.robots_content_signal)).length, rows.length),
    js_only: wilson(htmlRows.filter((r) => t(r.js_only)).length, htmlRows.length),
    text_empty: wilson(htmlRows.filter((r) => r.text_class === "empty").length, htmlRows.length),
    text_thin_or_empty: wilson(htmlRows.filter((r) => r.text_class !== "ok").length, htmlRows.length),
    ua_verify_challenge_sites: rows.filter((r) => uaBots.some((b) => r[`ua_${slug(b)}_verdict`] === "verify-challenge")).length,
    ua_test: { per_bot: perBotUa, sites_tested: testedAny.length, mismatch_any: mismatch, mismatch_blocked: mismatchBlocked, by_cdn: byCdn },
    llms_txt: wilson(rows.filter((r) => t(r.llms_txt)).length, reached.length),
    sitemap: wilson(rows.filter((r) => t(r.sitemap)).length, reached.length),
    title_missing: wilson(htmlRows.filter((r) => !r.title).length, htmlRows.length),
    canonical_missing: wilson(htmlRows.filter((r) => !r.canonical).length, htmlRows.length),
    noindex: wilson(htmlRows.filter((r) => t(r.noindex)).length, htmlRows.length),
    by_cms: byCms,
  };
  // Mismatch among sites where robots.txt allows every tested bot: the "says yes, server says no" number.
  const clean = testedAny.filter((r) => uaBots.every((b) => r[`ua_${slug(b)}_verdict`] !== "skipped-robots"));
  out.ua_test.robots_allows_all_tested_but_server_differs = wilson(clean.filter((r) => t(r.mismatch_any)).length, clean.length);
  out.finding = {
    threshold: FINDING_THRESHOLD,
    mismatch_meets_threshold: mismatch.n >= 1 && mismatch.p >= FINDING_THRESHOLD,
    note: "A finding needs the point estimate over the threshold AND a lower 95% bound above 0; check the rows by hand before using the number.",
    lower_bound_above_zero: mismatch.lo != null && mismatch.lo > 0,
  };
  return out;
}

const P = (w) => (w.p == null ? "n/a" : `${(w.p * 100).toFixed(1)}% (${w.k}/${w.n}, 95% CI ${(w.lo * 100).toFixed(1)}-${(w.hi * 100).toFixed(1)})`);
export function summaryMarkdown(s) {
  const L = [];
  L.push("# AI crawler study: summary", "", "UA-string test, not IP-verified. Public pages only; method at " + CONTACT_URL + ".", "");
  L.push(`Sites in list: ${s.sites_in_list} (opted out: ${s.opted_out}); scanned: ${s.scanned}; homepage reached: ${s.homepage_reached}; unreachable: ${s.homepage_unreachable}; skipped because robots.txt keeps our own crawler out: ${s.skipped_by_robots_for_our_ua}; homepage blocked even for the browser control: ${s.control_blocked}.`, "");
  L.push("## robots.txt", "", `- robots.txt found: ${P(s.robots_txt_found)}`, `- At least one of the 14 AI bots blocked: ${P(s.robots_any_ai_bot_blocked)}`, `- Everything blocked for all bots (User-agent: * and nothing else): ${P(s.robots_star_blocks_all)}`, `- Content-Signal lines present: ${P(s.robots_content_signal)}`, "");
  L.push("| Bot | Purpose | Blocked in robots.txt |", "|---|---|---|", ...s.robots_blocked_by_bot.map((b) => `| ${b.bot} | ${b.purpose} | ${P(b)} |`), "");
  L.push("## Server answer with AI-bot user-agent strings", "", `Sites with at least one bot request sent: ${s.ua_test.sites_tested}. Bots are tested only where robots.txt allows them.`, "");
  L.push("| Bot UA | Tested | Same | Blocked | Status differs | Content differs | Mismatch |", "|---|---|---|---|---|---|---|", ...s.ua_test.per_bot.map((b) => `| ${b.bot} | ${b.tested} | ${b.same} | ${b.blocked} | ${b["status-diff"]} | ${b["content-diff"]} | ${P(b.mismatch)} |`), "");
  L.push(`- Any tested bot got a different answer than the browser: ${P(s.ua_test.mismatch_any)}`, `- Any tested bot was blocked (4xx/5xx block status or challenge page): ${P(s.ua_test.mismatch_blocked)}`, `- Robots.txt allows every tested bot but the server differs: ${P(s.ua_test.robots_allows_all_tested_but_server_differs)}`, `- Sites answering bot UA strings with a crawler verification page (IP check; real bots usually pass, so not counted as blocked): ${s.ua_verify_challenge_sites ?? 0}`, "");
  L.push("| CDN | Sites | With mismatch |", "|---|---|---|", ...Object.entries(s.ua_test.by_cdn).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `| ${k} | ${v.n} | ${v.mismatch} |`), "");
  L.push("## Homepage without JavaScript", "", `- Under 50 words of readable text: ${P(s.text_empty)}`, `- JS-only (under 50 words and scripts or a no-JS notice present): ${P(s.js_only)}`, `- Under 150 words: ${P(s.text_thin_or_empty)}`, "");
  L.push("| CMS or framework | Sites | JS-only | Empty text |", "|---|---|---|---|", ...Object.entries(s.by_cms).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `| ${k} | ${v.n} | ${v.jsOnly} | ${v.empty} |`), "");
  L.push("## Basics", "", `- /llms.txt present (valid start, not an HTML page): ${P(s.llms_txt)}`, `- Sitemap found (robots.txt line or /sitemap.xml): ${P(s.sitemap)}`, `- Title missing: ${P(s.title_missing)}`, `- Canonical missing: ${P(s.canonical_missing)}`, `- Homepage noindex: ${P(s.noindex)}`, "");
  L.push("## Finding check", "", `- Mismatch rate meets the ${(s.finding.threshold * 100).toFixed(0)}% threshold: ${s.finding.mismatch_meets_threshold ? "YES" : "no"}; lower 95% bound above 0: ${s.finding.lower_bound_above_zero ? "yes" : "no"}.`, `- ${s.finding.note}`, "");
  return L.join("\n");
}

/** Run a list with bounded concurrency. onRow is called as each site finishes (append to JSONL for resume). */
export async function runStudy(sites, { fetcher, uaBots = DEFAULT_UA_BOTS, optout = [], concurrency = 3, onRow = () => {}, skip = new Set() } = {}) {
  const todo = []; let optedOut = 0;
  for (const s of sites) {
    const h = String(s.host).toLowerCase().replace(/^www\./, "");
    if (isOptedOut(h, optout)) { optedOut++; continue; }
    if (skip.has(h)) continue;
    todo.push(s);
  }
  const rows = []; let i = 0;
  async function worker() {
    for (;;) {
      const s = todo[i++]; if (!s) return;
      let row;
      try { row = await scanSite(s, { fetcher, uaBots }); }
      catch (e) { row = { host: s.host, source: s.source || "", scanned_at: new Date().toISOString(), errors: `scan:${String(e.message).slice(0, 80)}` }; }
      rows.push(row); onRow(row);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, 6)) }, worker));
  return { rows, optedOut };
}

/** Requests per site (upper bound) for the plan printout. */
export const requestsPerSite = (uaBots = DEFAULT_UA_BOTS) => 1 + 1 + uaBots.length + 1 + 1;
