# Crawler documentation (checked 2026-11-12)

| Owner | Tokens | What the owner says | Source |
|---|---|---|---|
| OpenAI | OAI-SearchBot, GPTBot, ChatGPT-User, OAI-AdsBot | OAI-SearchBot is for ChatGPT search; sites opted out are not shown in ChatGPT search answers but can appear as navigational links. GPTBot crawls content that may train foundation models. ChatGPT-User handles user-initiated actions; robots.txt rules may not apply. Settings are independent; robots.txt changes can take ~24 hours to apply to search. IP lists: openai.com/searchbot.json, gptbot.json, chatgpt-user.json | https://developers.openai.com/api/docs/bots |
| Anthropic | ClaudeBot, Claude-User, Claude-SearchBot | ClaudeBot: training data; blocking signals future materials should be excluded. Claude-User: fetches for user queries. Claude-SearchBot: search quality; blocking may reduce visibility. Blocking IPs may not reliably opt out | https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler |
| Perplexity | PerplexityBot, Perplexity-User | PerplexityBot surfaces and links sites in results and is not used for foundation model training. Perplexity-User generally ignores robots.txt because a user requested the fetch. IP lists: perplexity.ai/perplexitybot.json, perplexity-user.json | https://docs.perplexity.ai/guides/bots |
| Google | Googlebot, Google-Extended | Google-Extended has no separate user agent; it is a robots.txt control token for Gemini training and grounding and does not affect inclusion or ranking in Google Search | https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers |
| Apple | Applebot, Applebot-Extended | Applebot-Extended does not crawl; disallowing it opts out of generative model training; pages can still appear in Spotlight, Siri and Safari | https://support.apple.com/en-us/119829 |
| Google | robots.txt rules | Most specific group, longest path, least restrictive on tie, `*` and `$`, 500 KiB limit, 4xx/5xx handling | https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt |
| IETF | robots.txt standard | RFC 9309 Robots Exclusion Protocol | https://www.rfc-editor.org/rfc/rfc9309 |
| Cloudflare | Search / Training / Agent controls | Since 2026-09-15: three per-domain controls, "Block AI bots" and managed robots.txt deprecated, Bot Preference Sync introduced | https://blog.cloudflare.com/accountable-mixed-use-ai-crawlers/ |

Re-check these pages before changing the skill; vendors add tokens and change wording.
