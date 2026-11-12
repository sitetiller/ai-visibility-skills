# Sources (checked 2026-11-12)

| Claim | Source | Strength |
|---|---|---|
| Spec: file `llms.txt` "at the site root, or at any path within it"; order: optional BOM, H1 with the name (the only required section), blockquote summary, zero or more detail sections (any Markdown except headings), zero or more H2 file lists; list item `[name](url)` with optional `: notes`; the H2 "Optional" holds links an agent "can skip when a shorter context is needed"; proposed `.md` page versions (`page.html.md`, `page.md`, `index.html.md`), discovery by `rel="alternate" type="text/markdown"` and `rel="describedby"`, HTML link or `Link:` header. Author Jeremy Howard, first published 2024-09-03; page is v2, last modified 2026-08-10; "still a proposal", open for community input | https://llmstxt.org/ | Primary (spec author). It is a proposal, not a standards-body standard |
| "You don't need to create new machine readable files, AI text files, markup, or Markdown to appear in Google Search"; "Google Search itself doesn't use them"; creating them "will neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them" | https://developers.google.com/search/docs/fundamentals/ai-optimization-guide (no date on page) | Primary (Google). Scope is Google Search only |
| Lighthouse llms.txt audit: "Lighthouse flags the pages if a server error occurs when attempting to retrieve the llms.txt file"; a 404 is "marked as Not Applicable (N/A)"; providing the file is "optional at the moment"; purpose: a machine-readable summary of a site's content for LLMs and AI agents that can reduce crawl time. The page does not document content checks and links to llmstxt.org. Third-party write-ups (not relied on) say the audit also checks for an H1 and a link, and a Lighthouse issue (googlechrome/lighthouse #17082) reports a valid file flagged as failed to fetch | https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt (no date on page) | Primary (Chrome) for the quoted points |
| CLI behaviour (checks, 100,000-character limit, 10 links tested, root path only, `llms-build` columns) | `cli/lib/llms.mjs` and `cli/bin/sitetiller.mjs` in this repo; real run of `llms` on docs.anthropic.com on 2026-11-12 (102,037 bytes, no summary blockquote, content type text/plain) | Tool source |

## Not found in a primary source (so the skill does not say it)
- That OpenAI, Anthropic, Perplexity or Microsoft use llms.txt for citation or ranking.
- That llms.txt changes AI visibility, traffic or citations anywhere.
- The Lighthouse release in which the audit shipped (third-party dates conflict; omitted).

Re-check the Google guide and Chrome page before changing this skill; both are edited over time.
