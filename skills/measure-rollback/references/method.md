# Measurement method

## Difference in differences
For a changed group C and control group K over equal windows before (b) and after (a):

lift = (C_a / C_b) / (K_a / K_b) − 1

Assumption: without the change, C would have moved like K. Choose K so that assumption is plausible: same page type, similar traffic and position range, no edits or new internal links during the window.

## Interval
Percentile bootstrap: resample days with replacement inside each of the four series, recompute lift, repeat 2,000 times, take the 2.5th and 97.5th percentiles. Days are not independent in reality (weekday patterns), so use whole weeks and treat the interval as a guide.

## Why not a simple before/after
Google's own guide to traffic drops lists algorithm updates, seasonality, technical issues and site moves as causes of change unrelated to your edit: https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops

## Related work
Google's CausalImpact (Brodersen et al., Annals of Applied Statistics, 2015) models the full time series with control series "not affected by the intervention": https://github.com/google/CausalImpact. This tool is the simpler two-period version with a bootstrap interval.

## Sample sizes
Small pages make noisy measurements. Treating clicks as a Poisson count, a page with 70 clicks a week varies by about ±23% (1.96 × √70 / 70) from week to week with no change at all. Group similar changes across several pages, or measure longer.
