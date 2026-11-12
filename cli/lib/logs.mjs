// Count AI and search crawler hits in server access logs and verify them against each vendor's published IP ranges.
// Anyone can put "GPTBot" in a user agent; only an IP inside the owner's published ranges counts as verified.
import { get } from "./http.mjs";

// Order matters: first match wins. ua = regex on the user agent; ranges = official JSON lists (null = owner publishes none).
export const LOG_BOTS = [
  { name: "OAI-SearchBot", owner: "OpenAI", purpose: "search", ua: /OAI-SearchBot/i, ranges: ["https://openai.com/searchbot.json"] },
  { name: "ChatGPT-User", owner: "OpenAI", purpose: "user", ua: /ChatGPT-User/i, ranges: ["https://openai.com/chatgpt-user.json"] },
  { name: "GPTBot", owner: "OpenAI", purpose: "training", ua: /GPTBot/i, ranges: ["https://openai.com/gptbot.json"] },
  { name: "Claude-SearchBot", owner: "Anthropic", purpose: "search", ua: /Claude-SearchBot/i, ranges: null },
  { name: "Claude-User", owner: "Anthropic", purpose: "user", ua: /Claude-User/i, ranges: null },
  { name: "ClaudeBot", owner: "Anthropic", purpose: "training", ua: /ClaudeBot/i, ranges: null },
  { name: "PerplexityBot", owner: "Perplexity", purpose: "search", ua: /PerplexityBot/i, ranges: ["https://www.perplexity.ai/perplexitybot.json"] },
  { name: "Perplexity-User", owner: "Perplexity", purpose: "user", ua: /Perplexity-User/i, ranges: ["https://www.perplexity.ai/perplexity-user.json"] },
  { name: "Google-CloudVertexBot", owner: "Google", purpose: "user", ua: /Google-CloudVertexBot/i, ranges: ["https://developers.google.com/static/search/apis/ipranges/special-crawlers.json"] },
  { name: "Googlebot", owner: "Google", purpose: "search", ua: /Googlebot/i, ranges: ["https://developers.google.com/static/search/apis/ipranges/googlebot.json"] },
  { name: "Bingbot", owner: "Microsoft", purpose: "search", ua: /bingbot/i, ranges: ["https://www.bing.com/toolbox/bingbot.json"] },
  { name: "Applebot", owner: "Apple", purpose: "search", ua: /Applebot/i, ranges: null },
  { name: "Amazonbot", owner: "Amazon", purpose: "search", ua: /Amazonbot/i, ranges: null },
  { name: "Meta-ExternalAgent", owner: "Meta", purpose: "training", ua: /meta-externalagent/i, ranges: null },
  { name: "DuckAssistBot", owner: "DuckDuckGo", purpose: "user", ua: /DuckAssistBot/i, ranges: null },
  { name: "MistralAI-User", owner: "Mistral", purpose: "user", ua: /MistralAI-User/i, ranges: null },
  { name: "Bytespider", owner: "ByteDance", purpose: "training", ua: /Bytespider/i, ranges: null },
  { name: "CCBot", owner: "Common Crawl", purpose: "training", ua: /CCBot/i, ranges: null },
];

// Combined / common log format: ip - user [time] "METHOD path PROTO" status bytes "referer" "agent"
const LINE = /^(\S+) \S+ \S+ \[([^\]]+)\] "(?:(\S+) (\S+)(?: \S+)?|[^"]*)" (\d{3}) (\S+)(?: "([^"]*)" "([^"]*)")?/;

export function parseLine(line) {
  const m = LINE.exec(line);
  if (!m) return null;
  return { ip: m[1], time: m[2], method: m[3] || "", path: m[4] || "", status: Number(m[5]), bytes: m[6] === "-" ? 0 : Number(m[6]), referer: m[7] || "", ua: m[8] || "" };
}

// ---- CIDR matching (IPv4 and IPv6) ----
function v4ToBig(ip) { const p = ip.split(".").map(Number); if (p.length !== 4 || p.some((x) => !(x >= 0 && x <= 255))) return null; return BigInt(((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]); }
function v6ToBig(ip) {
  if (ip.includes(".")) { const i = ip.lastIndexOf(":"); const v4 = v4ToBig(ip.slice(i + 1)); if (v4 === null) return null; ip = ip.slice(0, i + 1) + ((v4 >> 16n) & 0xffffn).toString(16) + ":" + (v4 & 0xffffn).toString(16); }
  const [a, b] = ip.split("::");
  const left = a ? a.split(":") : [], right = b !== undefined && b ? b.split(":") : [];
  const fill = ip.includes("::") ? 8 - left.length - right.length : 0;
  const parts = [...left, ...Array(fill).fill("0"), ...right];
  if (parts.length !== 8) return null;
  let n = 0n; for (const h of parts) { const v = parseInt(h || "0", 16); if (!(v >= 0 && v <= 0xffff)) return null; n = (n << 16n) + BigInt(v); }
  return n;
}
export function inCidr(ip, cidr) {
  const [base, bitsS] = cidr.split("/");
  const v6 = base.includes(":");
  if (v6 !== ip.includes(":")) return false;
  const total = v6 ? 128 : 32, bits = Number(bitsS ?? total);
  const a = v6 ? v6ToBig(ip) : v4ToBig(ip), b = v6 ? v6ToBig(base) : v4ToBig(base);
  if (a === null || b === null) return false;
  const shift = BigInt(total - bits);
  return (a >> shift) === (b >> shift);
}

/** Download published ranges once per list. Returns Map(url -> [cidr]). */
export async function loadRanges(urls) {
  const out = new Map();
  for (const u of urls) {
    try {
      const r = await get(u, { ms: 10000, maxBytes: 5_000_000, headers: { accept: "application/json" } });
      const j = JSON.parse(r.text);
      out.set(u, (j.prefixes || []).map((p) => p.ipv4Prefix || p.ipv6Prefix).filter(Boolean));
    } catch { out.set(u, null); }
  }
  return out;
}

/**
 * Analyse log lines. Returns per-bot counts with verified / spoofed / unverifiable split, top paths, status mix,
 * plus AI-assistant referral visits (people clicking through from chatgpt.com, perplexity.ai, etc.).
 */
export async function analyzeLogs(lines, { verify = true, ranges: preloaded } = {}) {
  const urls = [...new Set(LOG_BOTS.flatMap((b) => b.ranges || []))];
  const ranges = preloaded || (verify ? await loadRanges(urls) : new Map());
  const stats = new Map();
  const refs = new Map();
  let parsed = 0, total = 0;
  const AI_REF = [[/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/, "ChatGPT"], [/(^|\.)perplexity\.ai$/, "Perplexity"], [/(^|\.)copilot\.microsoft\.com$/, "Copilot"], [/(^|\.)gemini\.google\.com$/, "Gemini"], [/(^|\.)claude\.ai$/, "Claude"]];
  for (const line of lines) {
    if (!line.trim()) continue;
    total++;
    const r = parseLine(line);
    if (!r) continue;
    parsed++;
    const bot = LOG_BOTS.find((b) => b.ua.test(r.ua));
    if (bot) {
      let s = stats.get(bot.name);
      if (!s) { s = { name: bot.name, owner: bot.owner, purpose: bot.purpose, hits: 0, verified: 0, spoofed: 0, unverifiable: 0, status: {}, paths: new Map(), ips: new Set() }; stats.set(bot.name, s); }
      s.hits++; s.ips.add(r.ip);
      s.status[r.status] = (s.status[r.status] || 0) + 1;
      s.paths.set(r.path, (s.paths.get(r.path) || 0) + 1);
      const lists = (bot.ranges || []).map((u) => ranges.get(u)).filter(Array.isArray);
      if (!bot.ranges || !verify || !lists.length) s.unverifiable++;
      else if (lists.some((l) => l.some((c) => inCidr(r.ip, c)))) s.verified++;
      else s.spoofed++;
      continue;
    }
    if (r.referer) {
      let h = ""; try { h = new URL(r.referer).hostname; } catch { /* ignore */ }
      const hit = AI_REF.find(([re]) => re.test(h));
      if (hit) { const x = refs.get(hit[1]) || { source: hit[1], visits: 0, paths: new Map() }; x.visits++; x.paths.set(r.path, (x.paths.get(r.path) || 0) + 1); refs.set(hit[1], x); }
    }
  }
  const top = (m, n = 10) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([path, hits]) => ({ path, hits }));
  return {
    lines: total, parsed,
    bots: [...stats.values()].sort((a, b) => b.hits - a.hits).map((s) => ({ ...s, ips: s.ips.size, paths: top(s.paths) })),
    aiReferrals: [...refs.values()].sort((a, b) => b.visits - a.visits).map((x) => ({ source: x.source, visits: x.visits, paths: top(x.paths) })),
    rangesLoaded: [...ranges.entries()].map(([u, l]) => ({ url: u, prefixes: Array.isArray(l) ? l.length : null })),
  };
}
