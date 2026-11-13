---
name: ai-crawlers
description: "Check and fix which search and AI crawlers can reach a site: OAI-SearchBot, GPTBot, ChatGPT-User, Claude-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot and more, grouped by purpose (search, user fetch, training). Use when the user asks 'can ChatGPT/Claude/Perplexity see my site', 'should I block GPTBot', 'why isn't my site cited by AI', 'write my robots.txt for AI', 'is Cloudflare blocking AI bots', or wants to test a robots.txt draft. Uses the sitetiller CLI against the live robots.txt or a local draft."
license: MIT
metadata:
  version: 1.0.0
---

# AI crawler access

Goal: tell the user exactly which crawlers can read their site, which rule decides it, and what to change so their choice is deliberate: usually **search and answer crawlers allowed, training crawlers the user's call**.

## Inputs
- A site or page URL, or a local robots.txt draft.
- Optional: the user's policy ("stay in AI search, stay out of training", "block everything", "allow everything").

## Steps
1. Run the live check (add a path to test a section):
   ```bash
   npx sitetiller crawlers example.com --json
   npx sitetiller crawlers example.com/docs/ --json
   ```
2. Read each bot's `allowed`, `rule`, `line`, `group` and `purpose`. Group findings by purpose:
   - **search**: Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot. Blocked = cannot be cited in that engine's answers.
   - **user**: ChatGPT-User, Claude-User, Perplexity-User. Fetches a person asked for. OpenAI and Perplexity say robots.txt may not apply.
   - **training**: GPTBot, ClaudeBot, CCBot, Google-Extended and Applebot-Extended (tokens, not crawlers). Blocking does not remove the site from those vendors' search features.
3. If a search crawler is blocked and the user did not choose that, write the fix:
   - Blocked by its **own named group** → edit that group (the line number is in the output); do not add a second group for the same bot.
   - Blocked by the **`*` group** → add a named group above it. A named group replaces the `*` rules for that bot, so copy any `*` disallows the user still wants (admin, cart, search).
4. Test the draft before the user publishes it:
   ```bash
   npx sitetiller robots-test ./robots.txt / /pricing /docs/a /private/x --agents OAI-SearchBot,GPTBot,Googlebot
   ```
5. Remind the user that robots.txt is one gate. CDN/WAF bot settings (Cloudflare's Search/Training/Agent controls since 2026-09-15) can block a bot robots.txt allows. Ask them to check those settings, or analyse real visits with the `ai-logs` skill.

## Matching rules the tool follows (Google's documented behaviour)
- The most specific matching user-agent group applies; all other groups are ignored for that bot.
- Inside it, the longest matching path wins; on equal length, Allow wins.
- `*` matches any characters, `$` anchors the end.
- 4xx robots.txt (except 429) = no rules; 5xx = Google pauses crawling the whole site.

## Output to the user
1. One-line verdict per purpose ("Search and answer crawlers: 3 of 5 allowed").
2. A table: crawler, owner, purpose, allowed/blocked, deciding rule and line.
3. The exact robots.txt lines to change, as a diff, tested with `robots-test`.
4. What this check cannot see (CDN rules, actual visits).

## Content-Signal lines
Cloudflare's Content Signals Policy adds `Content-Signal: search=yes, ai-input=yes, ai-train=no` style lines to robots.txt. `npx sitetiller crawlers <url>` prints them with their line and group, and flags values other than yes or no. They state a preference about how content may be used (search index, AI answers grounded on the page, model training); they do not block anything and compliance is voluntary. To block a bot, use Disallow or a firewall rule. Cloudflare's managed robots.txt adds `search=yes, ai-train=no` and leaves `ai-input` unset.

## Guardrails
- Never recommend blocking search crawlers unless the user asks for it; explain the visibility cost.
- Do not claim blocking GPTBot removes content already collected; vendors document it as a signal for future use.
- Do not state any vendor behaviour that is not in `references/sources.md`; if unsure, say so.

## References
- `examples/crawlers.json`: real output of this skill's command on sitetiller.com (2026-11-13), see `examples/README.md`.
- `references/sources.md`: vendor documentation for every crawler, with access dates.
- `references/policies.md`: ready-made robots.txt policies.
