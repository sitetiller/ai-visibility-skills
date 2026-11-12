# Sources (checked 2026-11-12)

| Check | What the source says | URL |
|---|---|---|
| HTTP status handling | 2xx processed (empty "success" pages become soft 404); 3xx followed up to 10 hops, 301/308 strong signal, 302/303/307 weak; 4xx (except 429) removes indexed URLs and ignores content; 429 handled like a server error; persistent 5xx eventually drops URLs | https://developers.google.com/search/docs/crawling-indexing/http-network-errors |
| Redirect chains | Googlebot can follow up to 10 hops; keep chains ideally no more than 3 and fewer than 5; avoid sending many old URLs to the home page | https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes |
| noindex and robots.txt | noindex only works if the page is crawlable; X-Robots-Tag works for non-HTML; most restrictive rule wins | https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag |
| noindex and JavaScript | noindex in the original HTML may stop rendering; avoid multiple or changed canonicals via JS; soft 404 fixes in SPAs | https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics |
| Titles | every page should have a `<title>`; no length limit but truncated to device width; avoid duplicate or boilerplate titles; main title in the first visible `<h1>` | https://developers.google.com/search/docs/appearance/title-link |
| Descriptions | no limit on length; Google sometimes uses the meta description; snippets built from page content | https://developers.google.com/search/docs/appearance/snippet |
| Crawlable links | links must be `<a>` with `href`; every page you care about needs a link from at least one other page | https://developers.google.com/search/docs/crawling-indexing/links-crawlable |
| Sitemaps | 50,000 URLs or 50 MB uncompressed; priority and changefreq ignored; lastmod used only if consistently accurate; a sitemap is a hint | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap |
| Structured data | JSON-LD recommended; markup must match visible content; valid markup does not guarantee a rich result | https://developers.google.com/search/docs/appearance/structured-data/sd-policies |
| FAQ rich result | "will no longer appear in Google Search starting May 7, 2026" (changelog entry dated May 8, 2026) | https://developers.google.com/search/docs/appearance/structured-data/faqpage |
| Mobile-first indexing | same content, robots meta tags, structured data, titles, descriptions on mobile and desktop; do not lazy-load primary content on interaction; do not block resources | https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing |
| Core Web Vitals | LCP 2.5 s, INP 200 ms, CLS 0.1 at the 75th percentile, by mobile and desktop | https://web.dev/articles/vitals |
| robots.txt rules | see `skills/ai-crawlers/references/sources.md` | https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt |

## Tool behaviour observed (sitetiller 0.1.0, run 2026-11-12 against wordpress.org)
- `page` returns `chain[]`, `finalUrl`, `status`, `title`, `titleCount`, `description`, `canonical`, `canonicalCount`, `robotsMeta`, `xRobots`, `noindex`, `hreflang[]`, `h1[]`, `schemaTypes`, `words`, `links[]`, `robotsTxtGooglebot`. `http://wordpress.org/news` gave a three-entry chain (301, 301, 200). `titleCount` can exceed 1 when the page has other `<title>` elements such as inline SVG titles.
- `pages` returns `sitemapUrl`, `listed`, `read`, `pages[]`, `summary`.
- `links` returns `sitemapUrl`, `listed`, `crawled`, `orphans[]`, `weak[]`, `note`. With `--pages 3` on wordpress.org nearly all sampled URLs appeared as orphans, so sample size drives orphan counts.
- `sitemap` returns `found`, `kind`, `urlCount`, `inRobots`, `robotsSitemaps`, `lastmod`, `children[]`, `issues[]`, `sample[]`.
- `schema` returns `url`, `status`, `types`, `findings[]`.

## Not verified
- Any rule that exactly one H1 per page is required: Google's guidance read does not say so; the skill marks it low priority.
- The tool's description limits (70 and 160 characters) are the CLI's own heuristics, not Google's.
- `cwv` was not run with a live key during authoring.
