---
name: ai-citations
description: "Read the first-party AI reports and combine them into one monthly view: Bing Webmaster Tools AI Performance (total citations, average cited pages, grounding queries, page-level citations, Intents, Topics, Citation Share, Compare, Topics Portfolio), the Search Console generative AI performance report (impressions in AI Overviews and AI Mode), GA4 visits from AI assistants (ga4-ai), and AI bot and referral hits in server logs (ai-logs). Use when the user asks 'where do I see my AI citations', 'how do I read the Bing AI Performance report', 'am I in AI Overviews', 'what does Search Console show for AI', 'combine my AI visibility data', or 'monthly AI report'. Explains what each report measures and what none of them show."
license: MIT
metadata:
  version: 0.1.0
---

# First-party AI reports, read together

Goal: one honest monthly view built only from reports the user can open themselves: Bing's AI Performance, Search Console's generative AI report, GA4 and server logs. Each measures a different thing; none measures what an assistant said about the brand. For that, see `ai-tracker`.

## Inputs
- Verified site in Bing Webmaster Tools and in Search Console (the user opens the reports; the CLI does not fetch the two AI reports).
- GA4 property id and read access (`ga4-ai` skill); access logs if available (`ai-logs` skill).
- A calendar month, the same window for all sources.

## What each source measures

| Source | Measures | Unit | Does not show |
|---|---|---|---|
| Bing Webmaster Tools, AI Performance (public preview, announced 2026-02-10) | Times your content is shown as a source in AI answers on Microsoft Copilot, AI summaries in Bing and select partner integrations | Citations | Clicks, impressions, placement, ranking, authority; surfaces cannot be split (Average Cited Pages is aggregated) |
| Search Console, Search Generative AI performance (announced 2026-06-03; all websites worldwide as of 2026-08-31) | How often URLs from your site appeared in generative AI features: AI Overviews and AI Mode in Search; Discover has its own view | Impressions; dimensions pages, countries, devices (Search only), dates | Per the announcement: no clicks, CTR, position or queries in the report. That data stays in the main Performance report, where AI features traffic counts under search type Web |
| GA4 (`ga4-ai`) | Sessions whose source matches a known assistant hostname | Sessions, key events by landing page | Visits with no referrer (counted as Direct), anything that did not click |
| Server logs (`ai-logs`) | Bot fetches (verified against vendor IP lists) and clicks with an assistant referrer | Hits, visits | Why a bot fetched; whether the fetched page was shown to anyone |

## Bing AI Performance: fields and how to read them
(From Microsoft's posts of 2026-02-10, 2026-06-16 and 2026-10-13; quotes in `references/sources.md`.)
- **Total Citations:** times content is displayed as a source in AI answers in the selected period.
- **Average Cited Pages:** average number of unique pages cited per day, aggregated over surfaces.
- **Grounding queries:** key phrases the AI used when retrieving content it cited. Microsoft says this is a sample. They are not the user's prompts.
- **Page-level citation activity:** citations per URL. Microsoft: "This reflects how often pages are cited, not page importance, ranking, or placement."
- **Intents** (preview, 2026-06-16): groups grounding queries into categories such as Informational, Commercial, Navigational, Learn and Solve, Research, Creation, Local. The classification is machine-made and can be broad.
- **Topics:** related grounding queries grouped into themes.
- **Citation Share:** your share of citations among all sites cited for the same grounding query. Microsoft calls it observational; it does not reveal competitor domains or traffic share.
- **Compare:** overlays a previous period. Microsoft notes changes can come from model updates, competing content, freshness and demand, so it shows what changed, not why.
- **Topics Portfolio** (beta, announced 2026-10-13): a Topics tab next to Citations & Pages, only when Bing has enough data. Columns: Topic, Topic Size (approximate total citations across all sites), Sites Cited, Queries. "Top Opportunity Queries" are the strongest queries where other sites appear and yours does not, with volumes as ranges. Beta limits: AI-made classification can be wrong, small sites may see few or no topics, branded queries can appear as opportunities, numbers are "directional planning signals". Window: one, two or three months.

## Search Console generative AI report
Open the Search Generative AI performance reports in Search Console (the announcement describes dedicated views for Search and for Discover; menu placement may differ by property). Read impressions by page, country, device and date. Because clicks are not in this report, take click and CTR data for the same pages from the main Performance report and label the difference. Google's own guidance says sites in AI features count in the overall Performance report under the Web search type, so the AI clicks are mixed with classic search clicks and cannot be separated from that report alone. The announcement does not mention an API for this report; do not tell the user the CLI can export it.

## Steps
1. Fix the month. Pull each source for that same month; Bing's grounding-query data is a sample, so use a full month at minimum.
2. Bing: record Total Citations, Average Cited Pages, the top 20 cited pages and top 20 grounding queries, Intents split, and (if shown) Topics Portfolio topics and top opportunity queries. Use Compare for the previous month. Export what the UI allows; otherwise copy the figures by hand and say so.
3. Search Console: record AI impressions by top pages and countries, and the month-over-month change.
4. GA4: `npx sitetiller ga4-ai <propertyId> --start YYYY-MM-01 --end YYYY-MM-30 --json` (see `ga4-ai`).
5. Logs, if available: `npx sitetiller logs access.log --json` (see `ai-logs`): verified search-bot hits on the pages that Bing and Google report as cited or shown.
6. Join by page URL (normalise trailing slash, protocol, query string) in one table: Bing citations, Search Console AI impressions, GA4 AI sessions, verified bot hits.
7. Read across, not down. A page cited by Bing with no GA4 AI sessions is normal: citations are not clicks. A page with AI impressions and falling classic clicks is a question for `content-decay`, not a conclusion.
8. Act on gaps: indexed pages rarely cited (Microsoft suggests this check) go to `citability`; opportunity queries go to `content-brief`; a blocked crawler goes to `ai-crawlers`.

## Output to the user
1. A one-page table per month: the four sources side by side, with the window and the date each was read.
2. Three movers up and three down, each tied to a page.
3. A "what this cannot tell us" list (below), so nobody reads citations as traffic or revenue.
4. Next actions, each tied to a page, query or topic.

## What none of the reports show
- What an assistant actually said about the brand, whether it was accurate, or whether the answer recommended the brand. Use `ai-tracker` and read answers.
- Citations in ChatGPT, Claude, Perplexity or Gemini the app. Bing reports Microsoft surfaces; Search Console reports Google surfaces. For other assistants only GA4 clicks and log fetches exist.
- Visits that came without a referrer, which GA4 files under Direct.
- Revenue from AI answers that did not produce a click (someone reads, searches the brand later). That arrives as branded search or direct.
- Competitors' domains in Bing's Citation Share.

## Guardrails
- Do not add Bing citations to Search Console impressions; they are different units on different surfaces.
- Do not call Topics Portfolio, Intents or Citation Share precise; Microsoft labels them preview or beta and directional.
- Report the report names and dates the user actually saw. Microsoft and Google rename and extend these reports; if the UI differs from this skill, trust the UI and say so.
- Read-only. Do not ask for write scopes or paste credentials into chat.

## References
- `references/sources.md`: quotes with URLs, dates and access dates.
