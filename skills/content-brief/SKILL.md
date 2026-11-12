---
name: content-brief
description: "Build a brief for a new page from real data: Search Console queries for the topic (gsc --dims query,page), the live results page the user pastes in, and quotability signals of the competing pages (cite). Produces intent, must-answer questions, an information-gain plan from Google's helpful content guidance, outline, internal links and a measurement plan, with no invented search volumes. Use when the user says 'content brief', 'write a brief for', 'what should this page cover', 'new article outline', 'SERP analysis', 'what are competitors doing'."
license: MIT
metadata:
  version: 0.1.0
---

# Content brief from evidence

Goal: a brief a writer can follow, where every requirement traces to a query the site already gets, a result the user observed, or a line in Google's guidance. Search volume is never invented. Search Console shows impressions for the user's own site, and that is the only demand number used. If the user has a third-party volume figure, they supply it and the brief labels it with its source.

## Inputs
- The topic, and Search Console access (see `gsc-bing`) or a Queries/Pages export.
- The live results page for the main query, pasted by the user with the date: titles, URLs, features seen (AI overview, video, forum threads). The CLI does not scrape Google results and this skill does not either.
- Whether the page is new or replaces an existing one (run `cannibalization` first).

## Steps
1. Pull the site's own data, 90 days if available:
   ```bash
   npx sitetiller gsc example.com --start 2026-08-12 --end 2026-11-09 --dims query,page --out qp.csv
   npx sitetiller gsc example.com --start 2026-08-12 --end 2026-11-09 --dims query --out queries.csv
   ```
   Filter rows to the topic by text match and group them by meaning (`topic-clusters`). Note which page each query lands on today and at what position. Related queries at positions 4-20 show relevance the site already has:
   ```bash
   npx sitetiller striking queries.csv --json
   ```
2. If an existing page already receives these queries, decide with `cannibalization` whether to extend it instead of creating a new one.
3. For each competing page the user listed:
   ```bash
   npx sitetiller page https://competitor.example/post --json
   npx sitetiller cite https://competitor.example/post --json
   ```
   From `page`: `title`, `h1`, `headings`, `words`, `tables`, `schemaTypes`. From `cite`: per-section `heading`, `numbers`, `hasTable`, `hasList`, `links`, and the `summary` shares (answer-first, specific, structured, sourced). Then read the text and record what the page does not answer.
4. Write the intent in one sentence from query wording, not from guesses: "template" wants a file, "vs" wants a decision, "how to" wants steps.
5. Fill the brief (format below). The information-gain section is mandatory.
6. Add internal links in both directions (`internal-links`) and the measurement plan (`measure-rollback`).

## Information-gain checklist
From Google's helpful content guidance. A page with none of these restates what Google already shows:
- Original information, reporting, research or analysis: own data, a test, a benchmark, a survey, screenshots, a worked example with real numbers.
- Insight beyond the obvious: a decision rule, a pitfall, a counter-example.
- Value over the sources it draws on. If it summarises others, say what is added.
- First-hand experience where the topic calls for it, with author and background shown.
- A complete answer: the reader does not need to search again.
- Honest dates: no refresh without substantive change; no word-count target.
For each item the brief names the asset, who creates it and where it sits on the page.

## Brief format
1. **Target:** main query and the 3-8 closest queries from the site's data, each with impressions and position.
2. **Intent:** one sentence, and the page type (guide, template, comparison, tool, data).
3. **Reader and next step.**
4. **Must answer:** questions from the queries and from gaps in competing pages, each tagged `query` or `gap`.
5. **Information gain:** the assets above.
6. **Outline:** headings phrased as the questions answered, answer first in each section.
7. **Evidence and sources:** each fact to be used with a source, or "to be tested".
8. **Elements:** title and description options (`titles-meta`), schema types (`schema`), tables or tools.
9. **Links:** pages to link to, pages that should link in.
10. **Measure:** publish date, queries to watch, window of at least 28 days.

## Output to the user
The filled brief and a short list of unknowns, such as "no data for query X; volume not assumed".

## Guardrails
- Never invent search volume, difficulty or traffic forecasts.
- Do not copy competitor wording or structure. Use them to find gaps.
- Do not set a word count. Set the questions to be answered.
- Do not brief a second page for a query another page of the same site already ranks for before checking `cannibalization`.
- Content created from the brief must have a person accountable for its facts; Google lists mass-produced, lightly cared-for pages as a quality warning sign.

## References
- `references/sources.md`
