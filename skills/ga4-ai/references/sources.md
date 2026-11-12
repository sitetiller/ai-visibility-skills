# Sources (checked 2026-11-12)

| Claim | Source | Strength |
|---|---|---|
| Regex in Google Analytics: an expression without metacharacters "only returns exactly matching values"; ".*San Francisco.*" also returns "South San Francisco"; `^` and `$` anchors; "Google Analytics Regex is full regex and case sensitive"; `.*` builds a partial match. The page covers Google Analytics generally and does not name GA4 | https://support.google.com/analytics/answer/1034324 | Primary (Google) |
| Custom channel groups in GA4: Admin, Data display, Channel groups; Editor or above; copy the default group and edit; channel conditions use dimensions such as Source with match types such as exact match or regex; channel definitions are not case sensitive; "Traffic is included in the first channel whose definition it matches", so reorder (example: AI channel above Referral); can be applied retroactively; limits 2 custom groups and 50 channels per group on standard properties, 5 groups on 360 | https://support.google.com/analytics/answer/13051316 | Primary (Google) |
| ChatGPT adds `utm_source=chatgpt.com` to referral URLs for publishers whose sites allow OAI-SearchBot, for tracking in tools like GA | OpenAI help center, Publishers and Developers FAQ: https://help.openai.com/en/articles/12627856-publishers-and-developers-faq. The page returned HTTP 403 to the fetch tool on 2026-11-12, so the wording was confirmed from search-result excerpts of that same page, not from a full read. Re-read it in a browser before quoting it | Primary (OpenAI), verified indirectly |
| OAI-SearchBot controls whether a site is shown in ChatGPT search answers | https://developers.openai.com/api/docs/bots (see `ai-crawlers` sources) | Primary (OpenAI) |
| `ga4-ai` query: Data API `runReport`, dimensions `sessionSource`, `landingPage`; metrics `sessions`, `keyEvents`; filter `FULL_REGEXP` on `sessionSource`; limit 1000 | `cli/lib/engines.mjs` in this repo | Tool source |

## Not found in a primary source (so the skill does not say it)
- Which other assistants add UTM tags or referrers, and the exact `sessionSource` strings they produce (only the six hostnames in the CLI pattern are assumed; the user confirms in their own data).
- How large the share of AI visits filed under Direct is, or the technical reasons per app. Stated as unknown; the Direct caveat is general reasoning, not a measured result.
- Whether the "matches regex" condition in the channel group UI is full or partial for every property; the pattern is written with `.*` on both sides so it works either way.

Re-check the Google pages before updating; GA4's interface changes.
