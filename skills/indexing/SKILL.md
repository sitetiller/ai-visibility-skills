---
name: indexing
description: "Diagnose why a page is not indexed by Google or Bing and speed up discovery the legitimate way. Maps Search Console page indexing statuses (Crawled - currently not indexed, Discovered - currently not indexed, Duplicate without user-selected canonical, Soft 404, Blocked by robots.txt, noindex, Redirect error and more) to causes and fixes, runs URL Inspection through the API, explains Request Indexing limits, and submits changed URLs to IndexNow for Bing. Use when the user says 'not indexed', 'why isn't my page on Google', 'URL is unknown to Google', 'request indexing', 'IndexNow', 'new page not showing', or 'Discovered currently not indexed'."
license: MIT
metadata:
  version: 0.1.0
---

# Indexing: find the cause, then act

Goal: a specific cause for each non-indexed URL, taken from Google's own status for that URL, and a fix the user can make. Indexing is never guaranteed. Google says requesting a crawl does not guarantee a page appears in results quickly or at all, so the answer is often "fix the cause and wait", and the skill says so.

## Inputs
- The URL(s) and the Search Console property (see the `setup` skill for access). `inspect` needs Full permission.
- Whether the page is new or was indexed before.

## Steps
1. See what a crawler sees (works without credentials):
   ```bash
   npx sitetiller page https://example.com/the-page --json
   ```
   Check in order: `status` and `chain` (200, no error redirect), `robotsTxtGooglebot.allowed`, `noindex`, `xRobots`, `canonical` (does it point to itself?), `words`. Any problem here is the likely cause; stop and fix it first.
2. Ask Google what it knows:
   ```bash
   npx sitetiller inspect example.com https://example.com/the-page --json
   ```
   Output fields (from Google's URL Inspection API): `verdict` (PASS, PARTIAL, FAIL, NEUTRAL), `coverageState` (Google's text, as in the page indexing report), `robotsTxtState` (ALLOWED or DISALLOWED), `indexingState` (INDEXING_ALLOWED, BLOCKED_BY_META_TAG, BLOCKED_BY_HTTP_HEADER, BLOCKED_BY_ROBOTS_TXT), `lastCrawlTime`, `pageFetchState` (SUCCESSFUL, SOFT_404, BLOCKED_ROBOTS_TXT, NOT_FOUND, ACCESS_DENIED, SERVER_ERROR, REDIRECT_ERROR, ACCESS_FORBIDDEN, BLOCKED_4XX, INTERNAL_CRAWL_ERROR, INVALID_URL), `googleCanonical`, `userCanonical`, `link` (opens the same result in Search Console). `googleCanonical` is absent when the page is not indexed.
   Limits: the API shows the version in Google's index. It cannot test a live URL; use the "Test live URL" button in Search Console for that. Quota: 2,000 queries per day and 600 per minute per property. Inspect the important pages, not the whole site.
3. Match the status to a cause with the table below. Statuses are Google's names from the Page indexing report.
4. Fix, then validate. In Search Console use "Validate fix" on the issue. Google says validation typically takes up to about two weeks and can take much longer.
5. Tell Google about the fix (see "Speeding discovery").
6. Check again after Google has had time. Google says crawling can take from a few days to a few weeks for a new page or site.

## Status map
| Status in Search Console | What Google says | Do this |
|---|---|---|
| Server error (5xx) | Googlebot got a 5xx | fix availability; check Crawl Stats host status; re-inspect |
| Redirect error | chain too long, loop, URL too long, or bad URL | repair the chain (`page` shows it); point to the final URL |
| Blocked by robots.txt | robots.txt blocks crawling | remove the block to index; to keep a page out, unblock and use noindex (a blocked page's noindex is never read) |
| URL marked 'noindex' | a noindex tag or header | remove it if the page should be indexed |
| Soft 404 | page reads "not found" but returns 200 | return a real 404/410 for missing pages, or add real content |
| Blocked due to unauthorized request (401) | Googlebot was asked to log in | remove the login or allow verified Googlebot |
| Not found (404) | page returned 404 | none if intentional; 301 to the new page if it moved |
| Blocked due to access forbidden (403) | server refused Googlebot | allow unauthenticated access for Googlebot |
| Blocked due to other 4xx issue | another 4xx | debug with URL Inspection |
| Crawled - currently not indexed | Google crawled the page and chose not to index it. Common, not always a problem | for an important page, improve and differentiate the content and internal links; no quick fix exists |
| Discovered - currently not indexed | Google knows the URL, has not crawled it, rescheduled to avoid overloading the site | usually wait; check the server can handle crawling |
| Alternate page with proper canonical tag | the page points to a canonical that is indexed | none; intended |
| Duplicate without user-selected canonical | duplicate of another page, no canonical declared, Google chose one | declare a canonical or make the page substantially different (see `canonicals`) |
| Duplicate, Google chose different canonical than user | Google prefers another URL | inspect both; make sure the declared canonical is truly the better, similar page |
| Page with redirect | non-canonical URL that redirects | usually none; only the target is indexed |
| Indexed, though blocked by robots.txt (warning) | indexed via links despite the block | to keep out: remove the block and use noindex; to index: unblock |
| Page indexed without content (warning) | Google could not read the content (for example cloaking or an unsupported format) | inspect the page and check what Google fetched |

Not in the page indexing documentation read: labels such as "Duplicate, submitted URL not selected as canonical" or "Crawl anomaly". If the user sees one, take Google's description from the issue's detail page; do not guess.

Two causes the status table cannot show:
- **Mobile mismatch.** Google indexes the mobile version; content, robots meta and structured data must match. Check it by hand.
- **JavaScript.** A `noindex` in the original HTML may stop rendering; JavaScript cannot remove it.

## Speeding discovery (what works and what does not)
- **Internal links.** Every page you care about needs a link from at least one other page, as a crawlable `<a href>`. This is the first thing to do for a "Discovered" or orphan page (`links` command, `tech-audit` skill).
- **Sitemap.** Lists the URLs and helps discovery, especially on new sites (`sitemaps` skill).
- **Request Indexing in Search Console** (URL Inspection, owner or Full user). Google confirms a quota exists and publishes no number. Repeating a request for the same URL does not make it faster. Use it for a handful of important URLs after a fix. There is no API for it in this toolset.
- **Google Indexing API.** Only for pages with `JobPosting` or `BroadcastEvent` embedded in a `VideoObject`. Google says it does not support general pages. Do not recommend it for normal content.
- **IndexNow (Bing and other participating engines).** Submit URLs that were added, updated or removed:
  ```bash
  npx sitetiller indexnow https://example.com/new-page https://example.com/updated-page --json
  npx sitetiller indexnow --file changed-urls.txt --json
  ```
  Needs `INDEXNOW_KEY` and the key file on the site (see `setup`). The tool checks the key file first. Output: `host`, `keyLocation`, `batches[]` with `status`, `meaning`, `count`. Codes: 200 submitted, 202 received and key validation pending, 400 invalid format, 403 key invalid, 422 URLs not on the host or key mismatch, 429 too many requests. A 200 only means the engine received the URLs; IndexNow documents no indexing guarantee. The IndexNow FAQ lists Amazon, Bing, Naver, Seznam.cz, Yandex and Yep and does not mention Google, so do not expect Google to act on it. All URLs in one request must share a host; a request may hold up to 10,000 URLs.
- **Bing Webmaster Tools.** Submit the sitemap and inspect the URL there. The `engines` command shows queries where Bing has no data compared with Google (`gsc-bing` skill).

## What not to do
- Do not resubmit unchanged URLs to IndexNow, or hit Request Indexing repeatedly. Both are documented as ineffective or discouraged.
- Do not block a page in robots.txt to keep it out of the index: Google can still index the URL and cannot read a noindex on it.
- Do not use noindex to choose between duplicate pages on the same site; Google advises against it for canonical selection.
- Do not pay for "indexing services" or use the Indexing API for non-job, non-livestream pages. Neither is supported by Google's documentation.
- Do not assume every page will be indexed. Google calls "Crawled - currently not indexed" common and its own decision to make.
- Do not remove a sitemap or redirect a page to "retry" indexing. Fix the cause.

## Output to the user
1. For each URL: the cause, with the command result that shows it (`page` and `inspect` fields).
2. The fix, in one sentence, and who does it.
3. What to do next (validate fix, internal links, IndexNow for Bing) and when to look again, with Google's own time ranges.
4. What is unknown: the Request Indexing quota is unpublished; indexing is not guaranteed.

## Guardrails
- Quote Google's status names exactly; do not invent statuses or causes.
- Never promise a date for indexing. Google gives ranges (a few days to a few weeks; validation about two weeks, sometimes much longer).
- Read-only. The CLI does not request indexing; the user presses the button in Search Console.
- Do not inspect more URLs than needed; the API quota is 2,000 per day per property.

## References
- `references/sources.md`: Google, Bing and IndexNow documentation, checked 2026-11-12.
