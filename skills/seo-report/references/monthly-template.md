# {Client}: SEO report, {Month YYYY}

Period: {start} to {end}. Compared with: {previous start} to {previous end} (same length).
Prepared {date}. Data sources: files in `data/` (each row names its file).

## Summary
- Non-branded clicks: {this} vs {last} ({change%}) [data/brand-{month}.json: nonBranded.clicks]
- Best change shipped: {page}, {lift} (95% interval {low} to {high}), verdict {verdict}
- Worst or unclear change: {page}, verdict {verdict}
- AI: {one line, with the vendor's own metric name}
- Needed from you: {one decision or access}

## Search (non-branded first)
| Metric | This month | Last month | Change | Source |
|---|---|---|---|---|
| Non-branded clicks | | | | brand-*.json: nonBranded.clicks |
| Non-branded impressions | | | | brand-*.json: nonBranded.impressions |
| Non-branded CTR | | | | brand-*.json: nonBranded.ctr |
| Non-branded average position | | | | brand-*.json: nonBranded.avgPosition |
| Branded clicks | | | | brand-*.json: branded.clicks |
| Branded share of clicks | | | | brand-*.json: brandedClickShare |

Change = (this - last) / last. Branded queries come from people who already know the brand; they are shown second on purpose.

## Changes shipped and measured
| Date | Page | Change | Window | Lift | 95% interval | Verdict | Source |
|---|---|---|---|---|---|---|---|
| | | | | | | win / loss / unclear / not measured | measure-*.json |

Method: expected clicks = changed-before x (control-after / control-before); lift = actual / expected - 1; bootstrap interval over days (see `measure-rollback`). Rolled back: {pages or none}.

## AI citations
These measures are different things and are not added together.
| Measure | Value | What it means (vendor's definition) | Source |
|---|---|---|---|
| Bing AI Performance: Total Citations | | Sources displayed in AI-generated answers in the period; not a ranking | screenshot or export file |
| Bing AI Performance: Average Cited Pages | | Daily average of unique pages cited | same |
| Search Console generative AI report: impressions | | How often URLs from the site appeared in generative AI features in Search and Discover | screenshot or export file |
| GA4 sessions from AI assistants | | Visits that arrived from assistants | ga4-ai-*.json |
| Tracker (optional) | mention rate x% (95% range a to b), n answers | Sample of API answers to a fixed prompt set | .sitetiller/track/*.jsonl |

## Next actions
| # | Action | Why (evidence) | Effort | Owner | Due |
|---|---|---|---|---|---|

## What this report does not cover
- {for example: revenue attribution, backlinks; the Bing and Search Console AI reports have no API here, so those numbers come from screenshots}

## Values file for the HTML helper
`fill-report.mjs` reads a JSON file with these keys. Every row in `search`, `versions` and `ai` needs a `source`.
```json
{
  "title": "Client: SEO report, October 2026",
  "subtitle": "2026-10-01 to 2026-10-31 compared with 2026-09-01 to 2026-09-30",
  "summary": ["Non-branded clicks: 423 vs 380"],
  "search": [{ "metric": "Non-branded clicks", "value": "423", "compare": "380 last month", "source": "data/brand-oct.json: nonBranded.clicks" }],
  "versions": [{ "page": "/pricing", "change": "Title names the price", "lift": "+18% (95%: +2% to +33%)", "verdict": "win", "source": "data/measure-pricing-title.json" }],
  "ai": [{ "metric": "Bing Total Citations", "value": "41", "note": "Citations, not rankings", "source": "data/bing-ai-performance-oct.png" }],
  "actions": [{ "action": "Rewrite 5 titles", "why": "ctr: missedClicks", "effort": "S", "owner": "Agency" }],
  "limits": ["The AI reports have no API here; numbers come from screenshots."]
}
```
The values above are placeholders for the format, not results.
