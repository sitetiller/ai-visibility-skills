---
name: content-quality
description: "Review a page against Google's helpful, reliable, people-first content guidance and E-E-A-T: who wrote it (byline, author page), how it was made (first-hand testing, data, AI disclosure), why it exists, sourcing, dates, readability (Flesch, sentence length), filler phrases that read as machine-written, and unsourced 'studies show' claims. Produces a 10-point checklist plus a rewrite plan. Use when the user asks 'E-E-A-T', 'is my content helpful', 'helpful content update', 'content quality audit', 'does this read like AI', 'why did my rankings drop after a core update', 'YMYL', or 'author bio'. Uses sitetiller quality."
license: MIT
metadata:
  version: 0.2.0
---

# Content quality

Goal: show, with evidence from the page, where it falls short of Google's "Who, How and Why" questions, then rewrite the weakest sections. Google states E-E-A-T is not a specific ranking factor and that trust matters most; treat the checklist as a review aid, never as a score Google uses.

## Steps
1. Measure the page:
   ```bash
   npx sitetiller quality https://example.com/guide --json
   ```
   Output: `readability` (`fleschReadingEase`, `avgSentenceWords`, `longSentenceShare`, `longParagraphs`), `signals` (`author`, `datePublished`, `dateModified`, `externalSources`, `firstHand`, `figures`, `aboutOrContact`), `filler[]` (phrase, count), `vagueClaims[]`, `checklist[]` (10 checks, pass/fail), `passed`, `of`.
2. Read the page yourself. The counts find candidates; only reading tells you whether the content is accurate, original and complete. Answer Google's questions in writing:
   - **Who:** is the author obvious, with a byline that leads to their background? Is it someone who knows the topic?
   - **How:** is it clear how the content was made: tested, measured, drawn from the site's own data? If automation or AI was used substantially, is that disclosed and is the reason explained?
   - **Why:** was it made to help a reader, or mainly to attract search visits?
   - **Content:** original information or analysis, beyond summarising other pages? Any easily verified factual errors? A clear, descriptive title?
3. For YMYL topics (health, money, safety, legal), raise the bar: named expert author or reviewer, primary sources for every figure, an update date.
4. Fix by checklist line:

| Failed check | Fix |
|---|---|
| Author is named | Real byline linked to an author page with relevant background. Never invent a person, headshot or credential |
| Publish / update date | Show dates on the page and in `Article` structured data (`datePublished`, `dateModified`); change `dateModified` only for real changes |
| At least 2 outside sources | Link primary sources (the vendor's documentation, the study, the dataset) next to the claim they support |
| First-hand work | Add what only you have: your test, screenshots, measurements, your customers' anonymised data, a worked example |
| Figures, tables, code or media | Turn comparisons into a table; add the screenshot or chart that proves the point |
| About or contact | Link an about page that says who runs the site and how to reach them |
| No filler phrases | Cut the phrase; say the specific thing instead ("delve into" -> the topic, "in today's fast-paced world" -> delete) |
| No unsourced "studies show" | Name and link the study, or remove the claim |
| Readable | Split sentences over 30 words; answer the question in the first sentence of each section (see `citability`) |

5. Rewrite the two weakest sections first, keeping the facts and links. Snapshot the page before and after (`measure-rollback`) if it is a page the user owns and wants measured.

## Signals this tool cannot see
Reputation (what others say about the site or author), accuracy of facts, and whether the advice works. Say so in the report.

## Guardrails
- Never fabricate authors, reviewers, credentials, quotes, reviews or "we tested" claims. Add only what the user can back up.
- Do not present the checklist result as a Google score or promise that fixing it restores rankings; core updates are not penalties with a fix list.
- The filler list flags phrases, it does not prove machine authorship; never accuse a writer on that basis.
- Flesch reading ease is calibrated for English; skip it for other languages.

## References
- `references/sources.md`: Google helpful content guidance and quality rater guidelines, checked 2026-11-13.
