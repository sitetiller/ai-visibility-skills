# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Policy names on the spam policies page: Cloaking, Doorway abuse, Expired domain abuse, Hacked content, Hidden text and link abuse, Keyword stuffing, Link spam, Machine-generated traffic, Malicious practices, Misleading functionality, Scaled content abuse, Scraping, Site reputation policy, Sneaky redirects, Thin affiliation, User-generated spam. The page heading is "Site reputation policy"; the page has no heading "site reputation abuse" | https://developers.google.com/search/docs/essentials/spam-policies (opened 2026-11-12) |
| Scaled content abuse: "when many pages are generated for the primary purpose of manipulating search rankings and not helping users"; "typically focused on creating large amounts of unoriginal content that provides little to no value to users, no matter how it's created"; examples: generative AI or similar tools to generate many pages without adding value (including automated transformations like synonymizing, translating or other obfuscation), scraping feeds or search results to generate many pages, stitching content from different pages without adding value, multiple sites to hide scale, many pages that make little sense but contain search keywords | same page |
| Doorway abuse: "sites or pages are created to rank for specific, similar search queries" and "lead users to intermediate pages that aren't as useful as the final destination" | same page |
| Thin affiliation: product affiliate links where descriptions and reviews are copied from the merchant without original content or added value | same page |
| Site reputation policy: applies where third-party content is published on a host site mainly because of that host's already-established ranking signals; third-party content alone is not inconsistent with the policy; changes apply in the EEA; outside the EEA pages may get a manual action | same page |
| Violations are found by automated systems and human review; affected sites may rank lower or not appear; some can lead to a manual action | same page |
| Generative AI content: useful for research; must meet spam policies; many pages without added value may violate the scaled content abuse policy; generative models can be wrong, so "critical to manually factcheck and review"; review also applies to metadata (titles, descriptions, structured data, alt text); consider disclosing how content was created when it is generated automatically | https://developers.google.com/search/docs/fundamentals/using-gen-ai-content (opened 2026-11-12) |
| Crawling takes days to weeks; Request Indexing is quota-limited; URL Inspection API fields | `skills/indexing/references/sources.md` |
| Programmatic meta descriptions are acceptable when readable and varied; no length limit | `skills/titles-meta/references/sources.md` |
| Redirects and removal (301, 404, 410) | `skills/redirects-migration/references/sources.md`, `skills/tech-audit/references/sources.md` |

## Tool behaviour (sitetiller 0.1.0, run 2026-11-12 on two throwaway two-line drafts)
- `gate <folder> --json` returned `{"pages": 2, "passed": false, "errors": [{"id", "rule", "detail"}...]}` with rules `thin`, `no-assets`, `unsourced`, `title-length`. Text mode prints a table and sets exit code 1.
- Source of the rules: `cli/lib/extras.mjs` `pseoGate` (defaults minWords 600, maxShared 0.12, minSources 2, requireAssets 2; title 25 to 65 characters; description 110 to 165). `cli/bin/sitetiller.mjs` reads only the top level of the folder and only `.html` and `.md` files.

## Not verified
- Any number of pages, pages per day, or ratio that Google considers safe or abusive: none found; the skill says so. Batch sizes and wait times are this skill's own controls.
- That a passing gate lowers spam risk. It checks mechanics (length, duplication, sources). Google's policies turn on purpose and value to users.
- The tool's word, title and description limits are its own defaults, not Google's.
