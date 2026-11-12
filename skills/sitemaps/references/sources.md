# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Google formats (XML, RSS/mRSS/Atom, text), 50 MB uncompressed or 50,000 URLs, sitemap index, UTF-8, absolute URLs, scope is the parent directory unless submitted through Search Console, `priority` and `changefreq` ignored, lastmod used only if consistently accurate, submission is a hint | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap |
| Ways to tell Google: Sitemaps report, Search Console API, robots.txt `Sitemap:` line (full URL, several allowed) | same page, section "Tell Google about your sitemap" |
| Small site is about 500 pages or fewer; sitemap does not guarantee crawl or indexing | https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview |
| Ping endpoint deprecated, requests return 404; lastmod is a crawl scheduling signal, must be accurate, means last significant modification | https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping |
| Search Console Sitemaps report: owner permission to submit, status values Success / Has errors / Couldn't fetch, "Discovered pages", removing a report entry does not stop Google using the sitemap, report shows up to 1,000 submissions | https://support.google.com/webmasters/answer/7451001 |
| Protocol: 50,000 URLs, 50 MB (52,428,800 bytes), index up to 50,000 sitemaps, UTF-8, entity escaping, W3C Datetime for lastmod, location scope, same protocol and host, cross-host submission via robots.txt `Sitemap:` line | https://www.sitemaps.org/protocol.html |
| Bing: 50,000 URLs per sitemap, index of child sitemaps, ISO 8601 lastmod with date and time reflecting true last modification, changefreq and priority ignored, submit through robots.txt or Bing Webmaster Tools, fetched right away and rechecked at least daily, recommends IndexNow | https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/ |
| IndexNow: do not resubmit unchanged URLs | https://www.indexnow.org/faq |

## Not verified
- Platform-specific sitemap locations and plugin behaviour (WordPress, Shopify, Next.js and others): not checked, so the skill makes no platform claims.
- Bing's help page for sitemaps (bing.com/webmasters/help) could not be read in full; the Bing Webmaster Blog post above is the source for Bing statements. The exact menu label in Bing Webmaster Tools may differ; the skill says "Sitemaps" and a robots.txt fallback.
- The Bing blog gives two different totals for what an index can reference (billion and trillion); the skill omits that number.
- Tool behaviour observed on wordpress.org (2026-11-12): `sitemap` found an index at `/sitemap.xml` with 843 listed URLs, `inRobots: true`, children for pages, images and videos, and read `children[].urls` per child.
