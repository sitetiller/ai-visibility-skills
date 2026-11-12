---
name: cannibalization
description: "Find queries where two or more of your own URLs compete in Google results, decide per case whether to merge, differentiate or leave them alone, and merge with permanent 301 redirects the way Google's redirect and consolidation documentation describes. Uses the cannibal command on a Search Console query+page export. Use when the user says 'keyword cannibalization', 'two pages ranking for the same query', 'which page should rank', 'merge pages', 'consolidate duplicate content', 'my rankings flip between pages'."
license: MIT
metadata:
  version: 0.1.0
---

# Cannibalization: evidence, then a decision

Google documents no "keyword cannibalization" penalty. What the data shows is several of your URLs getting impressions for one query. Sometimes that is harmless (two different results both shown), sometimes it splits links and signals across near-duplicate pages. The skill separates the two cases with data and intent, then picks the lightest action.

## Inputs
- A query+page export for 90 days or more (`gsc --dims query,page --out qp.csv`, see `gsc-bing`). Positions and impressions are needed, not only clicks.
- The user's list of pages that may be edited or redirected.

## Steps
1. Export, then find overlaps:
   ```bash
   npx sitetiller gsc example.com --start 2026-08-12 --end 2026-11-09 --dims query,page --out qp.csv
   npx sitetiller cannibal qp.csv --min-imp 50 --json
   ```
   Output: an array of `{query, impressions, urls: [{page, impressions, share, clicks, position}]}`. A query is listed when the second URL holds at least 20% of the query's impressions (rows under `--min-imp` impressions are ignored). Sorted by total impressions. Averages over the period can hide that the pages alternate by day; position here is the period average from Search Console.
2. Drop false positives before deciding:
   - Same page under URL variants (parameters, trailing slash, http/https): that is a canonical problem; see `canonicals`.
   - Brand queries where the home page and a product page both appear: usually fine.
   - Different intents: a "what is" guide and a "pricing" page matching one broad query.
3. For each remaining query, read both pages:
   ```bash
   npx sitetiller page https://example.com/invoice-template --json
   npx sitetiller page https://example.com/invoice-template-word --json
   ```
   Compare `title`, `h1`, `headings`, `words`, `canonical`. Answer: do they serve the same intent, in the same format, for the same reader?
4. Decide with the table.

| Situation | Decision | Action |
|---|---|---|
| Same intent, near-duplicate content, one clearly stronger (more clicks, better position) | **Merge** | Move any unique, useful content to the stronger page, then 301 the weaker URL to it. Update internal links to the target |
| Same intent, both weak, similar | **Merge** | Combine into the page with the better URL and links; 301 the other |
| Different intents on one broad query (guide vs product, free vs paid) | **Differentiate** | Sharpen each page's title, H1 and opening to its own intent; link the guide to the product page with a descriptive anchor; do not merge |
| Both pages rank in the top results and both get clicks | **Leave** | Monitor; occupying two spots is not a defect |
| Duplicate must stay accessible (print version, campaign URL, parameter) | **Canonical** | `rel="canonical"` to the main URL, see `canonicals` |
| Page has traffic from other queries the target will not serve | **Do not merge** | Differentiate instead |

5. Merge safely (only for pages the user owns and approved):
   - Use a permanent server-side redirect (HTTP 301 or 308) from the old URL to the new one. Google says server-side redirects are the most reliable and recommended option, and that permanent redirects signal the target should be canonical. Instant meta refresh and JavaScript redirects are weaker; JavaScript is a last resort.
   - Redirect to the closest equivalent page, not to the home page.
   - Do not use `noindex` to pick a winner inside the site; Google says to use redirects or `rel="canonical"` instead.
   - Update internal links and the sitemap to the target; remove the old URL from the sitemap. See `redirects-migration` for checking the map.
   - Do not chain redirects.
6. Measure with `measure-rollback`: snapshot both pages, apply the change, then compare the combined clicks of the merged group against control pages over 28 days. For a merge, sum clicks of old and new URLs for both periods. If the combined result loses, restore the old pages from the stored versions.

## Output to the user
1. Table per overlap: query, URLs with impression share, positions, intent read, decision, reason.
2. The redirect map (old, new, status) for merges, and the link edits.
3. What was left alone and why.
4. Measurement plan and the combined-clicks baseline.

## Guardrails
- Do not call impressions-sharing a penalty. Say what the data shows.
- Do not merge pages with different intents to "concentrate" signals.
- Do not use noindex or robots.txt to resolve overlap; robots.txt can leave blocked URLs indexed without content, per Google.
- Redirect only URLs the user owns and approved, to a relevant target. Never redirect to unrelated pages to pass traffic.
- Do not trust a single period: re-check with the 90-day window before merging.

## References
- `references/sources.md`
