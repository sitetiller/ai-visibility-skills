---
name: pseo-quality-gate
description: "Decide whether a programmatic SEO (pSEO) page set is worth building and keep it from becoming scaled content abuse. Quotes Google's spam policy definitions (scaled content abuse, doorway abuse, thin affiliation, site reputation policy), applies a viability test (every page needs facts of its own), runs the gate command on drafts (thin pages, near-duplicates after template text is removed, assets, sources, placeholders, AI tells, title and description lengths), then rolls out in small batches and tells you when to stop using inspect and Search Console indexing counts. Use when the user says 'programmatic SEO', 'pSEO', 'generate hundreds of pages', 'city pages', 'template pages', 'integration pages', 'is this scaled content', 'will Google penalize AI pages', or before publishing many similar pages."
license: MIT
metadata:
  version: 0.1.0
---

# Programmatic SEO without scaled content abuse

Google does not ban pages made from templates or data. It targets pages generated in volume to manipulate rankings rather than help people, "no matter how it's created". This skill decides first whether the set deserves to exist, then checks every draft, then publishes in small batches and stops when the evidence says to.

## What Google's spam policies say (read 2026-11-12, `references/sources.md`)
Use the exact names from Google's spam policies page.
- **Scaled content abuse**: "when many pages are generated for the primary purpose of manipulating search rankings and not helping users." Typically "large amounts of unoriginal content that provides little to no value to users, no matter how it's created." Listed examples include using generative AI or similar tools to generate many pages without adding value, scraping feeds or search results to generate many pages, stitching together content from other pages without adding value, creating multiple sites to hide the scale, and many pages that make little sense to a reader but contain search keywords. Automated transformations such as synonymizing or translating count as methods too.
- **Doorway abuse**: sites or pages created to rank for specific, similar queries that lead users to intermediate pages less useful than the destination. City or keyword variants that funnel to one form are the usual risk.
- **Thin affiliation**: product affiliate links with descriptions and reviews copied from the merchant, with no original content or added value.
- **Site reputation policy**: the policy page's heading for third-party content published on a host site mainly because of that host's established ranking signals. Relevant when a pSEO section is built by or for a third party on an authoritative domain. Google notes third-party content alone is not a violation; the purpose is what matters.
- Google detects violations with automated systems and human review; affected sites "may rank lower in results or not appear in results at all", and some violations can lead to a manual action (reported in Search Console).
- On generative AI: Google says to fact-check and review AI output before publishing, that review also applies to metadata, and that content without added value may breach the spam policy.

## Step 1: Viability (before any page is written)
For the set, answer in writing. Any "no" means do not build the set as planned.
1. **Does each page have facts of its own?** For ten randomly chosen planned pages, list at least three facts that appear only on that page and come from a source: a data row, a measurement, a price, a photo you took, a quote, a local detail, a tool result. Swapping a city or product name into the same sentences does not count.
2. **Is there a reason a person would want this page?** Name the question it answers and the query data or customer evidence that shows people ask it (a Search Console export via `gsc`, support tickets). No volume figures from memory.
3. **Is the data yours or licensed, and current?** Scraped or stitched data without added value is a listed example of scaled content abuse. Record each data source and its date.
4. **Does it need a page?** If two variants would give the same answer, merge them into one page (see `cannibalization`).
5. **Can you maintain it?** Name who updates the data and how often. A stale page with a visible date is worse than no page.
If only some groups pass (for example 40 of 400), build those 40.

## Step 2: Page design for the set
Each page carries what a person needs, built from page-specific data: a real answer first, a table or chart made from this page's data, a source for each claim, a visible "last checked" date, and links to the parent and sibling pages. Add a tool, calculator, image or example only if it runs on or shows this page's data. Markup describes visible content only (`schema`).

## Step 3: The gate command
Put each draft in one folder (`.md` or `.html`, not nested), then:
```bash
npx sitetiller gate drafts/ --json
npx sitetiller gate drafts/ --min-words 400
```
Without `--json` it prints a table and sets exit code 1 on failure. With `--json`: `pages`, `passed`, `errors[]` (`id`, `rule`, `detail`).
Rules, as implemented in `cli/lib/extras.mjs`:
| Rule | What it checks | Note |
|---|---|---|
| `thin` | visible words below `--min-words` (default 600) | The tool's own default. Google publishes no word count; lower it where a short page answers fully |
| `no-assets` | fewer than 2 of: table, figure/svg/image, code block, form or `data-tool` | Own rule |
| `unsourced` | fewer than 2 distinct URLs in the draft | Counts URLs, not whether the source says what the page claims; read them |
| `placeholder` | lorem ipsum, TODO, TBD, "[citation" | |
| `ai-tell` | the pattern "it's not X, it's Y" | One stylistic tell only. Passing says nothing about whether the text is good |
| `duplicate-title`, `duplicate-description` | same title or description as another draft | |
| `title-length` (25 to 65), `description-length` (110 to 160) | character ranges | Own ranges. Google sets no limit and truncates to device width; Bing Webmaster Tools flags descriptions outside 25 to 160 characters as an error in URL Inspection. Fix titles only when empty, tiny or repeated |
| `near-duplicate` | share of 8-word phrases in common, above 12% of the smaller page, after removing phrases found on more than half of the pages (needs 4 or more pages) | This is the measure of "same page with a name swapped" |
Title comes from `<title>` or the first `# ` heading; description from `<meta name="description">` or a `description:` line. Sources are all distinct URLs in the file.
A pass means the drafts clear these mechanical checks. It does not mean Google will index them or that the content is good. A person reads a sample (below).

## Step 4: Human sample
Read at least 10 pages, or 10% of the set, whichever is larger, picked at random, with the data open. For each: is every number right and sourced, does it say something the template alone could not, would you send this page to a customer? Fix the template when two sampled pages share a flaw. Google tells publishers to fact-check generated content before publishing; do it.

## Step 5: Roll out in batches, with stop rules
The batch size and stop rules below are this skill's own risk controls. Google publishes no safe number of pages per day or per week.
1. Batch 1: 10 to 20 pages from the strongest groups. Publish, submit the URLs in a sitemap (`sitemaps`), and list them in a file.
2. Wait 2 to 4 weeks. Google says crawling can take days to weeks (`indexing`).
3. For each page in the batch (or a sample of 10 for big batches):
   ```bash
   npx sitetiller inspect example.com https://example.com/cities/austin --json
   ```
   Read `verdict`, `coverageState`, `lastCrawlTime`, `googleCanonical` against `userCanonical`. Add Search Console's Page indexing report counts for the sitemap (statuses such as "Crawled - currently not indexed" and "Discovered - currently not indexed", explained in `indexing`) and the Performance report for impressions per page (`gsc --dims page`).
4. **Continue** to the next batch (double it at most) only when: the gate passes, the sampled pages read well, most of the batch is indexed, and the pages earn impressions for their target queries.
5. **Pause and fix** when most pages in a batch sit in "Crawled - currently not indexed" after the wait, or indexed pages get no impressions. Look at the template and data, not at more pages. `cannibal` shows pages competing with each other.
6. **Stop and remove** when Search Console shows a manual action for spam, or you cannot give the facts-of-its-own answer for the remaining groups. Remove or merge the weak pages (301 to the best match, or 404 or 410 for pages with no match) rather than leaving them.
7. Measure the set against comparable pages you did not publish, with `measure-rollback`, before expanding further.

## Output to the user
1. Viability verdict per group, with the facts-of-its-own evidence (ten examples).
2. Gate result: pages, failures by rule, and what to fix in the template.
3. Human sample notes.
4. Batch plan: sizes, dates, what is checked, and the stop rules in plain words.

## Guardrails
- Never publish pages that failed the viability test, even if the gate passes.
- Do not describe the gate as a Google test, and do not promise indexing or immunity from a spam action.
- Do not use AI to produce page text from nothing but a keyword list. Page content needs a data source and a person reading it.
- Do not hide the scale (many sites, many subdomains) or publish third-party sections on someone else's authoritative domain to borrow its ranking.
- Do not invent statistics, quotes, reviews or sources to pass `unsourced`.
- Publish only on sites the user owns. Use `wordpress-publish` for drafts first.

## References
- `references/sources.md`: Google's spam policies and AI-content guidance with access dates, plus what was not verified.
