---
name: titles-meta
description: "Rewrite page titles and meta descriptions using your own Search Console data. Finds under-clicked queries with your own CTR curve (ctr), ranks positions 4-20 with real impressions (striking), checks the live title and description (page), applies Google's title link and snippet guidance, supplies templates, and measures each rewrite against untouched control pages with measure-rollback. Use when the user says 'improve CTR', 'rewrite my titles', 'meta descriptions', 'low click-through', 'title tag test', 'pages with impressions but no clicks', 'striking distance'."
license: MIT
metadata:
  version: 0.1.0
---

# Titles and descriptions from query data

Goal: pick the pages where a better title or description can earn clicks the page already has impressions for, rewrite them with Google's documented guidance, and measure the result. Google's traffic-drop guidance says that when only clicks fall while impressions hold, improve titles and snippets; if impressions fell too, the cause is elsewhere (see `content-decay`).

## Inputs
- Search Console data for at least 28 days, same date range for every file: the API (`gsc`, see `gsc-bing`) or the Performance report exports.
- Pages the user owns and may edit.

## Steps
1. Get data:
   ```bash
   npx sitetiller gsc example.com --start 2026-08-12 --end 2026-11-09 --dims page --out pages.csv
   npx sitetiller gsc example.com --start 2026-08-12 --end 2026-11-09 --dims query --out queries.csv
   npx sitetiller gsc example.com --start 2026-08-12 --end 2026-11-09 --dims query,page --out query-page.csv
   ```
2. Build your own CTR curve and find under-clicked rows:
   ```bash
   npx sitetiller ctr pages.csv --json
   ```
   Output: `curve` (position 1-10 mapped to `{ctr, rows}`: the median CTR of rows with at least 50 impressions, kept only for positions with at least 3 rows) and `lowCtr` (rows with at least 100 impressions whose CTR is below 60% of your median at their position, with `expectedCtr` and `missedClicks`). This is your site's curve, not an industry average. If a position is missing from `curve`, do not fill it in from memory.
3. Add striking-distance rows (positions 4-20, at least 100 impressions):
   ```bash
   npx sitetiller striking queries.csv --json
   ```
   Output per row: `query`, `clicks`, `impressions`, `ctr`, `position`, `opportunity`. For these, a title change rarely moves position; content and links matter more (see `onpage`, `internal-links`).
4. For each candidate page, list its top queries from `query-page.csv` and read the live elements:
   ```bash
   npx sitetiller page https://example.com/guides/invoice-template --json
   ```
   Use `title`, `description`, `h1`. Search the top query in a logged-out window and note the title and snippet Google actually shows. If the title differs from yours, check the six rewrite causes in the `onpage` skill first: a rewritten title link usually means the page is inconsistent, so fix the page, not only the tag.
5. Write the new title and description with the rules and templates below. Give two options per page and say what each tests.
6. Measure (below). Change one thing per page per window.

## Rules from Google's documentation
- Titles: descriptive and concise; distinct on every page; no repeated words or keyword stuffing; brand at the start or end behind a delimiter; same language as the page; the first visible H1 should agree. No length limit exists; display is cut to fit the device width, so put the distinguishing words first.
- Descriptions: unique per page; summarise the page accurately and specifically; may include facts such as author, date or price; no keyword lists. Google may build the snippet from page text instead, and can show different snippets per query.

## Templates
Fill every slot with something true on the page. If a slot has nothing true, drop it.
| Page type | Title | Description |
|---|---|---|
| How-to / guide | `{Task} {object}: {method or number of steps}` | `{What the reader gets}. {One specific fact, example or number from the page}. {Who wrote or tested it, or date}.` |
| Template / tool | `Free {thing} {format}: {what it does}` | `{What it produces} in {time or steps}. {Formats, limits, price if any}.` |
| Comparison | `{A} vs {B}: {the deciding difference}` | `{Who each one fits}. Compared on {criteria}, checked {date}. {Disclosure if you are one of them}.` |
| Pricing / product | `{Product} pricing: {plans and price range}` | `{Plans, free tier or trial terms}. Prices checked {date}.` |
| Data / research | `{Metric}: {headline finding}` | `{Method in 10 words}. {Sample size}. {Date range}.` |
Brand suffix: ` | Brand` when the brand adds trust; omit it where space matters.
Put a year or date in a title only if the page is updated on a schedule: Google lists obsolete dates as a rewrite cause.

## Measure each rewrite
Use the `measure-rollback` skill: snapshot before, change, snapshot after, choose control pages of the same type and similar position that you do not touch, wait 14 to 28 days, then:
```bash
npx sitetiller measure --daily clicks.csv --json
```
Judge a title change on clicks and CTR at stable impressions and position. Do not read a result from a few days of data.

## Output to the user
1. Table: page, top query, position, impressions, CTR, your median CTR at that position, missed clicks (from `ctr`).
2. Per page: current title and description (quoted), what Google shows if different, two rewrites, the hypothesis each tests.
3. Control pages chosen and the measurement window.

## Guardrails
- `missedClicks` is an estimate from your own median, not a forecast. Do not promise a CTR lift.
- Do not promise Google will use your title or description.
- Split branded and non-branded queries first (`npx sitetiller brand queries.csv --terms yourbrand`); brand queries distort the curve.
- Change only titles and descriptions in the window, or the measurement is void.
- Edit only pages the user owns and named.

## References
- `references/sources.md`
