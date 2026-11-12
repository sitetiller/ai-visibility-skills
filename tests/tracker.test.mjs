// Tracker parsing and scoring, with fetch stubbed using response shapes from each vendor's documentation.
import test from "node:test";
import assert from "node:assert/strict";
import { ENGINES, scoreAnswer } from "../cli/lib/tracker.mjs";

const stub = (bodies) => { let i = 0; globalThis.fetch = async (url, init) => { const b = bodies[Math.min(i++, bodies.length - 1)]; stub.last = { url, init: JSON.parse(init.body) }; return { ok: true, status: 200, json: async () => b }; }; };

test("openai: text and url_citation annotations parsed", async () => {
  stub([{ model: "gpt-6-astra", output: [{ type: "web_search_call" }, { type: "message", content: [{ type: "output_text", text: "Acme is a good pick.", annotations: [{ type: "url_citation", url: "https://acme.com/", title: "Acme" }] }] }] }]);
  const r = await ENGINES.openai.ask("q", { model: "gpt-6-astra", apiKey: "k" });
  assert.equal(r.text, "Acme is a good pick."); assert.deepEqual(r.citations, [{ url: "https://acme.com/", title: "Acme" }]);
  assert.deepEqual(stub.last.init.tools, [{ type: "web_search" }]);
});
test("anthropic: citations from text blocks, pause_turn continued", async () => {
  stub([{ stop_reason: "pause_turn", content: [{ type: "server_tool_use", name: "web_search" }] }, { model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: "Use Acme. ", citations: [{ type: "web_search_result_location", url: "https://acme.com/p", title: "P" }] }, { type: "text", text: "It is cheap." }] }]);
  const r = await ENGINES.anthropic.ask("q", { model: "claude-sonnet-5-5", apiKey: "k" });
  assert.equal(r.text, "Use Acme. It is cheap."); assert.equal(r.citations[0].url, "https://acme.com/p");
  assert.equal(stub.last.init.messages.length, 2); assert.equal(stub.last.init.tools[0].type, "web_search_20250305");
});
test("perplexity: search_results preferred over bare citations", async () => {
  stub([{ model: "sonar", choices: [{ message: { content: "Acme [1]" } }], citations: ["https://acme.com/"], search_results: [{ url: "https://acme.com/", title: "Acme" }] }]);
  const r = await ENGINES.perplexity.ask("q", { model: "sonar", apiKey: "k" });
  assert.deepEqual(r.citations, [{ url: "https://acme.com/", title: "Acme" }]);
});
test("score: mention, citation on subdomain, competitors", () => {
  const s = scoreAnswer({ text: "FreshBooks and Acme compared.", citations: [{ url: "https://docs.acme.com/x" }, { url: "https://g2.com/y" }] }, { brand: ["acme"], domain: "acme.com", competitors: ["FreshBooks", "Zoho"] });
  assert.equal(s.mentioned, true); assert.equal(s.cited, true); assert.deepEqual(s.competitorsMentioned, ["FreshBooks"]); assert.deepEqual(s.citedDomains, ["docs.acme.com", "g2.com"]);
});
test("score: brand inside another word is not a mention", () => assert.equal(scoreAnswer({ text: "Acmeology", citations: [] }, { brand: ["acme"] }).mentioned, false));
test("score: lookalike domain is not a citation", () => assert.equal(scoreAnswer({ text: "", citations: [{ url: "https://notacme.com" }] }, { domain: "acme.com" }).cited, false));
