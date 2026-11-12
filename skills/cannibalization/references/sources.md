# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Permanent redirects: HTTP 301/308, instant meta refresh and JavaScript location are treated as permanent; server-side 301/308 are most reliable and recommended; JavaScript is a last resort; temporary redirects (302/303/307, delayed meta refresh) may leave the source in results; use permanent when sure it will not be reverted; consolidate URL variants by redirecting to one canonical; the page gives no duration to keep redirects | https://developers.google.com/search/docs/crawling-indexing/301-redirects |
| Consolidation methods: redirects (strong), rel=canonical (strong, pick one approach), sitemap inclusion (weak); self-referential canonical; do not use noindex to choose a canonical within a site; do not use robots.txt for canonicalization, blocked URLs may still be indexed without content | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls |
| Performance report: data attributed to the canonical URL; average position is the topmost position per query averaged | https://support.google.com/webmasters/answer/7042828 |
| Search Analytics API row limits; grouping by page and query may drop data | https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data |
| Combined-clicks before/after measurement | `skills/measure-rollback/references/method.md` |

## Not verified
- That multiple URLs ranking for one query lowers rankings: the Google pages read do not make this claim and have no "cannibalization" section. The skill treats overlap as a data pattern and decides by intent and content similarity.
- How long to keep a redirect: Google's page gives no duration. The skill gives no duration.
