---
name: core-web-vitals
description: "Measure and improve Core Web Vitals (LCP, INP, CLS) from real-user field data using the Chrome UX Report: p75 values for phone and desktop, page versus origin fallback, good / needs improvement / poor thresholds from web.dev, and what to fix for each failing metric (LCP subparts, long tasks and input delay, layout shifts). Use when the user asks 'Core Web Vitals', 'LCP too slow', 'INP', 'CLS', 'PageSpeed Insights says...', 'is my site fast enough', 'page experience', 'why is the CrUX data missing', or 'PSI API field data'. Uses sitetiller cwv and crux-history (needs a CrUX API key; see the setup skill)."
license: MIT
metadata:
  version: 1.0.0
---

# Core Web Vitals

Goal: say precisely which metric fails for which device and URL (or origin) from real-user data, then give the fixes that web.dev documents for that metric. Google recommends good Core Web Vitals and says they align with what its core ranking systems seek to reward; it states no ranking boost or weight, so never promise one.

## Inputs
- The URL(s) that matter (home, a key template, the worst-traffic page) and the origin.
- `CRUX_API_KEY` set (see `setup`).

## Thresholds (web.dev), judged at the 75th percentile, mobile and desktop separately
| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP, Largest Contentful Paint | 2.5 s or less | between | over 4 s |
| INP, Interaction to Next Paint | 200 ms or less | between | over 500 ms |
| CLS, Cumulative Layout Shift | 0.1 or less | between | over 0.25 |

A page passes when all three are good at p75. FID is retired; INP is the responsiveness metric.

## Steps
1. Measure phone first, then desktop, for the page and for the origin:
   ```bash
   npx sitetiller cwv https://example.com/pricing --json
   npx sitetiller cwv https://example.com/pricing --form DESKTOP --json
   npx sitetiller cwv https://example.com/ --origin --json
   npx sitetiller cwv https://example.com/ --origin --form DESKTOP --json
   ```
   Output: `target`, `formFactor`, `available`, `collectionPeriod`, `metrics[]` (`metric`, `p75`, `rating`) and `passes`. `p75` is in milliseconds for LCP and INP and a unitless score for CLS. `rating` is `good`, `needs improvement` or `poor` using the table above. The CrUX data is a 28-day rolling window, updated daily, about two days behind.
2. If `available` is false, the URL has too little Chrome traffic for CrUX to report it. Try `--origin`. The CrUX docs describe a URL query as data for that exact URL only and an origin query as data for all pages in the origin; the API does not follow redirects, so test the final URL (check with `page`). Say "no field data" and move to lab data: it is not a failing score.
3. See the trend and where LCP time goes (CrUX History API, weekly points, up to 40 periods):
   ```bash
   npx sitetiller crux-history https://example.com/pricing --json
   npx sitetiller crux-history https://example.com/ --origin --periods 40 --json
   ```
   Output: `periods` (end date of each weekly collection period), `metrics` per Core Web Vital (`series` of p75s, `latest`, `latestRating`, `change4w` in % of the last 4 points against the 4 before, `trend` better/worse/flat), `lcpBreakdown` (p75 of TTFB, resource load delay, resource load duration and element render delay, each with its share), `biggestLcpPart` and `advice`. Subparts are separate p75s, so they need not add up to the LCP p75. Use the trend to date a regression (a deploy, a new script) and the breakdown to pick the LCP fix below.
4. Pick the failing metric and device. Fix the worst first; fixes below. Re-measure after the 28-day window rolls: field data cannot confirm a fix the next day.
5. Use lab tools to find causes, not to grade. Google's web.dev says field data is what you should use to prioritise, while lab runs (Lighthouse, PageSpeed Insights lab section) load a page once under fixed conditions and can miss INP problems because Total Blocking Time ignores tap delay. Run Lighthouse or Chrome DevTools on the failing page and compare.

## Fixes by metric (web.dev)

### LCP
Break the time into four parts and find the oversized one. Ideal shares of LCP time: time to first byte about 40%, resource load delay under 10%, resource load duration about 40%, element render delay under 10%.
- Resource load delay large: add `fetchpriority="high"` to the image you expect to be the LCP element (only one or two images; more dilutes it). If the image is only referenced from CSS or JavaScript, preload it with `<link rel="preload">`.
- Never lazy-load the LCP image.
- Slow TTFB or long load duration: serve from a CDN, serve images from the same origin as the HTML where possible, use an image CDN or smaller formats to shrink files.
- Element render delay large or LCP element not in the first HTML: avoid client-side rendering for it; use server-side rendering or prerendering so the LCP resource is discoverable in the initial HTML.

### INP
INP has three phases: input delay, processing duration, presentation delay.
- Input delay: reduce long tasks (any task over 50 ms) during load, such as script evaluation at startup.
- Processing: do as little work as possible in event callbacks; yield to the main thread (`await scheduler.yield()` with a `setTimeout` fallback, or `setTimeout`); defer non-critical work (saves, counts) to later tasks; avoid layout thrashing (changing styles then reading layout in the same task).
- Presentation: reduce DOM size; use `content-visibility` for off-screen content; be careful rendering large HTML with client-side JavaScript.
Web.dev's long-task article says developers no longer recommend `isInputPending()`; use yielding.

### CLS
- Set `width` and `height` attributes on images and video (or CSS `aspect-ratio`) so space is reserved.
- Reserve space for ads and embeds (`min-height` or `aspect-ratio`); keep a placeholder if the ad does not load.
- Web fonts: `font-display: optional` avoids a late re-layout; choose a close fallback and tune it with `size-adjust`; preload critical fonts.
- Keep pages eligible for the back/forward cache.
- Animate with `transform`, not `top` or `left`.

## PageSpeed Insights note
The PageSpeed Insights API documentation says: "We plan to discontinue including real-world data from the Chrome User Experience Report in this API." and recommends the CrUX API or the CrUX History API instead. The page gives no date. PSI release notes (last entry read: 2025-10-20, Lighthouse 13) show no removal yet. So: do not build new tooling on the PSI API's field data (`loadingExperience`); use the CrUX API, which is what `cwv` does. PSI's lab data is Lighthouse and is unaffected by that notice.

## Output to the user
1. A table per device: metric, p75, rating, target (page or origin), collection period.
2. The failing metric(s) and the likely cause class (for LCP, which subpart) once lab data or DevTools shows it.
3. Three fixes in priority order, each tied to a web.dev guidance above.
4. When to re-measure: after the 28-day window.
5. If no field data: say so and what was used instead.

## Lab runs for many pages
```bash
npx sitetiller lighthouse --file key-urls.txt --strategy mobile --json
```
One PageSpeed Insights request per URL, 2 s apart. Output per URL: Lighthouse `scores` (performance, accessibility, bestPractices, seo, 0-100), `metrics` (lcpMs, fcpMs, tbtMs, cls, speedIndexMs) and the top 5 `opportunities` by estimated savings; plus `median` and the `worst` five. Set `PSI_API_KEY` (a Google Cloud key with the PageSpeed Insights API enabled); without a key the shared quota is often exhausted. Use this to find which templates are slow and why; pass or fail stays a field-data decision.

## Guardrails
- Judge pass or fail only on field p75 per device; do not average phone and desktop.
- Do not call a lab score a Core Web Vitals result.
- Do not promise a ranking gain. Google says only that the metrics align with what its ranking systems seek to reward.
- Do not invent other thresholds (for example TTFB limits, JavaScript size budgets); none are given in the sources here.
- Do not cite a PSI API removal date: Google gave none.

## References
- `references/sources.md`: web.dev, Chrome and Google documentation, checked 2026-11-12.
