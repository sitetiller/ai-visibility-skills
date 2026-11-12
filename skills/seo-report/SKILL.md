---
name: seo-report
description: "Build a monthly SEO and AI visibility report for a client or stakeholder from the JSON outputs of sitetiller commands: non-branded clicks first (brand split), changes shipped with their measured lift and 95% interval (measure-rollback), AI citations from the Bing Webmaster Tools AI Performance report and the Search Console generative AI report, and a short list of next actions. Includes a Markdown template and an optional self-contained HTML template (no external scripts) with a helper that refuses any row without a source file. Use when the user says 'monthly SEO report', 'client report', 'report for my boss', 'what did SEO do this month', 'SEO results summary', or 'show the results of our changes'."
license: MIT
metadata:
  version: 0.1.0
---

# Monthly SEO report

Goal: one page a client or manager can read in five minutes, where every number can be traced to a saved command output. The report leads with what SEO work can influence (non-branded clicks), shows each shipped change with its measured effect, reports AI citations as the vendors define them, and ends with next actions. Honest "unclear" results stay in the report.

## Inputs
- The month's date range and the previous equal-length range.
- Saved command outputs (`--json` or CSV) in one folder, named by what they are. If a number is not in a saved file, it does not go in the report.
- Brand terms for the split.
- Pages the user changed in the month, each with a `measure-rollback` result.
- For AI: the user's own screenshots or exports of the two first-party reports (below). No command reads them.

## Gather (run once, save the output)
```bash
npx sitetiller gsc example.com --start 2026-10-01 --end 2026-10-31 --dims query --out data/queries-oct.csv
npx sitetiller gsc example.com --start 2026-09-01 --end 2026-09-30 --dims query --out data/queries-sep.csv
npx sitetiller brand data/queries-oct.csv --terms "acme,acme.com" --json > data/brand-oct.json
npx sitetiller brand data/queries-sep.csv --terms "acme,acme.com" --json > data/brand-sep.json
npx sitetiller measure --daily data/pricing-title-clicks.csv --json > data/measure-pricing-title.json
npx sitetiller version list https://example.com/pricing --json > data/versions-pricing.json
npx sitetiller ga4-ai 123456789 --start 2026-10-01 --end 2026-10-31 --json > data/ga4-ai-oct.json
npx sitetiller engines example.com https://example.com/ --start 2026-10-01 --end 2026-10-31 --json > data/engines-oct.json
```
Use periods of equal length. Add `quick-wins` output for the next-actions section.

## Sections, in this order
1. **Summary** (3 to 5 lines): non-branded clicks this month versus last, the best and the worst shipped change, the AI line, and the one thing needed from the reader.
2. **Search, non-branded first.** From `brand`: `nonBranded.clicks`, `nonBranded.impressions`, `nonBranded.ctr`, `nonBranded.avgPosition`; then `branded.*` and `brandedClickShare`. Show change as `(this - last) / last` with both inputs printed. If non-branded clicks fell while branded rose, say it. Do not hide a decline inside a total.
3. **Changes shipped and measured.** One row per change from `version list` (date, label) and the matching `measure` output: `lift`, the 95% interval, `verdict` (`win`, `loss`, `unclear`). Report `unclear` as unclear. If a change has no control group, write "not measured" rather than quoting the raw before-after.
4. **AI citations.** Four separate sources, never summed:
   - Bing Webmaster Tools AI Performance (Bing's post: Total Citations, Average Cited Pages, grounding queries as a sample, page-level citation activity). Bing says citation data shows how often content is referenced, not how important or highly ranked a page is.
   - Search Console generative AI performance report: impressions of URLs in AI Overviews, AI Mode and Discover, by page, country, device and date. Google's post lists no clicks or query data for it.
   - GA4 sessions from assistants (`ga4-ai`): real visits.
   - The tracker (`ai-tracker`), if run: rates with intervals, as a sample of API answers.
   Record each as a screenshot or export file in `data/` and cite that file in the row. Say plainly that these are different measures.
5. **Next actions** (max 5): from `quick-wins`, each with owner and effort.
6. **What this report does not cover**: for example no revenue attribution, no backlinks, Search Console export limits, AI reports with no API.

## Traceability rule
Every number in the report carries a `source`: the file in `data/` and the field (`brand-oct.json: nonBranded.clicks`). Before sending, pick five numbers at random and check them against the files. A number that has no file is removed.

## Templates
- Markdown: `references/monthly-template.md`. Copy it and fill the fields.
- HTML (optional, one self-contained file, inline CSS, no scripts, works offline and in print): write a values file following `references/monthly-template.md` (section "Values file for the HTML helper") and run
  ```bash
  node skills/seo-report/references/fill-report.mjs values.json report.html
  ```
  The helper reads those two files and `references/report-template.html`, escapes every value, and exits with an error if any search, version or AI row lacks `source`. It uses no network and no shell.

## Output to the user
The report file (Markdown or HTML), the `data/` folder it was built from, and a list of numbers the user should double-check because they came from screenshots rather than commands.

## Guardrails
- Do not report a number without a source file. Do not round up, estimate, or fill gaps.
- Do not call a result a win unless `measure` returned `verdict: win` (interval above zero).
- Do not present AI citations as rankings, traffic or share of voice. State each vendor's definition next to its number.
- Do not add third-party "visibility scores", traffic estimates or keyword volumes.
- Do not include personal data or customer lists. Search queries can contain personal data; summarise, do not paste the raw table.
- Do not share a report that contains API keys, property IDs the client has not approved sharing, or file paths from the user's machine.

## References
- `references/monthly-template.md`: Markdown template and the values-file format.
- `references/report-template.html`, `references/fill-report.mjs`: optional HTML output.
- `references/sources.md`: vendor definitions behind the AI section.
