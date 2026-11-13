// robots.txt parsing and matching, following Google's documented rules:
// most specific user-agent group wins; within it the longest matching path wins; ties go to Allow; * and $ wildcards.
// Sources: https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt , RFC 9309.
import { get, looksHtml, target, ToolError } from "./http.mjs";

// Purpose groups follow each vendor's own crawler documentation (links in skills/ai-crawlers/references/sources.md).
export const BOTS = [
  { agent: "Googlebot", owner: "Google", purpose: "search" },
  { agent: "Bingbot", owner: "Microsoft", purpose: "search", note: "Bing's index also grounds Copilot answers" },
  { agent: "OAI-SearchBot", owner: "OpenAI", purpose: "search", note: "ChatGPT search" },
  { agent: "Claude-SearchBot", owner: "Anthropic", purpose: "search" },
  { agent: "PerplexityBot", owner: "Perplexity", purpose: "search" },
  { agent: "ChatGPT-User", owner: "OpenAI", purpose: "user", note: "OpenAI: robots.txt rules may not apply to user-initiated fetches" },
  { agent: "Claude-User", owner: "Anthropic", purpose: "user" },
  { agent: "Perplexity-User", owner: "Perplexity", purpose: "user", note: "Perplexity: generally ignores robots.txt" },
  { agent: "GPTBot", owner: "OpenAI", purpose: "training" },
  { agent: "ClaudeBot", owner: "Anthropic", purpose: "training" },
  { agent: "Google-Extended", owner: "Google", purpose: "training", note: "Control token, not a crawler; does not affect Google Search" },
  { agent: "Applebot-Extended", owner: "Apple", purpose: "training", note: "Control token, not a crawler" },
  { agent: "CCBot", owner: "Common Crawl", purpose: "training" },
];

export function parseRobots(txt) {
  const groups = [];
  const sitemaps = [];
  const problems = [];
  const contentSignals = [];
  let cur = null;
  let lastAgent = false;
  String(txt).split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) return;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) { problems.push({ line: i + 1, text: `Not a "field: value" line: ${raw.trim().slice(0, 80)}` }); return; }
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastAgent = true;
      return;
    }
    lastAgent = false;
    if (key === "allow" || key === "disallow") {
      if (!cur) { problems.push({ line: i + 1, text: `"${m[1]}" before any User-agent line is ignored` }); return; }
      cur.rules.push({ type: key, path: val, line: i + 1 });
    } else if (key === "sitemap") sitemaps.push(val);
    else if (key === "content-signal") {
      // Cloudflare Content Signals Policy: comma-separated key=yes|no (search, ai-input, ai-train). A preference, not access control.
      const signals = {};
      for (const part of val.split(",")) { const [k, v] = part.split("=").map((s) => (s || "").trim().toLowerCase()); if (k) signals[k] = v; }
      const bad = Object.entries(signals).filter(([, v]) => v !== "yes" && v !== "no").map(([k]) => k);
      if (bad.length) problems.push({ line: i + 1, text: `Content-Signal values should be yes or no: ${bad.join(", ")}` });
      contentSignals.push({ line: i + 1, agents: cur ? [...cur.agents] : ["(before any User-agent)"], signals });
    }
    else if (!["crawl-delay", "host", "clean-param", "content-signal"].includes(key)) problems.push({ line: i + 1, text: `Unknown field "${m[1]}" (ignored by Google)` });
  });
  return { groups, sitemaps, problems, contentSignals };
}

export function ruleMatches(rulePath, path) {
  if (rulePath === "") return false;
  const esc = rulePath.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const re = esc.endsWith("$") ? new RegExp("^" + esc.slice(0, -1) + "$") : new RegExp("^" + esc);
  return re.test(path);
}

/** Decide whether `agent` may fetch `path`. Returns the winning rule and the group used. */
export function decide(groups, agent, path) {
  const a = agent.toLowerCase();
  const named = groups.filter((g) => g.agents.some((x) => x !== "*" && (a === x || a.startsWith(x))));
  const use = named.length ? named : groups.filter((g) => g.agents.includes("*"));
  if (!use.length) return { allowed: true, group: "none", rule: null, line: null };
  let best = null;
  for (const r of use.flatMap((g) => g.rules)) {
    if (!ruleMatches(r.path, path)) continue;
    const len = r.path.replace(/\$$/, "").length;
    const bestLen = best ? best.path.replace(/\$$/, "").length : -1;
    if (len > bestLen || (len === bestLen && r.type === "allow")) best = r;
  }
  const group = named.length ? named[0].agents.filter((x) => x !== "*").join(", ") : "*";
  if (!best) return { allowed: true, group, rule: null, line: null };
  return { allowed: best.type === "allow", group, rule: `${best.type === "allow" ? "Allow" : "Disallow"}: ${best.path}`, line: best.line };
}

/** Fetch a site's robots.txt and report every bot in BOTS (or custom agents) for one path. */
export async function robotsReport(raw, { agents } = {}) {
  const t = target(raw);
  let r;
  try { r = await get(`${t.origin}/robots.txt`, { ms: 8000, maxBytes: 600_000 }); } catch { throw new ToolError(`Could not reach ${t.origin}`); }
  const found = r.status === 200 && !looksHtml(r.text);
  const parsed = found ? parseRobots(r.text) : { groups: [], sitemaps: [], problems: [], contentSignals: [] };
  const list = agents?.length ? agents.map((agent) => ({ agent, owner: "", purpose: "custom" })) : BOTS;
  const bots = list.map((b) => ({ ...b, ...decide(parsed.groups, b.agent, t.path) }));
  const notes = [];
  if (!found) notes.push(r.status === 404 ? "No robots.txt (404): crawlers treat this as allow-all." : `robots.txt returned HTTP ${r.status}. Google treats 4xx (except 429) as no rules and 5xx as a temporary full block.`);
  if (parsed.contentSignals.length) notes.push("Content-Signal lines state preferences (search, ai-input, ai-train); they do not block access. Use Allow/Disallow or a firewall rule to block.");
  if (r.text.length > 500 * 1024) notes.push("robots.txt is over 500 KiB; Google ignores rules after that size.");
  return { host: t.host, path: t.path, url: `${t.origin}/robots.txt`, status: r.status, found, sitemaps: parsed.sitemaps, problems: parsed.problems, contentSignals: parsed.contentSignals, bots, notes };
}
