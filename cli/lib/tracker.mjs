// Ask AI assistants (via their APIs, with the user's own keys and web search on) a fixed set of buyer questions,
// and record whether the brand is mentioned, whether the domain is cited, which competitors and domains appear.
// API answers can differ from the consumer apps; results are a sample, not a ranking. Each call costs money.
// Docs (checked 2026-11-12):
//   OpenAI Responses API + web_search tool, url_citation annotations: https://developers.openai.com/api/docs/guides/tools-web-search
//   Anthropic Messages API + web_search_20250305 tool (direct, max_uses 5; $10 per 1,000 searches plus tokens), citations on text blocks: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
//   Perplexity Sonar (/v1/sonar, citations + search_results): https://docs.perplexity.ai/api-reference/chat-completions-post
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

export const ENGINES = {
  openai: {
    key: "OPENAI_API_KEY", defaultModel: "gpt-6-astra",
    async ask(prompt, { model, apiKey }) {
      const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model, tools: [{ type: "web_search" }], input: prompt }) });
      const j = await r.json(); if (!r.ok) throw new Error(`OpenAI ${r.status}: ${j.error?.message || ""}`);
      const parts = (j.output || []).filter((o) => o.type === "message").flatMap((o) => o.content || []);
      return { text: parts.map((c) => c.text || "").join("\n"), citations: parts.flatMap((c) => (c.annotations || []).filter((a) => a.type === "url_citation").map((a) => ({ url: a.url, title: a.title }))), model: j.model || model };
    },
  },
  anthropic: {
    key: "ANTHROPIC_API_KEY", defaultModel: "claude-sonnet-5-5",
    async ask(prompt, { model, apiKey }) {
      // Basic web search (direct calls, no code execution), max 5 searches; continue up to 3 times on pause_turn.
      const messages = [{ role: "user", content: prompt }];
      const blocks = [];
      let j;
      for (let i = 0; i < 4; i++) {
        const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2026-10-21", "content-type": "application/json" }, body: JSON.stringify({ model, max_tokens: 2048, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }], messages }) });
        j = await r.json(); if (!r.ok) throw new Error(`Anthropic ${r.status}: ${j.error?.message || ""}`);
        blocks.push(...(j.content || []));
        if (j.stop_reason !== "pause_turn") break;
        messages.push({ role: "assistant", content: j.content });
      }
      const text = blocks.filter((b) => b.type === "text");
      return { text: text.map((b) => b.text).join(""), citations: text.flatMap((b) => (b.citations || []).filter((c) => c.url).map((c) => ({ url: c.url, title: c.title }))), model: j?.model || model };
    },
  },
  perplexity: {
    key: "PERPLEXITY_API_KEY", defaultModel: "sonar",
    async ask(prompt, { model, apiKey }) {
      const r = await fetch("https://api.perplexity.ai/v1/sonar", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }) });
      const j = await r.json(); if (!r.ok) throw new Error(`Perplexity ${r.status}: ${j.error?.message || ""}`);
      const results = (j.search_results || []).map((s) => ({ url: s.url, title: s.title }));
      const cites = (j.citations || []).map((u) => ({ url: u }));
      return { text: j.choices?.[0]?.message?.content || "", citations: results.length ? results : cites, model: j.model || model };
    },
  },
};

/** Pure: score one answer against the brand, domain and competitors. */
export function scoreAnswer({ text, citations }, { brand = [], domain = "", competitors = [] }) {
  const lower = String(text).toLowerCase();
  const mentions = (term) => { const t = term.toLowerCase().trim(); return t && new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(lower); };
  const domains = [...new Set(citations.map((c) => host(c.url)).filter(Boolean))];
  const d = domain.replace(/^www\./, "").toLowerCase();
  return {
    mentioned: brand.some(mentions),
    cited: !!d && domains.some((x) => x === d || x.endsWith("." + d)),
    competitorsMentioned: competitors.filter(mentions),
    competitorsCited: competitors.filter((c) => domains.some((x) => x.includes(c.toLowerCase().replace(/\s+/g, "")))),
    citedDomains: domains,
  };
}

/** Run prompts × engines × runs. Appends raw results to .sitetiller/track/<date>.jsonl and returns a summary. */
export async function track(prompts, { engines = ["openai", "anthropic", "perplexity"], runs = 1, brand, domain, competitors = [], models = {}, root = process.cwd() } = {}) {
  const active = engines.filter((e) => ENGINES[e] && process.env[ENGINES[e].key]);
  const skipped = engines.filter((e) => !active.includes(e)).map((e) => `${e} (set ${ENGINES[e]?.key || "?"})`);
  const dir = join(root, ".sitetiller", "track");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  const rows = [];
  for (const prompt of prompts) for (const e of active) for (let i = 0; i < runs; i++) {
    const at = new Date().toISOString();
    try {
      const res = await ENGINES[e].ask(prompt, { model: models[e] || ENGINES[e].defaultModel, apiKey: process.env[ENGINES[e].key] });
      const s = scoreAnswer(res, { brand, domain, competitors });
      const row = { at, engine: e, model: res.model, prompt, run: i + 1, ...s, answer: res.text.slice(0, 4000), citations: res.citations };
      rows.push(row); await appendFile(file, JSON.stringify(row) + "\n");
    } catch (err) { const row = { at, engine: e, prompt, run: i + 1, error: String(err.message).slice(0, 300) }; rows.push(row); await appendFile(file, JSON.stringify(row) + "\n"); }
  }
  const ok = rows.filter((r) => !r.error);
  const by = (k) => Object.fromEntries(active.map((e) => { const x = ok.filter((r) => r.engine === e); return [e, { answers: x.length, mentionRate: x.length ? x.filter((r) => r.mentioned).length / x.length : null, citationRate: x.length ? x.filter((r) => r.cited).length / x.length : null }]; }));
  const domainCounts = {}; ok.forEach((r) => r.citedDomains.forEach((d) => { domainCounts[d] = (domainCounts[d] || 0) + 1; }));
  return { file, calls: rows.length, errors: rows.filter((r) => r.error).length, skipped, byEngine: by(), topCitedDomains: Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([d, n]) => ({ domain: d, answers: n })), note: "API answers can differ from the ChatGPT, Claude and Perplexity apps. Treat rates as a sample; repeat runs over weeks before drawing conclusions." };
}
