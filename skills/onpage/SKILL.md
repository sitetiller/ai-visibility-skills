---
name: onpage
description: "Audit and fix the on-page elements of one URL: title element, meta description, H1 and heading outline, canonical, robots directives, internal links, image alt text, structured data and content depth. Reads what a crawler sees with the page, schema and cite commands, explains why Google may rewrite a title link (six causes from Google's own documentation) and what to change first. Use when the user says 'on-page SEO', 'optimize this page', 'audit this one page', 'why did Google change my title', 'page checklist', 'check my H1', 'is this page ready to publish'."
license: MIT
metadata:
  version: 0.1.0
---

# On-page: one URL, facts first

Goal: a short list of changes for one page, each tied to something observed in the page or to Google's documentation. No scores, no invented thresholds. Google publishes no length limit for titles or descriptions, so this skill reports lengths as facts and does not call a length "wrong".

## Inputs
- The URL, and the query the page should serve (from the user, or from `gsc --dims query,page`, see the `gsc-bing` skill).
- Permission to edit the page. Only suggest edits to pages the user owns.

## Steps
1. See what a crawler sees:
   ```bash
   npx sitetiller page https://example.com/guides/invoice-template --json
   ```
   Fields used: `status`, `chain`, `robotsTxtGooglebot.allowed`, `noindex`, `robotsMeta`, `xRobots`, `title`, `titleCount`, `description`, `descriptionCount`, `h1` (array), `headings` (`level`, `text`), `canonical`, `canonicalCount`, `ogTitle`, `lang`, `words`, `tables`, `images`, `imagesWithoutAlt`, `internalLinks`, `links` (`href`, `internal`, `anchor`), `schemaTypes`, `schemaBlocks` (`valid`).
2. Gate checks. If any fails, stop and fix it before touching copy:
   - `status` is 200 and `chain` has no extra hops; `robotsTxtGooglebot.allowed` is true; `noindex` is false.
   - `canonical` is empty or points to this URL (if it points elsewhere, see `canonicals`). `canonicalCount` above 1 is a bug.
   - `titleCount` is 1 and `descriptionCount` is 1.
3. Run the element checks in the table below.
4. Lint structured data and check quotability:
   ```bash
   npx sitetiller schema https://example.com/guides/invoice-template --json
   npx sitetiller cite https://example.com/guides/invoice-template --json
   ```
   `schema` returns `types` and `findings` (`level`, `type`, `message`). `cite` returns per-section `firstSentenceWords`, `numbers`, `hasList`, `hasTable`, `links` and a `summary` of shares. Treat `cite` as a reading aid, not a ranking factor. See the `schema` skill for which types to use.
5. Read the page text yourself. Counts cannot say whether the page answers the query. Apply the content questions in `references/checklist.md`.
6. Report, then (if the user agrees) make one change set per page and measure it with `measure-rollback`.

## Element checks
| Element | Observed in | What to check | Basis |
|---|---|---|---|
| Title | `title` | One title element. Descriptive and concise, distinct from other pages, not stuffed or boilerplate, brand at the start or end behind a delimiter, same language as the page | Google title link doc |
| Title vs H1 | `title`, `h1` | The H1 should state the same subject. Title and H1 saying different things is a rewrite risk | Google title link doc |
| Description | `description` | Unique, summarises the page accurately, can carry facts such as price, author or date, not a keyword list | Google snippet doc |
| H1 and outline | `h1`, `headings` | One clearly most prominent main title. No level jumps that hide structure; headings describe the section below them | Google title link doc (main title); structure is a readability check, not a Google rule |
| Canonical | `canonical` | Self-referential or a deliberate other URL; absolute URL | Google consolidate doc |
| Robots | `noindex`, `robotsMeta`, `xRobots` | Nothing blocks indexing unless intended | see the `indexing` skill |
| Internal links | `internalLinks`, `links` | Crawlable `<a href>`, descriptive anchors; the page itself is linked from at least one other page (see `internal-links`) | Google link doc |
| Images | `images`, `imagesWithoutAlt` | Informative images have alt text; alt text is also anchor text for image links | Google link doc |
| Schema | `schemaTypes`, `schemaBlocks[].valid` | Valid JSON, types fit the page, markup matches visible content | Google structured data docs |
| Depth | `words`, `tables`, `cite` summary | Compare to the pages that rank, never to a word target. Google lists "targeting a word count" as a warning sign | Google helpful content doc |

## Why Google may show a different title link
From Google's title link documentation, rewrites happen for these six page-level causes. Check each against `title`, `h1`, `headings`:
1. **Half-empty title:** part of the title text is missing (for example only a separator and brand).
2. **Obsolete title:** a recurring page keeps an old date or year while the visible title is newer.
3. **Inaccurate title:** the title does not reflect what the page is about.
4. **Micro-boilerplate:** several pages share one title and differ only by a small detail.
5. **No clear main title:** several large headings look equally important.
6. **Language or script mismatch:** the title uses a different language or writing system than the page.
The same page also names a seventh case for domain-level site names: Google may drop a repeated site name from the title link. Google builds title links from the title element, the main visible title, headings, `og:title`, other prominent text, anchor text, links pointing at the page and `WebSite` structured data. So the fix is usually to make the page consistent, not to rewrite only the title. Google says it can take days to weeks to notice changes.

To see what Google shows, search the exact query in a logged-out browser window and compare with `title`. Record the difference; do not infer a cause from one search.

## Output to the user
1. Gate checks: pass or the one blocking problem.
2. A table: element, current value (quoted), finding, proposed change, source. Lengths as plain numbers.
3. The top three changes by expected effect, ordered: blockers, title and H1 consistency, content gaps.
4. How to measure: snapshot with `measure-rollback`, change one thing, wait 14 to 28 days.

## Guardrails
- Do not state or enforce a title or description character limit. Google says there is none and that display is cut to fit the device width.
- Do not claim a change will raise rankings. Say what Google documents and what will be measured.
- Do not recommend FAQ or HowTo markup for rich results (see `schema`).
- Do not edit pages the user did not name.
- Do not copy a competitor's title or text. Use competitors to find gaps, not wording.

## References
- `references/checklist.md` (content questions from Google's helpful content guidance)
- `references/sources.md`
