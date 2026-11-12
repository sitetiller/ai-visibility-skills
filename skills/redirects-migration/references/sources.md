# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Site move steps: expect temporary fluctuation; medium sites can take a few weeks or more; 301 does not lose PageRank; prepare new site; collect old URLs (sitemaps, analytics, logs, links report, CMS) including images, video, JS, CSS; map each URL; self-referencing canonicals; update hreflang and internal links; permanent server-side redirects (301 or 308); avoid chains (up to 10 hops followed, ideally no more than 3, fewer than 5); do not redirect many URLs to an unrelated page; keep redirects generally at least 1 year; new sitemap; monitor Sitemaps, Page indexing, logs; complete when Googlebot has visited every old and new URL; common mistakes | https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes |
| Redirect types: permanent (301, 308) strong signal for canonical target; temporary (302, 303, 307) target not used as canonical; server-side most reliable, meta refresh next, JavaScript last resort | https://developers.google.com/search/docs/crawling-indexing/301-redirects |
| 3xx handling: up to 10 hops by default; 301/308 strong signal, 302/303/307 weak; failed redirects reported in Search Console | https://developers.google.com/search/docs/crawling-indexing/http-network-errors |
| Change of Address: not for HTTP to HTTPS, path moves, www to non-www, hosting changes; owner of both properties with the same account; domain-level only; include all variants; effects last 180 days; keep redirects at least 180 days; keep old domain at least a year; cancel within 180 days | https://support.google.com/webmasters/answer/9370220 |
| Status "Redirect error" (chain too long, loop, URL too long, bad URL) and "Page with redirect" | https://support.google.com/webmasters/answer/7440203 |

## Tool behaviour observed (sitetiller 0.1.0, 2026-11-12)
- `page http://wordpress.org/news --json` returned `chain` of three entries: `http://wordpress.org/news` 301, `https://wordpress.org/news` 301, `https://wordpress.org/news/` 200. `check-map.mjs` flagged the same URL as "chain of 2 redirects" and a URL without a redirect as "no redirect", on a test map.
- `decay` matches rows on the `page` column (code: `r.page ?? r.key`), so URL changes need a mapped join before comparing.
- `version snapshot|list|diff|drift` keys storage on the final URL and stores a fingerprint (status, finalUrl, title, description, h1, headings, canonical, noindex, schemaTypes, words, tables, internalLinks, textHash).

## Not verified
- Lowering DNS TTL before a move: the Google guide read does not mention it, so the skill omits it.
- How long Google takes for a large site: Google says longer than "a few weeks or more" without a number.
- Whether temporary redirects left in place harm a move beyond Google's statement that the target is not used as a canonical signal; the skill uses only that statement.
