# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Methods and strength: redirects strong, `rel="canonical"` strong, sitemap weak; absolute URLs; canonical only accepted in `<head>`; self-referential canonical; use HTML element or HTTP header, not both; HTTP header works for non-HTML; do not use robots.txt for canonicalization; do not use noindex to prevent selection of a canonical within one site; do not name different canonicals via different methods; canonical with hreflang, lang, media or type attributes not used for canonicalization | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls |
| Canonicalization is a hint, not a rule; signals include HTTP vs HTTPS, redirects, sitemap, rel=canonical | https://developers.google.com/search/docs/crawling-indexing/canonicalization |
| Why Google picks a different canonical (content and technical signals can override); CMS or plugin misuse; servers and soft 404s; hacked sites; missing hreflang; syndication (canonical not recommended); copycats; duplicate clusters may persist up to two weeks; Request Indexing is quota-limited | https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting |
| JavaScript canonicals: HTML preferred; do not change the canonical from the original HTML; avoid injecting multiple canonicals; noindex in original HTML may skip rendering | https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics |
| Duplicate-related statuses: Alternate page with proper canonical tag; Duplicate without user-selected canonical; Duplicate, Google chose different canonical than user; Page with redirect | https://support.google.com/webmasters/answer/7440203 |
| `userCanonical` and `googleCanonical` (absent if not indexed) in URL Inspection API | https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult |
| robots.txt block means page rules (noindex) are not read | https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag |

## Tool behaviour observed (sitetiller 0.1.0, 2026-11-12, wordpress.org)
- `page` returns `canonical` (first `<link rel="canonical">`) and `canonicalCount`; for `https://wordpress.org/` it gave `canonical: https://wordpress.org/`, `canonicalCount: 1`.
- `pages` rows carry `url` and `canonical`; the summary groups `duplicateTitles` and `duplicateDescriptions`.
- The tool reads the first 250,000 characters of the HTML head area for `<link>` tags and does not read HTTP `Link:` headers or run JavaScript.

## Not verified
- A Google statement that a canonical must not point to a noindexed or redirecting URL: not found in the pages read. The skill presents it as a recommendation, not as a Google rule.
- A Google statement on "multiple canonicals" in HTML: the JavaScript page says to avoid injecting several; the skill extends this to "keep one tag" as the safe practice.
