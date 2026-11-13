---
name: sxo
description: "Search experience optimisation: check whether a page is the kind of page searchers want for its query. From a results page the user pastes (titles, URLs, snippets, features), classify the dominant page type (guide, list, comparison, product or category page, tool, template, video, forum thread, local result), the format and angle, and what the searcher is about to do; compare with the user's page and say whether to adapt, create a different page or target another query. Use when the user asks 'why does my page not rank although it is better', 'search intent', 'SERP intent', 'wrong page type', 'what kind of content ranks for X', 'SXO', or 'should this be a landing page or a blog post'."
license: MIT
metadata:
  version: 0.2.0
---

# SXO: match the page type to the search

Goal: stop optimising a page that is the wrong kind of page. If the top results for a query are free tools and the user's page is an essay, more words will not fix it.

## Inputs
- The query and country.
- The results page, pasted by the user (top 10: title, URL, snippet, plus visible features such as AI Overview, videos, "Discussions and forums", shopping, map pack). This skill does not scrape search results; Google's terms do not allow automated queries.
- The user's page URL.

## Steps
1. Classify each result. Make a table: position, domain, page type, format, angle, freshness.
   - Page types: guide/tutorial, listicle, comparison or "X vs Y", product page, category page, tool or calculator, template or example, video, forum or community thread, news, local result, official documentation.
   - Format: long article, short answer, table, step list, interactive.
   - Angle: beginner, expert, cheapest, fastest, year-specific, for a role or industry.
2. Find the dominant pattern: the type and angle held by at least 6 of 10 results. If no type has 4 or more, intent is mixed; say so.
3. Read the user's page (`npx sitetiller page <url> --json` for the facts; read the text yourself) and classify it the same way.
4. Name the job the searcher wants done next (learn, compare, pick, buy, calculate, fix, find a place). The page should let them do it without another search.
5. Decide:
   | Situation | Action |
   |---|---|
   | Same type and angle, page still below | Not an SXO problem: go to `content-brief`, `content-quality`, `internal-links`, `backlinks` |
   | Different type (essay vs tools ranking) | Build the right type as a new page and link to it from the old one; keep the old page if it serves another query |
   | Same type, different angle | Adapt the angle in title, intro and structure (`titles-meta`), measure with `measure-rollback` |
   | Mixed intent | Cover the dominant job first, with clear sections for the second |
   | Forums/videos dominate | Firsthand experience wins: add real examples, screenshots, a video, or answer in those places honestly |
6. Check the user's own data: `npx sitetiller gsc example.com --start ... --end ... --dims query,page --json` shows which queries the page already gets impressions for. A page often ranks for a different intent than intended; follow the data.

## Output to the user
1. The results table and the dominant type, format and angle (or "mixed").
2. The user's page classified the same way and the mismatch in one sentence.
3. The decision from the table above and the first three concrete changes.

## Guardrails
- Do not run automated queries against Google or other search engines; work from what the user pastes or exports.
- Results vary by location, device and person; note the country and date of the pasted results.
- Do not copy competitors' text or structure verbatim; match the job, not the wording.
- Do not promise a ranking change from a page-type change; measure it.

## References
- `references/sources.md`: Google guidance on helpful content, titles and search features, checked 2026-11-13.
