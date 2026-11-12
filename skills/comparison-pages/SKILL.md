---
name: comparison-pages
description: "Plan, write and check honest 'X vs Y' and 'alternatives to X' pages for SaaS: sourced and dated comparison tables, clear disclosure when you are one of the products, no fake or self-written reviews, no self-serving review markup, and measurement with measure-rollback. Based on Google's spam policies and review snippet guidelines and the FTC rule on consumer reviews. Use when the user says 'vs page', 'alternatives page', 'comparison page', 'competitor comparison', 'X alternative', 'compare us to', 'best tools for' page."
license: MIT
metadata:
  version: 0.1.0
---

# Comparison pages that stay true

A comparison page is useful when a buyer can verify it. It earns trust (and avoids policy trouble) by showing what was checked, when, and where the author has a stake. The skill builds pages where every cell in the table has a source and a date, and rejects tactics that look like fake reviews or thin affiliate content.

## Inputs
- The product, the competitor(s), and the buyer question ("X vs Y", "alternatives to X").
- The user's own pricing and feature facts, and access to each competitor's public pricing, docs and changelog pages.
- Queries from `gsc` that the page should serve (see `content-brief`).

## Steps
1. Collect facts only from primary sources: the competitor's pricing page, documentation, terms, status or changelog pages, and the user's own product. Save each source URL with the access date. Take screenshots of pricing pages the day you read them.
2. Pick criteria that buyers decide on (price at stated usage, limits, integrations, support, security docs, data export). Take criteria from the queries and from the questions in `content-brief`, not from what flatters the product.
3. Build the table (format below). Every cell has a value and a source link. Where the competitor does not publish a fact, write "not published" and the date, never a guess.
4. Write the verdicts: who each product fits, and when not to choose yours. Include at least one case where the competitor is the better choice, if true. A page where the author always wins is not credible and fails the usefulness test below.
5. Add the disclosure at the top (below).
6. Check the page:
   ```bash
   npx sitetiller page https://example.com/vs/acme --json
   npx sitetiller cite https://example.com/vs/acme --json
   npx sitetiller schema https://example.com/vs/acme --json
   ```
   `page`: `title`, `h1`, `tables` (should be at least one), `words`, `canonical`. `cite`: share of sections with numbers (`specificShare`) and sources (`sourcedShare`); low values mean unsourced claims. `schema`: see the markup rules below.
7. Set a review date and a re-check schedule. Pricing and features change; a stale table is a wrong table.
8. Measure with `measure-rollback`: snapshot, publish or edit, compare against similar pages left untouched for 28 days. For a new page, track its queries from `gsc` by page.

## Table format
| Criterion | Your product | Competitor | Source and date |
|---|---|---|---|
| Entry price at stated usage (say the usage) | value | value | URL, checked 2026-11-12 |
| Free plan or trial | value | value | URLs, dates |
| Limit that matters (seats, projects, API calls) | value | value | URLs, dates |
| Feature the buyer asked about | yes / no / partial, with the detail | same | docs URLs, dates |
| Data export | value | value | docs URLs |
Row labels name the exact plan compared. Put "last checked" and the reviewer's name near the table.

## Disclosure
Say it above the fold, in plain words: "This page is published by {Company}, which makes {Product}. We compared the products on {date} using the public sources linked in the table." If affiliate links or paid placements are involved, say so next to the links and mark paid links `rel="sponsored"` (Google's spam policy treats paid links as acceptable when marked `nofollow` or `sponsored`). If the page says it is independent and the company controls it, that is the misrepresentation the FTC rule describes.

## What not to do
| Tactic | Why not |
|---|---|
| Write "customer reviews" yourself, or have staff, friends or agencies post them | The FTC's rule on consumer reviews and testimonials prohibits fake or false reviews and testimonials; insiders must disclose material relationships |
| Pay or reward for reviews that require a positive sentiment | Prohibited by the same FTC rule; Google also says not to include fake or undisclosed incentivised reviews in the page or markup |
| Present a company-run comparison as independent | FTC: misrepresenting a company-controlled site as providing independent reviews is prohibited; the disclosure above avoids it |
| Hide negative reviews with legal threats or intimidation | FTC rule covers review suppression |
| Copy competitor descriptions or vendor reviews with nothing added | Google's spam policy on thin affiliate pages: reusing merchant descriptions and reviews without original value |
| Generate hundreds of "X vs Y" pages from a template with no original facts | Google's spam policy on scaled content abuse |
| Mark up your own scoring of competitors as `Review` or `AggregateRating` | See below |
| A "comparison calculator" or tool that does not work | Google lists it under misleading functionality |
| Quoting a competitor's price without a date | Becomes false silently |

## Markup
- Self-serving reviews: Google's review snippet guidelines say that when the reviewed entity controls the reviews about itself, `LocalBusiness` or `Organization` pages are ineligible for star results, including reviews shown through a third-party widget.
- Reviews must refer to a specific item, not a category or a list of items. A comparison or alternatives page reviews several items, so it is not a fit for review markup. Do not add `Review` or `AggregateRating` to it.
- Ratings and reviews must be visible, come from users, and not be aggregated from other websites.
- Safe markup for these pages: `Article`, `BreadcrumbList`, and the `Organization`/`WebSite` graph (see `schema`). A product page of yours can carry `SoftwareApplication` with real, visible user ratings only.

## Output to the user
1. The page outline: disclosure, short answer, table, per-competitor sections, "who should choose what", sources, review date.
2. The filled table with every source URL and date, and a list of cells that need a source ("not published" counts as sourced if dated).
3. The `page`, `cite` and `schema` results and what was fixed.
4. Measurement plan and the re-check date.

## Guardrails
- Every competitor fact has a primary source and a date; no hearsay, no screenshots of private material.
- Do not disparage with unverified claims. State what the source shows.
- Do not use competitor trademarks as if endorsed; name them as the subject.
- No invented reviews, testimonials, ratings or review counts, by anyone.
- No review markup on comparison or alternatives pages.
- This is not legal advice. If the user plans paid placements, affiliate deals or incentivised reviews, tell them to check the FTC guidance and consult a lawyer.
- Publish only on pages the user owns.

## References
- `references/sources.md`
