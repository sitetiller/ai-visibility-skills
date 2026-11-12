---
name: gsc-bing
description: "Read Google Search Console and Bing Webmaster Tools data together and act on the differences: queries that only one engine shows you for, big position gaps, and pages where Bing (which grounds Microsoft Copilot answers) lags Google. Use when the user asks to compare Google and Bing, 'why do I rank on Google but not Bing', 'pull my Search Console data', 'what queries should I target', 'Bing traffic', 'Copilot visibility', or wants one report from both engines. Requires the user's own read-only credentials."
license: MIT
metadata:
  version: 0.1.0
---

# Google + Bing, side by side

Most SEO work reads Google only. Bing's index also feeds Copilot answers, and the two engines often disagree about which of your pages deserve to rank. This skill pulls both, joins them by query, and turns the differences into a short action list.

## Setup (once)
- **Google:** a service account JSON key with read access to the Search Console property (add the service account email under Settings → Users and permissions as a "Restricted" user), then `GOOGLE_APPLICATION_CREDENTIALS=/path/key.json`. Or `GOOGLE_ACCESS_TOKEN` from `gcloud auth print-access-token` with the `webmasters.readonly` scope.
- **Bing:** Bing Webmaster Tools → Settings → API Access → Generate API Key, then `BING_WEBMASTER_API_KEY=...`. The key is per user and works for all your verified sites. Never paste keys into chat; set them in the shell or a local `.env` that is gitignored.
- Details and troubleshooting: the `setup` skill.

## Steps
1. Pick a window. Bing updates its stats weekly, so use at least 28 days and end the window a few days ago.
   ```bash
   npx sitetiller engines example.com https://example.com/ --start 2026-10-01 --end 2026-11-05 --json > engines.json
   ```
   The first argument is the Search Console site (`example.com` becomes `sc-domain:example.com`; pass a URL-prefix property as a full URL). The second is the Bing site URL exactly as verified in Bing.
2. Read `totals`, `onlyBing`, `onlyGoogle` and `biggestPositionGaps`.
3. Classify each finding:

| Pattern | Likely meaning | Action |
|---|---|---|
| Query only in Google, many impressions | Bing has not indexed or does not rank the page | Check the page in Bing URL Inspection; submit the sitemap in Bing; ping IndexNow |
| Query only in Bing | Google filters or ranks the page lower | Inspect in Search Console (indexing, canonical); compare the page with what ranks on Google |
| Bing position much worse (gap > 5) | Page weak on Bing's signals for that query | Check title/meta match, internal links, and Bing's Site Explorer for crawl issues |
| Google position much worse | Often freshness or a competing page on Google | Look for cannibalization (`cannibal` skill) and update the page |
| Clicks share on Bing far below impressions share | Snippet or title not chosen on Bing | Rewrite the title for the query wording |

4. Pull page-level data when a query points to a page:
   ```bash
   npx sitetiller gsc example.com --start 2026-10-01 --end 2026-11-05 --dims query,page --out gsc-query-page.csv
   npx sitetiller bing https://example.com/ --pages --start 2026-10-01 --end 2026-11-05 --json
   npx sitetiller inspect example.com https://example.com/pricing --json
   ```

## Output to the user
1. Totals for both engines, same window, stated with dates.
2. Top 10 "only in Bing" and "only in Google" queries with impressions.
3. Top 10 position gaps with the page involved.
4. Five actions, each tied to a specific query or page.

## Guardrails
- Search Console's API returns top rows, not every row, and both engines omit rare queries; say so when comparing totals.
- Bing's data is weekly; never compare a Bing week with a Google day.
- Do not claim Bing rankings decide Copilot citations. Microsoft says Copilot answers ground on Bing; citation data is only in Bing's AI Performance report (see `ai-citations`).
- Read-only. Never request write scopes.

## References
- `references/sources.md`
