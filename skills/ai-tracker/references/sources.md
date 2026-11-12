# Sources (checked 2026-11-12)

| Claim | Source | Strength |
|---|---|---|
| OpenAI Responses API `web_search` tool returns `url_citation` annotations (URL, title, location); interfaces that display results must show citations as clickable links; "Search actions incur a tool call cost" (price not on this page); does not say whether repeated requests return the same results; does not compare the API with ChatGPT search in the app | https://developers.openai.com/api/docs/guides/tools-web-search | Primary (OpenAI) |
| Anthropic web search tool: versions `web_search_20250305` (basic), `web_search_20260209`, `web_search_20260318`; `max_uses`; Claude searches when the request needs current information and answers directly otherwise, steerable by the system prompt; citations with `url`, `title`, `cited_text`; `pause_turn`; "$10 USD per 1,000 searches, plus standard token costs"; a failed search is not billed | https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool | Primary (Anthropic) |
| Perplexity Sonar API response fields (`search_results`, `citations`) | https://docs.perplexity.ai/api-reference/chat-completions-post (cited in `cli/lib/tracker.mjs`; not re-opened for this skill. Pricing not stated) | Primary, not re-verified here |
| Bing Intents classes (Informational, Commercial, Navigational, Learn and Solve, Research, Creation, Local) | https://blogs.bing.com/search/June-2026/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare (2026-06-16) | Primary (Microsoft) |
| Margin of error for a proportion, 1.96 x sqrt(p(1-p)/n), and Wilson score interval | Standard statistics (normal approximation; Wilson 1927). Values in the table computed with `node -e` on 2026-11-12: n=10 28.4, n=30 16.4, n=100 9.0, n=300 5.2 points at p=0.3 | Textbook method |

## Not found in a primary source (so the skill does not claim it)
- How closely API answers match the consumer apps. Stated as unknown.
- Any vendor statement that repeated sampling of the same prompt gives a stable citation rate.
- A published price for Perplexity Sonar searches in this review.

Re-check pricing and tool versions before quoting costs; they change.
