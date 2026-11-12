---
name: ai-logs
description: "Count real AI and search crawler visits in server access logs and separate verified bots from fakes using each vendor's published IP ranges (OpenAI, Google, Bing, Perplexity). Also counts visitors referred by ChatGPT, Perplexity, Copilot, Gemini and Claude. Use when the user asks 'is ChatGPT/GPTBot actually crawling my site', 'which AI bots visit us', 'are these bots real', 'how much traffic comes from ChatGPT', or shares an access.log / nginx / Apache / Cloudflare log export."
license: MIT
metadata:
  version: 0.1.0
---

# AI crawlers in your logs

robots.txt says who may visit. Logs say who did. Anyone can put "GPTBot" in a user agent, so a hit only counts as OpenAI's when the IP is inside OpenAI's published ranges. This skill reports both.

## Inputs
- One or more access logs in common or combined log format (nginx and Apache defaults). Gzip: decompress first.
- Other formats (Cloudflare Logpush JSON, CDN CSV): convert to combined format, or ask for the columns ip, time, request, status, referer, user agent and convert with a short script.

## Steps
1. Run the analysis (downloads the vendors' IP lists once per run):
   ```bash
   npx sitetiller logs access.log access.log.1 --json > ai-logs.json
   ```
   Offline: `--no-verify` counts by user agent only and marks every hit unverifiable.
2. Read per bot: `hits`, `verified`, `spoofed`, `unverifiable`, `ips`, `status` mix and top `paths`.
3. Interpret:

| Finding | Meaning | Action |
|---|---|---|
| `verified` hits on search bots (OAI-SearchBot, PerplexityBot, Bingbot, Googlebot) | The engines can read the site | Check that top paths are the pages you want cited |
| Search bot hits mostly `4xx/5xx` or `403` | Bot reaches the server but is refused | Check WAF/CDN rules and robots.txt (`ai-crawlers` skill) |
| `spoofed` > 0 | Scrapers using a vendor's name | Safe to rate-limit or block those IPs; it does not affect the real bot |
| `unverifiable` | Owner publishes no IP list (Anthropic, Apple, Amazon, Meta, others) | Treat counts as an upper bound |
| ChatGPT-User / Perplexity-User hits on a page | A person asked an assistant about that page | Strong signal the page is being shown or discussed |
| `aiReferrals` | People clicked through from an assistant | These are visits; compare with GA4 (`ga4-ai` command) |
| No AI bot hits at all over weeks | Blocked, or the site is not discovered | Check access first, then sitemaps and Bing indexing |

## Output to the user
1. Period covered and lines parsed.
2. Table per bot: purpose, hits, verified, spoofed, unverifiable, top 3 paths, error rate.
3. AI referral visits by source and landing page.
4. Three concrete actions.

## Guardrails
- Logs contain IP addresses (personal data in many jurisdictions). Process them locally, do not paste raw logs into third-party tools, and report aggregates.
- Never present unverifiable counts as confirmed bot visits.
- IP lists change; the tool downloads them on each run. Cite the list `creationTime` if the user needs an audit trail.

## References
- `references/sources.md`
