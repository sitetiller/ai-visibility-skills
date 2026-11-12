# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Average position = the topmost position a link occupies for a query, averaged across queries; a link must get an impression for its position to be recorded; CTR = clicks / impressions; position shown only for Google Search results | https://support.google.com/webmasters/answer/7042828 (opened 2026-11-12) |
| If only clicks fall while impressions hold, improve titles and snippets; if both fall, look for other causes | https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops (as recorded in `skills/titles-meta/references/sources.md`, same date) |
| Search Analytics API returns at most 50K rows per day per search type; grouping by page and query may drop some data | https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data (as recorded in `skills/titles-meta/references/sources.md`) |
| Before and after with control pages | `skills/measure-rollback/references/method.md` |

## Tool behaviour (sitetiller 0.1.0, run 2026-11-12 on small synthetic CSVs written for this check)
- `striking` returned rows with `key`, `query`, `clicks`, `impressions`, `ctr`, `position`, `opportunity` (impressions / position), sorted by `opportunity`.
- `brand` returned `branded` and `nonBranded` blocks, `brandedClickShare` and `gscRegex`.
- `ctr` returned `{"curve": {}, "lowCtr": []}` on a 7-row file: the curve needs at least 3 rows with 50+ impressions at a position.
- `decay` returned `reason` strings such as "lower CTR at similar impressions" and "gone from report (not indexed, redirected, renamed or below export limits)".
- `rank-actions.mjs` on a 19-row synthetic file printed "1000 impressions x 11.50% ... - 2 clicks = 113.0". Those figures are test data, not benchmarks.

## Not verified
- Any industry CTR-by-position table: deliberately not used.
- Whether a given position gain is achievable: no source supports predicting it. Scenarios only.
- Effort sizes (S, M, L) are this skill's own scale, not from a source.
