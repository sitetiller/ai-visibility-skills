---
name: sitemaps
description: "Create, validate and submit XML sitemaps correctly: 50,000 URL and 50 MB limits, sitemap index files, accurate lastmod, absolute URLs on the same host, the robots.txt Sitemap line, and submission in Google Search Console and Bing Webmaster Tools. Use when the user asks 'make a sitemap', 'is my sitemap valid', 'submit sitemap to Google/Bing', 'sitemap has errors', 'Couldn't fetch', 'what should go in sitemap.xml', 'lastmod', or 'sitemap index'. Uses the sitetiller sitemap command on the live sitemap."
license: MIT
metadata:
  version: 0.1.0
---

# Sitemaps

Goal: a sitemap that lists the URLs the user wants indexed, passes the protocol limits, is discoverable, and is submitted where it counts. A sitemap helps search engines discover URLs. Google says it is a hint and does not guarantee crawling or indexing, so never promise indexing from it.

## Inputs
- The domain, and how the sitemap is produced (CMS plugin, framework, script, hand-written).
- A list of the URLs that should be indexable (or a way to get them from the CMS).

## Do they need one?
Google's overview: a site of about 500 pages or fewer that is well linked internally might not need one; large sites, new sites with few external links, and sites with lots of video, image or news content might. Submitting one is cheap, so recommend it, but do not call a missing one the cause of a ranking problem on a small, well-linked site.

## Steps
1. Check what exists:
   ```bash
   npx sitetiller sitemap example.com --sample 20 --json
   ```
   Fields: `found`, `sitemapUrl`, `kind` (`urlset` or `index`), `urlCount`, `inRobots`, `robotsSitemaps`, `lastmod` (count of `<lastmod>` tags), `children[]` (`url`, `status`, `urls`), `issues[]`, `sample[]` (`url`, `status`, `noindex`, `redirectedTo`). The tool reads up to 10 child sitemaps of an index and checks an evenly spread sample of listed URLs. Raise `--sample` for more, and mind the site's load (the tool waits between requests).
2. Read `issues[]` and `sample[]`. Fix in this order:
   - Listed URLs that answer 404, 5xx or redirect: remove them or list the final URL.
   - Listed URLs with `noindex: true`: remove them (a sitemap says "index this"; noindex says the opposite).
   - Other-host or `http://` URLs on an https site: use the exact canonical, fully qualified URL.
   - Not in robots.txt: add the line below.
   - No `<lastmod>`: add accurate values or leave them out; see rules.
3. Build or repair the file using the rules below. For hand-made or script-made files, use the template.
4. Publish at the site root and add to robots.txt:
   ```
   Sitemap: https://example.com/sitemap.xml
   ```
   The line may appear anywhere in robots.txt and you can list several. It must be a full URL.
5. Submit:
   - **Google:** Search Console, Sitemaps report, "Add a new sitemap". Needs owner permission on the property; without it, rely on the robots.txt line. Before submitting, confirm Googlebot can fetch the file (live URL inspection, page fetch successful). Statuses: Success, Has errors (parsed URLs are still queued), Couldn't fetch. "Discovered pages" counts parsed URLs; it does not mean indexed.
   - **Bing:** Bing Webmaster Tools, Sitemaps, submit the URL; or rely on the robots.txt line. Bing says that once referenced either way it fetches the sitemap right away and rechecks at least daily.
   - Do not use the old ping URL. Google ended it: ping requests return 404 and do nothing.
   - For individual changed URLs on Bing, use IndexNow (`indexing` skill).
6. Re-run step 1 after publishing and again after the next crawl. In Search Console, open the sitemap's detail page for errors.

## Rules (protocol and Google)
| Rule | Value | Source |
|---|---|---|
| Max URLs per sitemap | 50,000 | sitemaps.org, Google |
| Max size | 50 MB (52,428,800 bytes) uncompressed | sitemaps.org, Google |
| Index file | up to 50,000 sitemaps, same size cap | sitemaps.org, Search Console help |
| Encoding | UTF-8, entity-escaped (`&` as `&amp;`) | sitemaps.org |
| URLs | fully qualified and absolute, same protocol and host as the sitemap | Google, sitemaps.org |
| Scope | a sitemap affects only URLs at or below its own directory, unless submitted through Search Console | Google |
| `lastmod` | W3C Datetime, real last significant change (main content, structured data, links), never the generation time | Google, sitemaps.org, Bing |
| `priority`, `changefreq` | ignored by Google and by Bing | Google, Bing |
| Formats Google accepts | XML, RSS/mRSS/Atom, text (one URL per line) | Google |
| Which URLs | the ones you want shown in search; Google generally shows canonical URLs | Google |

Bing asks for ISO 8601 `lastmod` including date and time. The sitemap protocol accepts the date-only form. Use a full timestamp if you want both to have the precise signal.

If lastmod is wrong on many URLs, Google says it will stop trusting it. Better to omit it than to stamp every URL with the build time.

## Template
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/guide/</loc>
    <lastmod>2026-10-14T09:30:00+00:00</lastmod>
  </url>
</urlset>
```
Index file:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-blog.xml</loc></sitemap>
</sitemapindex>
```
Split by section (pages, blog, products). It makes the Search Console report readable: errors point at one section.

## Several hosts or domains
A sitemap may only list URLs on its own protocol and host. To submit URLs for another host from a sitemap hosted elsewhere, the sitemaps.org protocol says to prove ownership with a `Sitemap:` line in the other host's robots.txt.

## Platforms
No platform-specific claims are made here: they were not verified against each platform's own documentation. Tell the user to check their CMS or framework docs for where the generated sitemap lives, then run step 1 on the live URL, which shows what is really served.

## Output to the user
1. Verdict: found or not, size and kind, number of URLs, how many sampled URLs are clean.
2. Problems from `issues[]` and `sample[]`, each with the fix.
3. The exact robots.txt line and where to submit in Google and Bing.
4. What to expect: Google calls the sitemap a hint; check Search Console's Page indexing report for what was actually indexed.

## Guardrails
- Do not tell the user a sitemap improves rankings. Say it helps discovery.
- Do not recommend `priority` or `changefreq`.
- Do not recommend fake or "always today" lastmod values.
- Do not list URLs that are blocked by robots.txt, noindexed, redirected or erroring.
- Deleting a sitemap from the Search Console report does not stop Google using it; to stop crawling use robots.txt, remove the file or pages, or noindex.
- The Search Console API submits sitemaps only with the write scope; this repo's read-only setup does not use it, so submission is a manual UI step.

## References
- `examples/sitemap.json`: real output of this skill's command on sitetiller.com (2026-11-13), see `examples/README.md`.
- `references/sources.md`: Google, Bing and sitemaps.org documentation, checked 2026-11-12.
