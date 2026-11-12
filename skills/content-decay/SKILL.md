---
name: content-decay
description: "Find pages that lost clicks between two periods, work out the likely reason (lost rankings, less demand, lower CTR, page gone from the report), cross-check the drop dates against the Google Search Status Dashboard, and refresh only what needs it. Uses the decay command on two Search Console Pages exports. Use when the user says 'content decay', 'traffic drop', 'pages losing traffic', 'which pages to refresh', 'did the core update hit me', 'update old posts', 'content refresh'."
license: MIT
metadata:
  version: 0.1.0
---

# Content decay: diagnose before refreshing

Goal: separate pages that really decayed from pages hit by seasonality, tracking gaps, technical faults or a ranking update, then refresh the first group with real changes. Google warns against refreshing for its own sake: changing dates to seem fresh, or adding and removing content mainly to seem fresh, appear in its list of warning signs.

## Inputs
- Two Search Console Pages exports with equal-length windows, for example the last 90 days and the 90 days before. Compare the same weekdays and avoid mixing a holiday period with a normal one. Use the API: `gsc --dims page --out before.csv` (see `gsc-bing`).
- Pages the user owns.

## Steps
1. Export both periods:
   ```bash
   npx sitetiller gsc example.com --start 2026-05-14 --end 2026-08-11 --dims page --out before.csv
   npx sitetiller gsc example.com --start 2026-08-12 --end 2026-11-09 --dims page --out after.csv
   ```
2. Find decaying pages:
   ```bash
   npx sitetiller decay before.csv after.csv --min-clicks 20 --drop 30 --json
   ```
   Output per page: `url`, `clicksBefore`, `clicksAfter`, `impressionsBefore`, `impressionsAfter`, `positionBefore`, `positionAfter`, `change` (fraction, -0.6 is a 60% fall), `reason`, sorted by clicks lost. Defaults: pages with at least 20 clicks before and a fall of at least 30%. These are tool defaults, not Google thresholds; change them to the site's size.
3. Read `reason` as a pointer, not a verdict:
   | `reason` | Meaning | First check |
   |---|---|---|
   | lost rankings | impressions fell over 20% and position worsened by more than 1 | what changed on the page; do competitors now answer better; `page` for noindex or canonical changes |
   | less demand at a similar position | impressions fell over 20%, position held | interest fell or season ended; compare year over year and in Google Trends |
   | lower CTR at similar impressions | CTR fell over 20% | title or snippet changed, new SERP features, or a competitor result; see `titles-meta` |
   | gone from report | no rows in the later export | not indexed, redirected, renamed, or under the export row limit; run `inspect` (see `indexing`) |
   | mixed | none of the above clearly | inspect manually |
4. Rule out non-content causes first (from Google's traffic-drop guidance): server or robots.txt problems, 404s, a stray noindex, security issues, manual actions, site moves, reporting glitches (Search Console Data Anomalies page). If many pages dropped on one date, suspect a site-wide cause.
5. Cross-check dates against the Google Search Status Dashboard, https://status.search.google.com/summary. It lists ranking updates (core, spam) with start dates and durations, and incidents. Daily clicks for the dropped pages (Search Console, filtered by page) show where the fall began. If it began within the update's run, say "coincides with"; never say "caused by". Google's guidance for a core-update drop is a site-wide review of whether content is helpful and reliable, and it says not to make radical changes to pages that perform well after a small dip. Read the dashboard live; dates in this skill are not copied.
6. Refresh pages whose cause is content (checklist below), one change set per page, with `measure-rollback` snapshots before and after.
7. Pages not worth refreshing: no impressions left for any wanted query, outdated product or feature, or duplicates of stronger pages. Consider merging or removing (`cannibalization`). Use 404/410 only for pages with no replacement; use a 301 to a close equivalent when one exists.

## Refresh checklist
- Facts: every number, price, screenshot and name checked against a current source; each carries a date.
- Intent: search the main query, compare what now ranks (format, angle, questions answered); add what is missing.
- Original value: add something new (own data, test, example). Rewording alone is not a refresh.
- Title and description reflect the current page (`titles-meta`); remove obsolete years.
- Links: fix broken links, add internal links from newer pages (`internal-links`).
- `dateModified` and visible "updated" date change only when the substance changed.
- Schema still valid and matching the page (`schema`).

## Output to the user
1. Table: page, clicks before and after, change, reason, drop start date, overlapping Google update (or none), cause class (technical, demand, ranking, CTR, unknown).
2. The refresh list ordered by clicks lost and recoverability; the leave-alone list with reasons.
3. How each refresh is measured and when.

## Guardrails
- Do not say an update "hit" the site from date overlap alone.
- Do not bump dates or republish without substantive changes.
- Do not compare windows of different length or across holidays without saying so.
- Do not delete or redirect pages without the user's agreement.
- Refresh only pages the user owns and named.

## References
- `references/sources.md`
