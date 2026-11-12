# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Search Console generative AI performance report: metric is impressions ("How often URLs from your site appeared in generative AI features in Search and Discover"); dimensions pages, countries, devices (Search only), dates (hourly to monthly); surfaces AI Overviews, AI Mode, Discover; announced 2026-06-03; "As of August 31, 2026, we've rolled out these insights to all websites worldwide"; the post does not mention clicks, queries, or an API or export | https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports (opened 2026-11-12) |
| Bing Webmaster Tools AI Performance (public preview): Total Citations, Average Cited Pages (daily average of unique pages cited), grounding queries (a sample), page-level citation activity, visibility trends; surfaces Microsoft Copilot, AI-generated summaries in Bing, select partner integrations; citation data shows how often content is referenced, not how important or highly ranked a page is; the post mentions neither clicks nor export | https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview (opened 2026-11-12) |
| Newer Bing features (Intents, Topics, Citation Share, Compare, Topics Portfolio) | `skills/ai-citations/references/sources.md` |
| Method for lift and intervals | `skills/measure-rollback/references/method.md` |
| GA4 AI-assistant sessions and regex | `skills/ga4-ai/references/sources.md` |
| Margins of error for tracker rates | `skills/ai-tracker/references/sources.md` |

## Tool behaviour (sitetiller 0.1.0, run 2026-11-12)
- `measure --changed-before 1000 --changed-after 1300 --control-before 5000 --control-after 5500 --json` returned `raw`, `trend`, `expected` (1100), `effect` (200), `lift` (0.1818). Example inputs, not real data.
- `brand` returns `branded`, `nonBranded` (each with `queries`, `clicks`, `impressions`, `ctr`, `avgPosition`), `brandedClickShare`, `gscRegex`.
- `fill-report.mjs` tested with a values file containing `<Oct>` in the title (output contained `&lt;Oct&gt;`) and with a row missing `source` (exit code 1, no file written).

## Not verified
- Export or API for Bing AI Performance or the Search Console generative AI report: neither post mentions one, so the skill says the numbers come from the user's screenshots or manual exports.
- Whether the Search Console AI impressions overlap with the Performance report's Web totals beyond what `skills/ai-citations/references/sources.md` records.
