# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Title best practices, no length limit, truncation to device width, obsolete-date and other rewrite causes, changes noticed in days to weeks | https://developers.google.com/search/docs/appearance/title-link |
| Snippets: built mainly from page content, differ per query; meta description used when more accurate; unique per page; may include author, date, price; programmatic descriptions acceptable if readable and varied; no keyword lists; no length limit, cut to device width | https://developers.google.com/search/docs/appearance/snippet |
| If only clicks fell while impressions held, improve titles and snippets; if both fell, look for other causes; Compare mode, 16-month range, filters | https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops |
| CTR is clicks divided by impressions; average position is the topmost position per query, averaged; data attributed to the canonical URL | https://support.google.com/webmasters/answer/7042828 |
| Search Analytics API returns at most 50K rows per day per search type; grouping by page and/or query may drop some data | https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data |
| Before/after measurement with control pages | `skills/measure-rollback/references/method.md` |

## Not verified
- Any "average CTR by position" figure from studies: not used. The skill uses only the user's own data (`ctr`).
- Whether Google will show a given title or description: not knowable in advance. The skill says to check the live result.
