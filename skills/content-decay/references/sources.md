# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Causes of traffic drops (algorithmic updates, technical issues, security, spam/manual actions, seasonality and changing interests, site moves, reporting glitches); diagnosis steps (compare impressions and clicks, 16-month range, Compare mode, filters, search type, Pages by Clicks Difference, Google Trends); small dips often recover, avoid radical changes to pages that perform well; large drops call for a site-wide helpfulness review; effects can take weeks to months | https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops |
| Google Search Status Dashboard lists ranking updates and incidents with start dates and durations (no explicit end dates). Seen on 2026-11-12: November 2026 core update started 10 Nov 2026; September 2026 spam update 24 Sep 2026 (13 days 16 hours); August 2026 spam update 18 Aug 2026; June 2026 spam update 24 Jun 2026; May 2026 core update 21 May 2026 (11 days 21 hours). The skill tells the user to read the live page and does not hardcode dates | https://status.search.google.com/summary |
| Warning signs: changing dates to seem fresh without substantive changes; adding or removing content mainly to seem fresh | https://developers.google.com/search/docs/fundamentals/creating-helpful-content |
| Performance report definitions; data attributed to the canonical URL | https://support.google.com/webmasters/answer/7042828 |
| Permanent redirects for replaced pages | https://developers.google.com/search/docs/crawling-indexing/301-redirects |
| Before/after measurement | `skills/measure-rollback/references/method.md` |

## Not verified
- Thresholds in `decay` (20 clicks, 30% drop, 20% shifts in impressions, CTR and 1 position): these are the CLI's defaults, not Google values. The skill says so and tells the user to scale them to site size.
- Whether a given update caused a drop: Google does not publish per-site effects. The skill reports overlap in time only.
- The dashboard has no end dates; the update window is start plus the shown duration, and the November 2026 update showed no duration yet when checked.
