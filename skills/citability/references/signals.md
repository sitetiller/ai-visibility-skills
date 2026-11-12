# What `cite` counts, and where it misleads

Source: `cli/lib/citability.mjs`. It parses the HTML it receives (no JavaScript is run), removes script, style, nav, footer, header, aside and form blocks, splits at h1 to h4 headings, and leaves sections under 25 words out of the summary.

| Field | Counts | Known failure modes | What to do |
|---|---|---|---|
| `question` / `questionHeadings` | Heading text ends with "?" | A rhetorical or vague question scores the same as a real user question | Match headings to real queries from Search Console or support |
| `firstSentenceWords` / `answerFirstShare` | Words in the first sentence; 30 or fewer = "answer first". The 30 is the tool's choice | Splits on every period: "llms.txt", "v2.1", "e.g.", "U.S." cut the sentence short and count as answer-first. A short sentence that says nothing passes | Read `firstSentence` for every section |
| `numbers` / `specificShare` | Digit groups, with or without a unit | Dates, version numbers, phone numbers and years count | Check the number is evidence |
| `hasList` / `hasTable` / `structuredShare` | A ul, ol or table inside the section | Menu lists and layout tables count | Check the list or table holds content |
| `links` / `sourcedShare` | Outbound http(s) links in the section | Ads, share buttons and navigation count; the target may not be a source | Open the links |
| `words` / `longSections` | Words in the section; over 400 = long. The 400 is the tool's choice | None known; Google says there is no ideal length | Treat as a prompt to re-read, not a defect |

Real output, llmstxt.org, 2026-11-12: 7 sections, `answerFirstShare` 0.86, `specificShare` 0.57, `structuredShare` 0.57, `sourcedShare` 0.71, `longSections` ["Proposal"]. The "Proposal" section's `firstSentence` is "llms." because of the file-name period, so the 0.86 is overstated.

The summary is a share of sections, so a page with 3 sections moves 33 points when one section changes. Compare pages with similar section counts only.
