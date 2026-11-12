---
name: canonicals
description: "Choose between rel=canonical, 301 redirects, noindex and robots.txt for duplicate or near-duplicate URLs, and detect canonical conflicts: canonical pointing to a redirect or noindex page, multiple canonicals, relative canonicals, canonicals set by JavaScript, and Google choosing a different canonical than the user. Use when the user asks 'canonical tag', 'duplicate content', 'Duplicate without user-selected canonical', 'Google chose different canonical', 'Alternate page with proper canonical tag', 'which URL should rank', 'parameters or www/https duplicates', or 'canonical vs redirect vs noindex'. Uses sitetiller page, pages and inspect."
license: MIT
metadata:
  version: 0.1.0
---

# Canonicals

Goal: for each group of duplicate URLs, one preferred URL, declared with consistent strong signals, and a check that Google agrees. Google is clear that a canonical preference is a hint and not a rule: it may choose another URL.

## Choose the tool
| Situation | Use | Google's description |
|---|---|---|
| Old URL should disappear for good | 301 or 308 redirect | "a strong signal that the target of the redirect should become canonical" |
| Duplicates that must both stay reachable (parameters, print versions, similar pages) | `rel="canonical"` | "a strong signal" |
| Preferred URLs listed in the sitemap | sitemap inclusion | "a weak signal"; use it as a supporting signal |
| Page must stay out of search results | `noindex` | not a canonicalization tool: Google does not recommend noindex to prevent selection of a canonical within one site |
| Keep a page from being crawled | robots.txt | do not use for canonicalization; a blocked page's tags are never read |
| Non-HTML file (PDF) | `Link: <url>; rel="canonical"` HTTP header | works for non-HTML files |

Methods can stack. Do not name different canonicals in different methods for the same page.

## Rules for the tag (Google)
- Absolute URL, not relative.
- Inside `<head>`; it is only accepted there.
- One canonical per page. Use the HTML element or the HTTP header, not both.
- The canonical page carries a self-referencing canonical.
- `rel="canonical"` with `hreflang`, `lang`, `media` or `type` attributes is not used for canonicalization.
- Prefer HTML. If JavaScript must set it, do not change it from what the original HTML says, and never inject a second one.

## Steps
1. Read one page:
   ```bash
   npx sitetiller page https://example.com/shoes?color=red --json
   ```
   Fields: `canonical` (first one found), `canonicalCount`, `finalUrl`, `chain`, `noindex`, `robotsMeta`, `xRobots`, `robotsTxtGooglebot`, `hreflang[]`. Reads HTML `<link rel="canonical">` only; `Link:` header canonicals are not read, and JavaScript is not run.
2. Flag in each page:
   | Result | Meaning | Fix |
   |---|---|---|
   | `canonicalCount` 0 on a page with duplicates | no declared preference | add a self-referencing canonical |
   | `canonicalCount` above 1 | conflicting tags (often a theme plus an SEO plugin) | keep one; Google warns against multiple canonicals |
   | `canonical` differs from `finalUrl` | page defers to another URL | confirm that is intended |
   | `canonical` is relative | not recommended by Google | make it absolute |
   | canonical target redirects, 404s, or has `noindex` | contradictory signals (our recommendation: Google's pages read do not name this case, but a canonical should name the page you want indexed) | point it at the final, indexable URL: check it with `page` |
   | canonical on `http://` while the site serves https | wrong protocol | use https |
   | `noindex` plus a canonical to another page | mixed message | choose one: noindex to exclude, or canonical to consolidate |
3. Sample the site:
   ```bash
   npx sitetiller pages example.com --pages 40 --json
   ```
   In `pages[]` compare each `canonical` with its `url`; list pages whose canonical is empty or points elsewhere. `summary.duplicateTitles` and `summary.duplicateDescriptions` group pages that probably compete; check each group has a deliberate canonical.
4. Check the sitemap lists only the preferred URLs (`sitemaps` skill, `sitemap` command `sample[]`: redirects and noindex).
5. Ask Google what it chose (Search Console access needed):
   ```bash
   npx sitetiller inspect example.com https://example.com/shoes?color=red --json
   ```
   Compare `userCanonical` (declared) with `googleCanonical` (selected). `googleCanonical` is absent when the page is not indexed. Equal: fine. Different: Google disagrees; see below.
6. For many near-duplicate pages that compete for the same queries, use the `cannibal` command on a query-page export (not covered here).

## Search Console statuses about duplicates
| Status (Page indexing report) | Meaning | Action |
|---|---|---|
| Alternate page with proper canonical tag | page is an alternate of an indexed canonical | none, intended |
| Duplicate without user-selected canonical | duplicate, no canonical declared, Google picked one | declare a canonical, or make the content substantially different |
| Duplicate, Google chose different canonical than user | Google thinks another URL is better | inspect both URLs; check the declared canonical is truly similar and the better page; make the clustered pages meaningfully different if they should both rank |
| Page with redirect | non-canonical URL that redirects | usually none |

Google says duplicate clusters may persist up to two weeks after fixing, and Request Indexing is quota-limited, so use it only for key URLs.

## Causes Google lists when it picks the wrong canonical
A CMS or plugin emitting wrong canonicals or redirects; servers returning another domain's content or identical soft 404 pages; hacked sites with injected redirects or cross-domain canonicals; language or regional variants without hreflang; syndicated copies (canonical not recommended, ask partners to block indexing); copycat sites. Fix the cause the evidence points to.

## Output to the user
1. The preferred URL for each duplicate group, and the signal used (redirect, canonical, both plus sitemap).
2. A table of conflicts found with the `page` or `inspect` field that proves each.
3. The exact tag or redirect rule to put in place.
4. Honest expectations: Google may still choose differently; allow up to two weeks for re-evaluation.

## Guardrails
- Do not use noindex or robots.txt to resolve duplicates within a site.
- Do not call duplicate content a penalty. The Google pages read describe duplicates as Google choosing one canonical URL; none of the statuses is a manual action.
- Do not set canonicals across unrelated pages. Google says it weighs content and technical signals and can override the declared canonical.
- Do not suggest `rel=canonical` for syndicated content: Google's troubleshooting page says the pages are often very different.
- State what the tool cannot see: HTTP header canonicals, JavaScript-set canonicals, and Google's chosen canonical without Search Console access.

## References
- `references/sources.md`: Google documentation, checked 2026-11-12.
