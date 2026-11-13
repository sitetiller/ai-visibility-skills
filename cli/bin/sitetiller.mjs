#!/usr/bin/env node
// SiteTiller CLI: SEO and AI visibility checks. Read-only except `version snapshot` (writes ./.sitetiller/).
import { readFile, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { robotsReport, parseRobots, decide, BOTS } from "../lib/robots.mjs";
import { pageReport } from "../lib/page.mjs";
import { sitemapReport } from "../lib/sitemap.mjs";
import { llmsReport, buildLlms } from "../lib/llms.mjs";
import { linkReport, pagesReport } from "../lib/links.mjs";
import { gscRows, parseCsv, toCsv } from "../lib/csv.mjs";
import { ctrCurve, lowCtr, brandSplit, cannibalization, decay } from "../lib/gsc-analysis.mjs";
import { didTotals, didDaily } from "../lib/measure.mjs";
import { analyzeLogs } from "../lib/logs.mjs";
import { snapshot, list as listVersions, diff, drift, rollbackPlan } from "../lib/versions.mjs";
import { gscQuery, gscInspect, bingQueries, bingPages, compareEngines, ga4AiSessions } from "../lib/engines.mjs";
import { indexNow, cwv, strikingDistance, pseoGate } from "../lib/extras.mjs";
import { lintSchema } from "../lib/schema-lint.mjs";
import { citability } from "../lib/citability.mjs";
import { track } from "../lib/tracker.mjs";
import { wpCreate, wpUpdate, wpUnpublish, readLedger } from "../lib/wordpress.mjs";
import { get, target } from "../lib/http.mjs";
import { crawlSite } from "../lib/crawl.mjs";
import { ghostCreate, ghostUpdate, ghostUnpublish } from "../lib/ghost.mjs";
import { githubPut, githubDelete } from "../lib/github-publish.mjs";
import { imageAudit, imageSizes } from "../lib/images.mjs";
import { contentQuality } from "../lib/quality.mjs";
import { generateSchema } from "../lib/schema-gen.mjs";
import { cruxHistory } from "../lib/perf.mjs";
import { gscLinksCsv, anchorMix, concentration, bingLinkCounts, bingUrlLinks } from "../lib/backlinks.mjs";
import { lighthouseBatch } from "../lib/lighthouse.mjs";
import { napReport } from "../lib/nap.mjs";
import { providerStatus, dataforseoSummary, ahrefsDomainRating } from "../lib/providers.mjs";
import { agentReport } from "../lib/agent.mjs";
import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";

const VERSION = "1.0.1";
const HELP = `sitetiller ${VERSION}: SEO and AI visibility checks

Site checks (public pages only):
  crawlers <url> [--agents A,B]      Which search/AI crawlers robots.txt allows, by purpose
  robots-test <robots.txt> <path...> [--agents A,B]   Test a local robots.txt draft
  page <url>                         What a crawler sees: status chain, title, meta, robots, canonical, schema
  sitemap <url> [--sample 20]        Find and validate the sitemap, test a spread of listed URLs
  llms <url>                         Validate /llms.txt against llmstxt.org and test its links
  pages <url> [--pages 20]           Titles, descriptions, H1, schema, noindex across sitemap pages
  links <url> [--pages 50]           Orphan and weakly linked pages (sitemap vs internal links)
  crawl <url> [--max 50] [--delay 1000]   Polite same-site crawl: findings per page, site score with the arithmetic
  images <url> [--sizes 20]          Image alt, dimensions, lazy LCP image, formats, srcset, file names (+ byte sizes)
  quality <url>                      Readability, author/date/sources/first-hand signals, filler phrases (checklist)
  schema-gen <type> [--name ... --url ...]   JSON-LD for organization|website|article|product|software|localbusiness|breadcrumb|event|person, linted
  agent <url>                        Agent readiness: crawler access, Content-Signal, server text, landmarks, accessible names, llms.txt
  lighthouse <url...> [--file urls.txt] [--strategy mobile|desktop]   Lab scores for many pages via PageSpeed Insights, one at a time
  nap <url...> --name X --phone Y [--address Z]   Name/address/phone consistency across your pages and listings you name

Search Console / Bing / GA4 (your credentials, read-only):
  gsc <site> --start YYYY-MM-DD --end YYYY-MM-DD [--dims query,page] [--out file.csv]
  inspect <site> <url>               URL Inspection API result
  bing <siteUrl> [--pages] [--start --end]
  engines <site> <bingSiteUrl> --start --end   Google vs Bing by query: only-in-one, position gaps
  ga4-ai <propertyId> --start --end  Sessions from AI assistants by landing page

  cite <url>                         Section-by-section quotability signals (answer first, numbers, tables, sources)
  schema <url>                       JSON-LD lint: Google-required properties, removed features, duplicates
  cwv <url> [--origin] [--form PHONE|DESKTOP]   Core Web Vitals p75 from CrUX (CRUX_API_KEY)
  crux-history <url> [--origin] [--form PHONE] [--periods 25]   Weekly CWV trend + LCP subparts (CrUX History API)
  backlinks <links.csv> [--brand a,b] | backlinks --bing <siteUrl> [--page <url>]   Search Console links export or Bing links
  indexnow <url...> [--file urls.txt]   Submit changed URLs to IndexNow (INDEXNOW_KEY, key file on site)
  gate <folder>                      pSEO quality gate on .html/.md drafts: thin, duplicates, sources, AI tells

AI answers (your own API keys; each call is billed by the provider):
  track --prompts prompts.txt --brand "Acme,acme.com" --domain acme.com [--competitors "X,Y"] [--engines openai,anthropic,perplexity] [--runs 1] [--yes]
                                     Ask assistants with web search; log mentions, citations, cited domains (.sitetiller/track/)

Optional paid providers (your own keys; each call is billed by the provider):
  provider status | provider dataforseo <domain> --yes | provider ahrefs <domain> --yes

Exports and logs (local files):
  ctr <Queries.csv|Pages.csv>        Your own CTR curve and under-clicked rows
  striking <Queries.csv> [--min-imp 100]   Positions 4-20 with real impressions, ranked
  brand <Queries.csv> --terms a,b    Branded vs non-branded split + Search Console regex
  cannibal <query-page.csv>          Queries split across several of your URLs
  decay <before.csv> <after.csv>     Pages losing clicks, with likely reason
  logs <access.log...> [--no-verify] AI and search bot hits, verified against published IP ranges
  measure --changed-before N --changed-after N [--control-before N --control-after N]
  measure --daily file.csv           (columns: group,period,clicks with group=changed|control, period=before|after)

Publish pages you own (ledger in ./.sitetiller/owned.json; existing pages are never edited):
  wp create|update|unpublish|owned <https://site> [--type posts|pages] [--title --content-file --slug --status --id]   (WP_USER, WP_APP_PASSWORD)
  ghost create|update|unpublish <https://admin-site> [--type posts|pages] [--title --html-file --slug --meta-title --meta-description --canonical --id]   (GHOST_ADMIN_API_KEY)
  github put|delete <owner/repo> --dir content/sitetiller --file x.md [--content-file local.md] [--branch main]   (GITHUB_TOKEN)

Versions of pages you own (stored in ./.sitetiller/):
  version snapshot <url> [--label x] | list <url> | diff <url> [a b] | drift <url> | rollback <url> [--to n]

Other:
  llms-build --name X --summary Y --pages pages.csv   (columns: section,url,title,note)

Add --json to any command for machine-readable output. Docs: https://github.com/sitetiller/ai-visibility-skills`;

function args(argv) {
  const pos = []; const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) { const k = a.slice(2); const n = argv[i + 1]; if (n === undefined || n.startsWith("--")) opt[k] = true; else { opt[k] = n; i++; } }
    else pos.push(a);
  }
  return { pos, opt };
}
const list = (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined);
const pct = (x, d = 1) => (x == null ? "-" : `${(x * 100).toFixed(d)}%`);
const n0 = (x) => (x == null ? "-" : Math.round(x).toLocaleString("en-US"));
function table(head, rows) {
  const w = head.map((h, i) => Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? "").length)));
  const line = (r) => "| " + r.map((c, i) => String(c ?? "").padEnd(w[i])).join(" | ") + " |";
  return [line(head), "|" + w.map((x) => "-".repeat(x + 2)).join("|") + "|", ...rows.map(line)].join("\n");
}
async function fetchPage(raw) { const t = target(raw); return get(`${t.origin}${t.path}`, { ms: 10000, maxBytes: 3_000_000 }); }
async function readLines(files) {
  const out = [];
  for (const f of files) { const rl = createInterface({ input: createReadStream(f), crlfDelay: Infinity }); for await (const l of rl) out.push(l); }
  return out;
}

const PRINT = {
  crawlers: (r) => [`robots.txt: ${r.url} (HTTP ${r.status})  path: ${r.path}`, "",
    table(["Crawler", "Owner", "Purpose", "Result", "Rule"], r.bots.map((b) => [b.agent, b.owner, b.purpose, b.allowed ? "allowed" : "BLOCKED", b.rule ? `${b.rule} (line ${b.line}, group ${b.group})` : "no matching rule"])),
    ...(r.contentSignals?.length ? ["", "Content-Signal: " + r.contentSignals.map((c) => `${Object.entries(c.signals).map(([k, v]) => `${k}=${v}`).join(", ")} (line ${c.line}, ${c.agents.join(", ")})`).join("; ")] : []),
    ...(r.notes.length ? ["", ...r.notes] : []), "", "Note: firewall/CDN bot rules are not visible here; check them separately."].join("\n"),
  page: (r) => [`${r.requested} -> ${r.finalUrl} (HTTP ${r.status})`, r.chain.length > 1 ? "Redirects: " + r.chain.map((c) => `${c.status} ${c.url}`).join(" -> ") : "",
    table(["Field", "Value"], [["Title", `${r.title} (${(r.title || "").length})`], ["Description", `${r.description} (${(r.description || "").length})`], ["H1", (r.h1 || []).join(" | ")], ["Canonical", r.canonical], ["Robots meta", (r.robotsMeta || []).join(", ") || "-"], ["X-Robots-Tag", r.xRobots || "-"], ["Noindex", r.noindex ? "YES" : "no"], ["robots.txt (Googlebot)", r.robotsTxtGooglebot ? (r.robotsTxtGooglebot.allowed ? "allowed" : `BLOCKED by ${r.robotsTxtGooglebot.rule}`) : "-"], ["Schema types", (r.schemaTypes || []).join(", ") || "-"], ["Words / tables / question headings", `${r.words} / ${r.tables} / ${r.questionHeadings}`]])].filter(Boolean).join("\n"),
  sitemap: (r) => r.found ? [`Sitemap: ${r.sitemapUrl} (${r.kind}, ${n0(r.urlCount)} URLs, in robots.txt: ${r.inRobots ? "yes" : "no"})`, "", ...(r.issues.length ? ["Issues:", ...r.issues.map((i) => "- " + i), ""] : ["No issues found.", ""]),
    table(["Sample URL", "Status", "Noindex", "Redirects to"], r.sample.map((s) => [s.url, s.status, s.noindex ? "YES" : "", s.redirectedTo]))].join("\n") : ["No sitemap found. Tried:", ...r.tried.map((t) => `- ${t.url} (${t.status}, ${t.kind})`)].join("\n"),
  llms: (r) => r.found ? [`${r.url} (${r.contentType}, ${r.bytes} bytes)`, "", table(["Check", "Result"], r.checks.map((c) => [c.label, c.ok ? "pass" : "FIX"])), "", table(["Link", "Status"], r.links.map((l) => [l.url, l.status || "no answer"]))].join("\n") : `${r.url}: ${r.note}`,
  logs: (r) => [`${r.parsed} of ${r.lines} lines parsed.`, "", table(["Bot", "Owner", "Purpose", "Hits", "Verified", "Spoofed", "Unverifiable", "IPs", "Top path"], r.bots.map((b) => [b.name, b.owner, b.purpose, b.hits, b.verified, b.spoofed, b.unverifiable, b.ips, b.paths[0]?.path || ""])),
    "", "Visits referred by AI assistants:", r.aiReferrals.length ? table(["Source", "Visits", "Top landing page"], r.aiReferrals.map((x) => [x.source, x.visits, x.paths[0]?.path || ""])) : "(none)",
    "", "Unverifiable = the owner publishes no IP list (Anthropic, Apple, Amazon, Meta and others); the user agent alone can be faked."].join("\n"),
};

const TIP_CMDS = new Set(["crawl", "crawlers", "page", "agent", "cite", "quality", "images", "schema", "sitemap", "llms", "pages", "links"]);

async function main() {
  const { pos, opt } = args(process.argv.slice(2));
  const cmd = pos.shift();
  if (opt.version || cmd === "version" && !pos.length) { console.log(VERSION); return; }
  if (!cmd || cmd === "help" || opt.help) { console.log(HELP); return; }
  let out;
  switch (cmd) {
    case "crawlers": out = await robotsReport(pos[0], { agents: list(opt.agents) }); break;
    case "robots-test": {
      const txt = await readFile(pos[0], "utf8"); const g = parseRobots(txt).groups;
      const agents = list(opt.agents) || BOTS.map((b) => b.agent);
      out = { tests: pos.slice(1).flatMap((p) => agents.map((a) => ({ path: p.replace(/^https?:\/\/[^/]+/i, "") || "/", agent: a, ...decide(g, a, p.replace(/^https?:\/\/[^/]+/i, "") || "/") }))) };
      if (!opt.json) { console.log(table(["Path", "Agent", "Result", "Rule"], out.tests.map((t) => [t.path, t.agent, t.allowed ? "allowed" : "BLOCKED", t.rule ? `${t.rule} (line ${t.line})` : "no matching rule"]))); return; }
      break;
    }
    case "page": out = await pageReport(pos[0]); if (opt.json) delete out.text; break;
    case "sitemap": out = await sitemapReport(pos[0], { sample: Number(opt.sample) || 20 }); break;
    case "llms": out = await llmsReport(pos[0]); break;
    case "pages": out = await pagesReport(pos[0], { pages: Number(opt.pages) || 20 }); break;
    case "links": out = await linkReport(pos[0], { pages: Number(opt.pages) || 50 }); break;
    case "gsc": {
      out = await gscQuery(pos[0], { start: opt.start, end: opt.end, dimensions: list(opt.dims) || ["query"], keyFile: opt.key });
      if (opt.out) { await writeFile(opt.out, toCsv(out)); console.error(`Wrote ${out.length} rows to ${opt.out}`); return; }
      break;
    }
    case "inspect": out = await gscInspect(pos[0], pos[1], { keyFile: opt.key }); break;
    case "bing": out = opt.pages ? await bingPages(pos[0], { start: opt.start, end: opt.end }) : await bingQueries(pos[0], { start: opt.start, end: opt.end }); break;
    case "engines": {
      const g = await gscQuery(pos[0], { start: opt.start, end: opt.end, dimensions: ["query"], keyFile: opt.key });
      const b = await bingQueries(pos[1], { start: opt.start, end: opt.end });
      out = compareEngines(g, b); if (!opt.json) { const t = out.totals; console.log(`Google: ${n0(t.googleClicks)} clicks / ${n0(t.googleImpressions)} impressions. Bing: ${n0(t.bingClicks)} / ${n0(t.bingImpressions)}.\n\nOnly in Bing (top 15):\n` + table(["Query", "Bing impr.", "Bing pos."], out.onlyBing.slice(0, 15).map((r) => [r.key, r.bingImpressions, r.bingPosition?.toFixed(1)])) + "\n\nOnly in Google (top 15):\n" + table(["Query", "Google impr.", "Google pos."], out.onlyGoogle.slice(0, 15).map((r) => [r.key, r.googleImpressions, r.googlePosition?.toFixed(1)]))); return; }
      break;
    }
    case "cite": { const r = await fetchPage(pos[0]); out = { url: r.url, status: r.status, ...citability(r.text) }; break; }
    case "schema": { const r = await fetchPage(pos[0]); out = { url: r.url, status: r.status, ...lintSchema(r.text) }; break; }
    case "crawl": out = await crawlSite(pos[0], { max: Number(opt.max) || 50, delayMs: opt.delay != null ? Number(opt.delay) : 1000 }); break;
    case "images": { const r = await fetchPage(pos[0]); out = { url: r.url, status: r.status, ...imageAudit(r.text, { url: r.url }) }; if (opt.sizes) out.sizes = await imageSizes(out.list, { n: Number(opt.sizes) || 20 }); break; }
    case "quality": { const r = await fetchPage(pos[0]); out = { status: r.status, ...contentQuality(r.text, { url: r.url }) }; break; }
    case "schema-gen": { const { json, ...data } = opt; out = generateSchema(pos[0], data); if (!opt.json) { console.log(out.html + "\n\n" + (out.lint.findings.length ? table(["Level", "Type", "Message"], out.lint.findings.map((f) => [f.level, f.type, f.message])) : "Lint: no findings.") + (out.notes.length ? "\n\n" + out.notes.join("\n") : "")); return; } break; }
    case "agent": out = await agentReport(pos[0]); break;
    case "lighthouse": { const urls = opt.file ? (await readFile(opt.file, "utf8")).split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : pos; out = await lighthouseBatch(urls, { strategy: opt.strategy === "desktop" ? "desktop" : "mobile", delayMs: opt.delay != null ? Number(opt.delay) : 2000 }); break; }
    case "nap": out = await napReport(pos, { name: opt.name, address: opt.address, phone: opt.phone }); break;
    case "provider": {
      const sub = pos.shift();
      if (sub === "status" || !sub) { out = providerStatus(); break; }
      if (!opt.yes) { console.log(`This calls ${sub}'s paid API once with your key and is billed by them. Re-run with --yes to proceed.`); return; }
      if (sub === "dataforseo") out = await dataforseoSummary(pos[0]);
      else if (sub === "ahrefs") out = await ahrefsDomainRating(pos[0], { date: opt.date });
      else throw new Error("provider needs: status | dataforseo | ahrefs");
      break;
    }
    case "crux-history": out = await cruxHistory(pos[0], { origin: !!opt.origin, formFactor: (opt.form || "PHONE").toUpperCase(), periods: opt.periods }); break;
    case "backlinks": {
      if (opt.bing) { out = opt.page ? await bingUrlLinks(opt.bing, opt.page) : { pages: await bingLinkCounts(opt.bing) }; if (opt.page) out.anchors = anchorMix(out.links.map((l) => l.anchor), { brand: list(opt.brand) || [] }); break; }
      const c = gscLinksCsv(await readFile(pos[0], "utf8"));
      out = c.kind === "linking-sites" ? { kind: c.kind, ...concentration(c.rows) } : c.kind === "anchors" ? { kind: c.kind, ...anchorMix(c.rows.map((r) => r.anchor), { brand: list(opt.brand) || [] }) } : { kind: c.kind, pages: c.rows.sort((a, b) => b.links - a.links).slice(0, 100) };
      break;
    }
    case "cwv": out = await cwv(pos[0], { origin: !!opt.origin, formFactor: (opt.form || "PHONE").toUpperCase() }); break;
    case "indexnow": { const urls = opt.file ? (await readFile(opt.file, "utf8")).split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : pos; out = await indexNow(urls); break; }
    case "striking": out = strikingDistance(gscRows(await readFile(pos[0], "utf8")), { minImp: Number(opt["min-imp"]) || 100 }).slice(0, 100); break;
    case "gate": {
      const files = (await readdir(pos[0])).filter((f) => [".html", ".md"].includes(extname(f)));
      const pages = [];
      for (const f of files) {
        const body = await readFile(join(pos[0], f), "utf8");
        const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || body.match(/^#\s+(.+)$/m) || [])[1]?.trim();
        const description = (body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || body.match(/^description:\s*"?(.+?)"?\s*$/m) || [])[1];
        const sources = new Set([...body.matchAll(/https?:\/\/[^\s"')<>\]]+/g)].map((m) => m[0])).size;
        pages.push({ id: f, title, description, body, sources });
      }
      out = pseoGate(pages, { minWords: Number(opt["min-words"]) || 600 });
      if (!opt.json) { console.log(out.passed ? `Gate passed for ${out.pages} page(s).` : table(["Page", "Rule", "Detail"], out.errors.map((e) => [e.id, e.rule, e.detail]))); if (!out.passed) process.exitCode = 1; return; }
      break;
    }
    case "track": {
      const prompts = (await readFile(opt.prompts, "utf8")).split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith("#"));
      const engines = list(opt.engines) || ["openai", "anthropic", "perplexity"];
      const runs = Number(opt.runs) || 1;
      const calls = prompts.length * engines.length * runs;
      if (!opt.yes) { console.log(`This will make up to ${calls} API calls (${prompts.length} prompts x ${engines.length} engines x ${runs} runs), billed to your API accounts. Re-run with --yes to proceed.`); return; }
      out = await track(prompts, { engines, runs, brand: list(opt.brand) || [], domain: opt.domain || "", competitors: list(opt.competitors) || [] });
      break;
    }
    case "wp": {
      const sub = pos.shift(); const site = pos[0]; const type = opt.type || "posts";
      const content = opt["content-file"] ? await readFile(opt["content-file"], "utf8") : undefined;
      if (sub === "create") out = await wpCreate(site, { type, title: opt.title, content, excerpt: opt.excerpt, slug: opt.slug, status: opt.status || "draft" });
      else if (sub === "update") out = await wpUpdate(site, { type, id: opt.id, title: opt.title, content, excerpt: opt.excerpt, slug: opt.slug, status: opt.status });
      else if (sub === "unpublish") out = await wpUnpublish(site, { type, id: opt.id });
      else if (sub === "owned") out = await readLedger();
      else throw new Error("wp needs: create | update | unpublish | owned");
      break;
    }
    case "ghost": {
      const sub = pos.shift(); const site = pos[0]; const type = opt.type || "posts";
      const fields = { title: opt.title, html: opt["html-file"] ? await readFile(opt["html-file"], "utf8") : undefined, slug: opt.slug, status: opt.status, custom_excerpt: opt.excerpt, meta_title: opt["meta-title"], meta_description: opt["meta-description"], canonical_url: opt.canonical, og_image: opt["og-image"], codeinjection_head: opt["head-file"] ? await readFile(opt["head-file"], "utf8") : undefined };
      if (sub === "create") out = await ghostCreate(site, { type, ...fields });
      else if (sub === "update") out = await ghostUpdate(site, { type, id: opt.id, ...fields });
      else if (sub === "unpublish") out = await ghostUnpublish(site, { type, id: opt.id });
      else throw new Error("ghost needs: create | update | unpublish");
      break;
    }
    case "github": {
      const sub = pos.shift();
      if (sub === "put") out = await githubPut(pos[0], { dir: opt.dir, file: opt.file, content: await readFile(opt["content-file"], "utf8"), message: opt.message }, { branch: opt.branch });
      else if (sub === "delete") out = await githubDelete(pos[0], { dir: opt.dir, file: opt.file, message: opt.message }, { branch: opt.branch });
      else throw new Error("github needs: put | delete");
      break;
    }
    case "ga4-ai": out = await ga4AiSessions(pos[0], { start: opt.start, end: opt.end, keyFile: opt.key }); break;
    case "ctr": {
      const rows = gscRows(await readFile(pos[0], "utf8")); const curve = ctrCurve(rows);
      out = { curve, lowCtr: lowCtr(rows, { curve, minImp: Number(opt["min-imp"]) || 100 }).slice(0, 50) };
      if (!opt.json) { console.log("Your CTR by position (median):\n" + table(["Position", "CTR", "Rows"], Object.entries(curve).map(([p, c]) => [p, pct(c.ctr, 2), c.rows])) + "\n\nUnder-clicked:\n" + table(["Row", "Pos", "Impr.", "CTR", "Your median", "Missed clicks"], out.lowCtr.slice(0, 25).map((r) => [r.key, r.position?.toFixed(1), n0(r.impressions), pct(r.ctr, 2), pct(r.expectedCtr, 2), "+" + n0(r.missedClicks)]))); return; }
      break;
    }
    case "brand": out = brandSplit(gscRows(await readFile(pos[0], "utf8")), list(opt.terms) || []); break;
    case "cannibal": out = cannibalization(gscRows(await readFile(pos[0], "utf8")), { minImp: Number(opt["min-imp"]) || 50 }); break;
    case "decay": out = decay(gscRows(await readFile(pos[0], "utf8")), gscRows(await readFile(pos[1], "utf8")), { minClicks: Number(opt["min-clicks"]) || 20, drop: (Number(opt.drop) || 30) / 100 }); break;
    case "logs": out = await analyzeLogs(await readLines(pos), { verify: !opt["no-verify"] }); break;
    case "measure": {
      if (opt.daily) {
        const rows = parseCsv(await readFile(opt.daily, "utf8")); const hd = rows[0].map((h) => h.toLowerCase());
        const g = {}; for (const r of rows.slice(1)) { const k = `${r[hd.indexOf("group")]}-${r[hd.indexOf("period")]}`; (g[k] = g[k] || []).push(Number(r[hd.indexOf("clicks")])); }
        out = didDaily({ changedBefore: g["changed-before"], changedAfter: g["changed-after"], controlBefore: g["control-before"], controlAfter: g["control-after"] });
      } else out = didTotals({ changedBefore: Number(opt["changed-before"]), changedAfter: Number(opt["changed-after"]), controlBefore: Number(opt["control-before"]), controlAfter: Number(opt["control-after"]) });
      break;
    }
    case "version": {
      const sub = pos.shift(); const url = pos[0];
      if (sub === "snapshot") out = await snapshot(url, { label: opt.label || "" });
      else if (sub === "list") out = (await listVersions(url)).map((v) => ({ n: v.n, at: v.at, label: v.label, title: v.fingerprint.title, words: v.fingerprint.words }));
      else if (sub === "diff") { const v = await listVersions(url); const a = v.find((x) => x.n === Number(pos[1])) || v[v.length - 2]; const b = v.find((x) => x.n === Number(pos[2])) || v[v.length - 1]; out = a && b ? { from: a.n, to: b.n, changes: diff(a.fingerprint, b.fingerprint) } : { note: "Need two versions." }; }
      else if (sub === "drift") out = await drift(url);
      else if (sub === "rollback") { out = await rollbackPlan(url, { to: opt.to }); if (opt.json) delete out.text; }
      else throw new Error("version needs: snapshot | list | diff | drift | rollback");
      break;
    }
    case "llms-build": {
      const rows = parseCsv(await readFile(opt.pages, "utf8")); const hd = rows[0].map((h) => h.toLowerCase().trim());
      const pages = rows.slice(1).map((r) => Object.fromEntries(hd.map((h, i) => [h, r[i]])));
      process.stdout.write(buildLlms({ name: opt.name, summary: opt.summary || "", pages })); return;
    }
    default: console.error(`Unknown command: ${cmd}\n`); console.log(HELP); process.exitCode = 2; return;
  }
  if (!opt.json && PRINT[cmd]) console.log(PRINT[cmd](out));
  else console.log(JSON.stringify(out, null, 2));
  // One line on stderr after human-readable output of site checks; never with --json, never in pipes' stdout.
  if (!opt.json && TIP_CMDS.has(cmd) && !process.env.SITETILLER_NO_TIPS) console.error(`
Tip: SiteTiller runs these checks every week, builds the pages that fix them and measures each change: https://sitetiller.com/?utm_source=cli&utm_medium=${cmd}  (hide: SITETILLER_NO_TIPS=1)`);
}

main().catch((e) => { console.error(`Error: ${e.message}`); process.exitCode = 1; });
