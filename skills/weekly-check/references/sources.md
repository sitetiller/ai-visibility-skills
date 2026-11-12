# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| URL Inspection fields: `verdict` PASS / PARTIAL (reserved, unused) / FAIL / NEUTRAL; `robotsTxtState` ALLOWED / DISALLOWED; `indexingState` INDEXING_ALLOWED / BLOCKED_BY_META_TAG / BLOCKED_BY_HTTP_HEADER; `pageFetchState` SUCCESSFUL, SOFT_404, NOT_FOUND, SERVER_ERROR and others; `lastCrawlTime` absent if never crawled; `googleCanonical` absent if not indexed; `userCanonical` absent if none declared | https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult (opened 2026-11-12) |
| The newest Performance report data can be preliminary: "still being collected and might change in the next few hours" | https://support.google.com/webmasters/answer/7576553 (opened 2026-11-12) |
| Google Search Status Dashboard lists ranking updates and incidents with start dates | https://status.search.google.com/summary (as recorded in `skills/content-decay/references/sources.md`) |
| robots.txt: 4xx on robots.txt means no rules; 5xx pauses crawling; a block hides a page's `noindex` | `skills/tech-audit/references/sources.md`, `skills/ai-crawlers/references/sources.md` |
| Bing AI Performance and Search Console generative AI performance report: what they show, and that the CLI does not read them | `skills/ai-citations/references/sources.md` |
| Verified bot hits need the owner's published IP ranges | `skills/ai-logs/references/sources.md` |
| Weekly AI tracker comparison with intervals | `skills/ai-tracker/references/sources.md` |

## Tool behaviour (sitetiller 0.1.0, read-only runs on 2026-11-12 against wordpress.org)
- `crawlers wordpress.org --json` returned `host`, `path`, `url`, `status: 200`, `found: true`, `sitemaps[]` (nine sitemap URLs), `problems: []`, `bots[]` with `agent`, `owner`, `purpose`, `allowed`.
- `sitemap wordpress.org --sample 2 --json` returned `kind: "index"`, `inRobots: true`, `robotsSitemaps[]`, `lastmod` (a count), `children[]` with `url`, `status`, `urls`.
- `wp owned` on a folder with no ledger returned `{"wordpress": []}`.
- `version list <url>` returned `[]` where no snapshot existed; `version drift` says "No stored version yet" in that case.

## Not verified
- The two-standard-deviation soft-alert rule is this skill's own convention, not from Google or any study. It is labelled as such in the skill.
- Time budgets per step are estimates for a small site (about 10 key pages), not measured.
- `inspect`, `gsc`, `bing`, `engines`, `ga4-ai` need the user's credentials and were not run live during authoring; fields come from the CLI source and Google's reference.
