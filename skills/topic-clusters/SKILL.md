---
name: topic-clusters
description: "Group Search Console queries into topics, map each topic to the pages that serve it, and decide the hub and spoke structure: which pages to create, which to merge, which to leave. Uses a Search Console query+page export, a deterministic grouping helper, and the cannibal and links commands. Use when the user says 'topic clusters', 'content cluster', 'pillar page', 'hub and spoke', 'what pages should I write next', 'group my keywords', 'content map', 'site structure for SEO'."
license: MIT
metadata:
  version: 0.1.0
---

# Topic clusters from the site's own queries

Goal: a content map built from queries the site already receives, with a decision per topic: write, extend, merge or leave. Google documents no "topic cluster" ranking feature. The structure is a way to organise pages and internal links for readers and crawlers, and the skill presents it that way.

## Inputs
- Search Console query+page rows for 90 days or more (`gsc --dims query,page --out qp.csv`, see `gsc-bing`), or a user export with columns Query, Page, Clicks, Impressions, CTR, Position.
- The site's sitemap (for `links`).

## Steps
1. Export:
   ```bash
   npx sitetiller gsc example.com --start 2026-08-12 --end 2026-11-09 --dims query,page --out qp.csv
   ```
   The API returns at most 50K rows per day per search type and may drop rows when grouping by query and page, so small queries can be missing. Say so in the report.
2. Draft the groups with the helper (offline, reads the CSV as data, no shell, no network):
   ```bash
   node skills/topic-clusters/references/cluster-queries.mjs qp.csv --min-imp 10 --json
   ```
   Each cluster has `label`, `queries`, `impressions`, `clicks`, `avgPosition`, `pages` (which URLs got impressions for the cluster) and `topQueries`. The helper joins queries that share two words (or one word when both are short). It does not understand meaning. Read each cluster and split or merge by hand; record the final names.
3. For each cluster, classify:
   | Pattern in the data | Reading | Decision |
   |---|---|---|
   | One page holds most impressions, positions 1-3 | topic is served | leave; link supporting pages to it |
   | One page, positions 4-20, many queries | page is relevant but not strong | extend that page, add internal links (`internal-links`) |
   | Several pages share the cluster's queries | overlap | run `cannibalization` before creating anything |
   | Queries with real impressions, no page contains the words | gap | create a spoke page from a brief (`content-brief`) |
   | Many tiny queries across many weak pages on one subtopic | fragmentation | merge into one stronger page, redirect the rest (`cannibalization`) |
4. Choose the structure per large topic:
   - **Hub:** one page that covers the topic broadly, answers the main query, and links to each spoke with descriptive anchors.
   - **Spokes:** pages for specific sub-questions with their own query set, each linking back to the hub and to one or two sibling spokes where a reader would go next.
   - Keep to what the data supports: a hub needs at least a few real spoke queries, not a list of invented subtopics.
5. Check the current link state:
   ```bash
   npx sitetiller links https://example.com --pages 100 --json
   ```
   Fields: `orphans`, `weak` (each with `url`, `linkedFrom`, `anchors`). Orphans and weak pages in a cluster go first. Details in `internal-links`.
6. Produce the content map (below) and queue the work: briefs for gaps, merges for fragments, link edits for weak pages.

## Content map format
| Topic | Queries / impressions | Current pages | Hub | Spokes to create | Merge | Links to add |
|---|---|---|---|---|---|---|
Fill each cell from the data. "Spokes to create" lists real query strings from the export, never invented ones.

## Output to the user
1. The content map and the top five actions by impressions affected.
2. What the data cannot show (queries dropped by export limits, topics with no impressions yet). For topics with no data, say a brief needs the live results page from the user.
3. How each action will be measured (`measure-rollback`).

## Guardrails
- Do not present clusters as a ranking factor. Google documents none; the benefit claimed is organisation, links and coverage.
- Do not create pages for queries that have no impressions and no user evidence.
- Do not mass-generate spoke pages from a keyword list. Google's spam policies name scaled content abuse: many pages made mainly to rank, with unoriginal content.
- Do not merge or redirect pages without the `cannibalization` checks and the user's agreement.
- Only restructure pages the user owns.

## References
- `references/cluster-queries.mjs` (offline helper)
- `references/sources.md`
