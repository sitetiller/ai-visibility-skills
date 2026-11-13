---
name: tech-audit
description: "Run a full technical SEO audit of a public site and return a prioritised findings table (impact by effort): crawl access, robots.txt, sitemap, status codes and redirects, indexability (noindex, canonical), titles and descriptions, headings, internal links and orphans, structured data, mobile parity, and Core Web Vitals. Use when the user asks for a 'technical SEO audit', 'site audit', 'SEO health check', 'what is wrong with my site', 'audit this URL', or 'why is my site not ranking' and wants evidence, not guesses. Uses the sitetiller CLI crawl, pages, page, sitemap, links, crawlers, schema, images and cwv commands."
license: MIT
metadata:
  version: 0.2.0
---

# Technical SEO audit

Goal: a short, ranked list of problems that are real, shown with the evidence (a command result), the source that says why it matters, and the fix. Nothing in the report comes from folklore. A check the tools cannot run is listed under "Not checked", with how the user can check it.

## Inputs
- A domain or homepage URL, and optionally 3 to 5 key templates (home, a category, an article or product, a landing page).
- Optional: Search Console access (see the `setup` skill). Without it, the audit covers what a crawler sees, not what Google has indexed.

## Start with a crawl
```bash
npx sitetiller crawl https://example.com --max 100 --json
```
One request at a time (1 s apart by default), robots.txt respected, same host only. Output: `score` (`overall` and `categories` for indexability, onpage, links, content, structured, with the arithmetic in `method`), `findingCounts`, `siteFindings` (duplicate titles and descriptions, broken internal links with the pages that hold them, links to redirects) and `pages[]` with each page's `status`, `depth` and `findings`. The score is a checklist ratio for tracking progress between audits, not a Google measure; report the findings, not the number alone. Use the steps below to confirm and explain what the crawl found.

## Order of work
Run in this order. A blocker at an early step makes later steps moot, so fix it first.

### 1. Can crawlers get in? (robots.txt and AI crawlers)
```bash
npx sitetiller crawlers example.com --json
npx sitetiller crawlers example.com/some/section/ --json
```
Read `status`, `found`, `problems`, `sitemaps`, and each bot's `allowed`, `rule`, `line`. Googlebot blocked on a path that should rank is a blocker. For the AI crawler decisions use the `ai-crawlers` skill.
Facts that matter (Google's robots.txt documentation, see the `ai-crawlers` sources): 4xx on robots.txt means no rules, 5xx pauses crawling. A robots.txt block stops Google reading a `noindex` on that page.

### 2. Sitemap
```bash
npx sitetiller sitemap example.com --sample 20 --json
```
Read `found`, `kind`, `urlCount`, `inRobots`, `lastmod` (a count of `<lastmod>` tags), `issues`, and `sample[]` (`status`, `noindex`, `redirectedTo`). Every sampled URL in a sitemap should answer 200, be indexable and not redirect. Details: the `sitemaps` skill.

### 3. Status codes and redirects on the key templates
```bash
npx sitetiller page https://example.com/ --json
npx sitetiller page http://example.com/some-page --json
npx sitetiller page https://www.example.com/some-page/ --json
```
Test the four variants (http, https, www, non-www) of the homepage. Read `chain[]` (each hop's `status`), `finalUrl`, `status`. Expectations from Google's documentation:
- One permanent hop to the final URL. Googlebot follows up to 10 hops, but the site move guide advises chains ideally no more than 3 and fewer than 5. The `page` command follows at most 6 hops.
- 301 and 308 are strong signals that the target is canonical; 302, 303, 307 are weak signals.
- 4xx removes indexed URLs from the index; persistent 5xx eventually does too.
- A "not found" page that answers 200 is a soft 404.
Redirect work: the `redirects-migration` skill.

### 4. Indexability signals on every template
From the same `page` output read `noindex`, `robotsMeta`, `xRobots`, `canonical`, `canonicalCount`, `robotsTxtGooglebot`.
- `noindex` true on a page that should rank: blocker.
- `canonicalCount` above 1, a canonical pointing to another URL, or to a redirecting or noindex URL: fix (see `canonicals`).
- `robotsTxtGooglebot.allowed` false: Googlebot cannot crawl it.
- The tool reads the HTML only. It does not read `Link:` header canonicals and does not run JavaScript. If the page builds its canonical or robots meta with JavaScript, say so: Google says `noindex` in the raw HTML may stop rendering, so JavaScript cannot undo it.

### 5. On-page basics across many pages
```bash
npx sitetiller pages example.com --pages 40 --json
```
Read `summary`: `missingDescription`, `shortDescription`, `longDescription`, `duplicateTitles`, `duplicateDescriptions`, `noindex`, `multipleOrNoH1`, `invalidSchema`, `schemaTypes`. Per page: `title`, `titleLength`, `descriptionLength`, `h1Count`, `canonical`, `words`.
- Every page should have a `<title>`. Google puts no limit on title or description length; it truncates to the device width. Duplicate or boilerplate titles make pages hard to tell apart. So report these without a length rule: missing, duplicate, boilerplate.
- The tool's `shortDescription` (under 70 characters) and `longDescription` (over 160) are the tool's own rules of thumb, not Google limits. Mark them "low priority".
- `multipleOrNoH1` follows a convention. Google's title link guidance suggests the main title in the first visible `<h1>`; it does not make several H1s an error. Low priority.
- A page the tool marks `error: true` could not be read; list it.
- Titles may show HTML entities (for example `&#124;` for `|`). That is how the page source encodes them.

### 6. Internal links and orphans
```bash
npx sitetiller links example.com --pages 50 --json
```
Read `orphans[]` and `weak[]` (`url`, `linkedFrom`, `anchors`). Google: every page you care about should be linked from at least one other page, with crawlable `<a href>` links. The tool samples `--pages` pages, so a page listed as an orphan may be linked from pages it did not crawl. Raise `--pages` or verify with the live site before reporting. The `note` field in the output states the sample size.

### 7. Structured data
```bash
npx sitetiller schema https://example.com/some-article --json
```
Read `types` and `findings[]` (`level`, `type`, `message`, `doc`). The linter covers Article, SoftwareApplication, Product, Event and LocalBusiness and flags FAQPage (Google stopped showing FAQ rich results on 2026-05-07). Markup must describe visible content, and valid markup does not guarantee a rich result. For anything else, use Google's Rich Results Test.

### 8. Core Web Vitals
```bash
npx sitetiller cwv https://example.com/ --json
npx sitetiller cwv https://example.com/ --form DESKTOP --json
npx sitetiller cwv https://example.com/ --origin --json
```
Needs `CRUX_API_KEY`. Thresholds and fixes: the `core-web-vitals` skill.

### 9. Mobile parity (manual)
Google indexes the mobile version, so the same content, robots meta tags, structured data, titles and descriptions must exist on mobile. The CLI fetches one version. Ask the user to compare the mobile and desktop page, or to use Search Console's URL Inspection.

## Findings table (sample output)
Score impact (H/M/L) by effort (H/M/L). Order: high impact and low effort first. Never invent impact; "H" means the page cannot be indexed or found, or many pages are affected.

| # | Finding | Evidence | Why it matters (source) | Fix | Impact | Effort |
|---|---|---|---|---|---|---|
| 1 | `/pricing` is noindex | `page`: `noindex: true`, `robotsMeta: ["noindex"]` | noindex keeps a page out of results | remove the tag | H | L |
| 2 | 38 of 40 sampled pages share one description | `pages`: `duplicateDescriptions` | boilerplate snippets are hard to tell apart | write page-specific descriptions or drop the tag and let Google build snippets | M | M |
| 3 | Old URLs redirect twice | `page`: `chain` has 3 entries | chains slow crawling; point to the final URL | change the first redirect | M | L |
| 4 | 12 sitemap URLs return 404 | `sitemap`: `sample` | sitemap should list live, indexable URLs | regenerate the sitemap | M | L |
| 5 | LCP p75 3.1 s on phone | `cwv`: `rating: needs improvement` | web.dev: good is 2.5 s or less | see `core-web-vitals` | M | M |

## Output to the user
1. Verdict in two sentences: blockers first.
2. The findings table, sorted, at most 15 rows.
3. "Not checked": Search Console indexing data, JavaScript rendering, mobile parity, server logs, backlinks, content quality. Say how to check each.
4. The first three fixes to do this week.

## Guardrails
- Report evidence from commands only. Every claim carries a command result or a source in `references/sources.md`.
- Do not claim a length, count or ratio limit that Google does not publish (title, description, H1, internal links per page, word count).
- A sample is a sample: state how many pages were read and the total listed.
- Do not edit the user's site. Recommend fixes only; changes belong to the user.
- Do not call something a penalty. Google documents manual actions separately; a missing ranking is not evidence of one.

## References
- `examples/pages.json`, `examples/crawl.json`: real output of this skill's command on sitetiller.com (2026-11-13), see `examples/README.md`.
- `references/sources.md`: Google, web.dev and protocol documents behind each check, with access dates.
