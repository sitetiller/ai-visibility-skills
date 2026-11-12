---
name: citability
description: "Make a page easier to quote correctly in AI answers (Google AI Overviews and AI Mode, Bing/Copilot, ChatGPT search, Perplexity). Runs the cite command for per-section signals (question headings, first-sentence length, numbers, lists and tables, outbound sources), then reads each section for correctness and specificity, rewrites weak sections, and measures the change against control pages. Use when the user asks 'how do I get cited by AI', 'make this page quotable', 'GEO', 'AEO', 'optimize for ChatGPT/Perplexity/AI Overviews', 'why does AI cite my competitor', or 'is my content answer-ready'. States plainly what Google and Microsoft say and that the cite score is a heuristic, not a predictor."
license: MIT
metadata:
  version: 0.1.0
---

# Citability: make a page quotable, and check it did anything

Goal: a page whose sections each give a clear, correct, specific answer that a person or an AI system can lift without losing the meaning. Then measure whether anything changed. The `cite` command counts surface signals. It cannot tell whether a page will be cited.

## What the vendors say (read before promising anything)
- **Google (AI features doc and AI optimization guide, checked 2026-11-12):** no extra requirements for AI Overviews or AI Mode; "You don't need to write in a specific way just for generative AI search"; no chunking requirement; no special schema.org markup; no AI text files. The guidance asks for original, non-commodity content.
- **Microsoft (Bing AI Performance post, 2026-02-10):** "Clear headings, tables, and FAQ sections help surface key information"; support claims with examples, data and cited sources; keep content current; use IndexNow.
- **Academic work (Aggarwal et al., KDD 2024):** the authors report that their GEO methods raised visibility by up to 40% on their own metric, on a research benchmark. It was not measured on ChatGPT, Google or Perplexity in production. Treat it as a hypothesis to test, not a rule.
- Google and Microsoft do not conflict in practice: both reward a page that is clear, specific and sourced. Neither publishes a score, a sentence length or a format that guarantees citation.

Quotes and URLs: `references/sources.md`.

## Inputs
- A page URL the user owns, and the questions that page should answer (from Search Console queries, support tickets, or `ai-tracker` prompts).
- Optional: two or three competing pages that AI answers cite today, for comparison.

## Steps
1. Snapshot first, so the change can be measured and rolled back (`measure-rollback` skill):
   ```bash
   npx sitetiller version snapshot https://example.com/page --label before-citability
   ```
2. Run the signals:
   ```bash
   npx sitetiller cite https://example.com/page --json
   ```
   Output: `url`, `status`, `sections[]` and `summary`. Each section has `heading`, `level`, `words`, `firstSentence`, `firstSentenceWords`, `numbers`, `hasList`, `hasTable`, `links` (outbound http links) and `question` (heading ends with "?"). Only sections of 25 or more words enter `summary`: `sectionCount`, `questionHeadings`, `answerFirstShare` (first sentence 30 words or fewer), `specificShare` (has a number), `structuredShare` (list or table), `sourcedShare` (outbound link), `longSections` (over 400 words).
3. Know the limits of each signal before reading the numbers (`references/signals.md` has the detail):
   - The 30-word and 400-word cutoffs are the tool's own choices, not vendor numbers.
   - Sentences end at . ! or ? followed by a space and a capital letter or digit, so dots inside "llms.txt", "3.5" or "example.com" no longer split a sentence (fixed in 0.1.0). An abbreviation followed by a capitalised word ("e.g. Google") can still end a sentence early. Always read `firstSentence` yourself.
   - `numbers` counts digits anywhere, including dates and version numbers, not only evidence.
   - `links` counts any outbound http link in the section, including navigation or ads.
   - Navigation, footer, header, forms and scripts are stripped; text injected by JavaScript is not seen (see `agent-ready`).
4. Read every section yourself and judge what the tool cannot:
   - **Correct?** Is every claim still true today? Check numbers, prices, dates and product names against the source.
   - **Specific?** Does it name the thing, the number and the condition ("for teams under 10", "as of October 2026")? A short vague first sentence still fails.
   - **Self-contained?** Would the first one or two sentences make sense if quoted alone? No "as mentioned above", no pronouns without a noun.
   - **Original?** Does it add something the user has first-hand (data, test, price, experience) that other pages lack? Google asks for this; citing sources does not replace it.
   - **Sourced?** Claims that are not the user's own data link to the primary source.
5. Rewrite only the weak sections with the pattern below. Keep the page's real expertise; do not pad.
6. Publish, then measure (below). One change set per page at a time, so the effect can be attributed.

## Rewrite pattern per section
1. **Heading** names the question or topic in the reader's words (use real queries, not invented ones). A question heading is optional; Microsoft names FAQ sections, and no source shows that question headings beat statements.
2. **First one or two sentences** state the answer with its condition: what, how much, for whom, as of when.
3. **Evidence** next: the number, the example or the test, with the source linked or the method stated.
4. **Detail and exceptions** after that, for readers who want them.
5. **A table** when the content compares the same attributes across items (plans, specs, options). **A list** for ordered steps. Prose for an argument.

Before and after:
- Before: "Our pricing is flexible and designed to scale with you."
- After: "Acme costs $29 per month for up to 3 users and $9 per extra user (checked 2026-11-12). Annual billing is 20% cheaper. Plan limits are in the table below."

## Measure it
Citations move over weeks and no first-party report gives a daily feed.
1. First-party reports: Bing AI Performance and the Search Console generative AI report (`ai-citations` skill).
2. Your own sample: `ai-tracker` prompts for this page's questions, same prompts every week, with margins of error.
3. Visits: `ga4-ai` and `ai-logs`.
4. Compare changed pages with similar untouched pages using `measure-rollback` (difference-in-differences). If the changed pages did not beat the controls, roll back and say so.
Never report a before/after on one page as proof; AI answers vary from run to run.

## Output to the user
1. The `summary` numbers, with one line per signal on what it can and cannot mean.
2. A table of sections: heading, verdict (keep or rewrite), the reason from your own reading, not the tool's.
3. The rewritten sections, diff style.
4. The measurement plan: which reports, which prompts, which control pages, review date.
5. One sentence: "cite is a heuristic; it does not predict citations."

## Guardrails
- Never say a score or percentage predicts, ranks or guarantees AI citation. It counts signals on the page.
- Do not add statistics, quotes or sources that are untrue or unchecked. Invented evidence is worse than none.
- Do not split a page into many thin pages for related "fan-out" queries; Google's guide names this as scaled content abuse.
- Do not claim lists, tables or question headings win in AI answers. Microsoft recommends tables and FAQ sections; no vendor publishes a win rate.
- Edit only pages the user owns and named.

## References
- `references/sources.md`: vendor quotes with URLs and access dates.
- `references/signals.md`: what each `cite` field counts and its known failure modes.
