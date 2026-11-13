# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Core Web Vitals are LCP, INP, CLS; good targets 2.5 s, 200 ms, 0.1; assessed at the 75th percentile, segmented by mobile and desktop; all three must be good; FID retired | https://web.dev/articles/vitals |
| LCP: good 2.5 s or less; poor over 4.0 s | https://web.dev/articles/lcp |
| INP: good 200 ms or less; poor over 500 ms; tracks clicks, taps and key presses, not scrolling, hovering or zooming | https://web.dev/articles/inp |
| CLS: good 0.1 or less; poor above 0.25; fixes (width and height or aspect-ratio, reserve ad and embed space, font-display optional, size-adjust, preload fonts, bfcache, transform animations) | https://web.dev/articles/optimize-cls |
| LCP subparts and ideal shares (TTFB about 40%, load delay under 10%, load duration about 40%, render delay under 10%); `fetchpriority="high"`; preload; never lazy-load the LCP image; CDN; avoid client-side rendering | https://web.dev/articles/optimize-lcp |
| INP phases (input delay, processing, presentation); yield; layout thrashing; DOM size; `content-visibility` | https://web.dev/articles/optimize-inp |
| Long task is any task over 50 ms; `scheduler.yield()` with fallback; `setTimeout`; `isInputPending()` no longer recommended | https://web.dev/articles/optimize-long-tasks |
| Field data is what to use to prioritise; lab data loads once under fixed conditions; TBT ignores tap delay | https://web.dev/articles/lab-and-field-data-differences |
| Google Search: CWV recommended; "aligns with what our core ranking systems seek to reward"; no boost or weight stated | https://developers.google.com/search/docs/appearance/core-web-vitals |
| CrUX API: POST `records:queryRecord`, `url` or `origin`, `formFactor` DESKTOP, PHONE or TABLET, p75 in `percentiles`, 28-day rolling window, updated daily about 04:00 UTC (best effort, no SLA), about two days behind, no redirect following, 150 queries per minute per project, free | https://developer.chrome.com/docs/crux/api |
| PSI API: "We plan to discontinue including real-world data from the Chrome User Experience Report in this API."; recommends the CrUX API or CrUX History API; no date | https://developers.google.com/speed/docs/insights/v5/get-started |
| PSI field data is CrUX (28-day); falls back to origin data; release notes through 2025-10-20 (Lighthouse 13.0) show no removal | https://developers.google.com/speed/docs/insights/v5/about and https://developers.google.com/speed/docs/insights/release_notes |
| CrUX History API: `queryHistoryRecord`, `collectionPeriodCount` 1-40 (default 25), p75s per weekly period, LCP image subpart metrics (time_to_first_byte, resource_load_delay, resource_load_duration, element_render_delay) | https://developer.chrome.com/docs/crux/history-api (checked 2026-11-13) |

## Tool behaviour
- `cwv` source (cli/lib/extras.mjs): calls the CrUX API with `url` or `origin`, `formFactor` (default PHONE), metrics `largest_contentful_paint`, `interaction_to_next_paint`, `cumulative_layout_shift`; rates p75 as good at or below 2500 / 200 / 0.1 and poor above 4000 / 500 / 0.25; returns `available: false` with a note when the API answers an error. Matches the web.dev thresholds above.
- Run without a key, `cwv` stops with "Set CRUX_API_KEY". It was not run against the live API during authoring (no key).

## Not verified
- The date PSI will stop returning field data: Google gives none. The skill says so.
- What the CrUX API returns exactly when no data exists (the page read does not describe a 404 response); the skill relies on the tool's `available: false` and note.
- Any ranking effect size of Core Web Vitals: Google states none.

## Added in v1.0 (checked 2026-11-13)

| Claim | Source |
|---|---|
| PageSpeed Insights API v5 runPagespeed: url, strategy, repeated category, key; lighthouseResult categories and audits | https://developers.google.com/speed/docs/insights/v5/get-started ; https://developers.google.com/speed/docs/insights/rest/v5/pagespeedapi/runpagespeed |
