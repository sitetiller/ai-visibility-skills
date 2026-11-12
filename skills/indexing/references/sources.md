# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Page indexing statuses and Google's explanations and fixes (all rows in the SKILL.md table); validation typically takes up to about two weeks; indexing a new page can take days to a few weeks | https://support.google.com/webmasters/answer/7440203 |
| Request Indexing: owners and full users only; "there's a quota for submitting individual URLs" (no number published); repeated requests for the same URL do not speed crawling; crawling takes a few days to a few weeks; no guarantee; sitemap for many URLs | https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl |
| URL Inspection API: request body, scopes, `UrlInspectionResult` and `indexStatusResult` fields and enum values (verdict, robotsTxtState, indexingState, pageFetchState, googleCanonical absent if not indexed); only the indexed version is available, no live test | https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect and https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult |
| URL Inspection quota: 2,000 queries per day and 600 per minute per site | https://developers.google.com/webmaster-tools/limits |
| Indexing API only for `JobPosting` and `BroadcastEvent` in a `VideoObject`; not for general pages | https://developers.google.com/search/apis/indexing-api/v3/quickstart |
| noindex needs a crawlable page; robots.txt block means rules are not read | https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag |
| noindex in raw HTML may skip rendering; JavaScript cannot reliably remove it | https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics |
| Do not use noindex to pick a canonical within one site | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls |
| Crawlable links; every page needs a link from at least one other page | https://developers.google.com/search/docs/crawling-indexing/links-crawlable |
| Mobile-first indexing parity | https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing |
| IndexNow: key 8-128 chars, key file, JSON POST fields, up to 10,000 URLs per request, response codes 200/202/400/403/422/429, no indexing guarantee | https://www.indexnow.org/documentation |
| IndexNow FAQ: participating engines Amazon, Bing, Naver, Seznam.cz, Yandex, Yep (Google not mentioned); submit only when content changed | https://www.indexnow.org/faq |
| Bing IndexNow page: submit URLs added, updated or deleted; every crawl counts toward quota; no guarantee of crawling or indexing; Google not listed | https://www.bing.com/indexnow/getstarted |

## Not verified
- The Request Indexing quota number: Google publishes none. The skill says so.
- Exact `coverageState` strings returned by the API: Google's reference says only "string". The skill calls it Google's text and tells the reader to use the status names from the Page indexing report.
- Statuses not listed on the Page indexing help page (for example "Duplicate, submitted URL not selected as canonical", "Crawl anomaly"): the page does not contain them. The skill tells the agent to use the issue detail text rather than guess.
- Whether Google processes IndexNow: not stated by Google or on the IndexNow pages read.
- `inspect` and `indexnow` were not run against live credentials during authoring; fields come from the CLI source and Google's reference. The `page` command was run (wordpress.org).
