---
name: hreflang
description: "Implement and audit hreflang for multi-language and multi-region sites using Google's localized versions rules: self-reference, reciprocal (return) links, fully-qualified URLs, x-default, language codes (ISO 639-1) with optional region codes (ISO 3166-1 Alpha 2), and the three equivalent methods (HTML link tags, HTTP headers, XML sitemap). Use when the user asks 'hreflang', 'multilingual SEO', 'wrong country version shows in Google', 'x-default', 'en-GB vs en-UK', 'hreflang return tag errors', 'international targeting', or 'translated pages compete'. Checks pages with the sitetiller page command (hreflang array) and a bundled script for reciprocity."
license: MIT
metadata:
  version: 0.1.0
---

# hreflang

Goal: each language or regional version points to all its alternates and to itself, with valid codes and URLs, so Google can show the right version to the right user. hreflang helps Google choose between your own versions. It does not raise rankings by itself, and the Google documentation read here makes no ranking claim.

## Inputs
- The list of localized URLs (or a page from each language), and which method the site uses.
- For each version: language, optional region, and whether any fallback page exists (language selector or auto-redirect home page).

## Rules (from Google's localized versions documentation)
| Rule | Detail |
|---|---|
| Methods | HTML `<link rel="alternate" hreflang="..." href="...">` in `<head>`, HTTP `Link:` header, or XML sitemap. Google calls the three "equivalent". One is enough; using all adds work and no search benefit |
| Self-reference | each version lists itself, and the set of tags is the same on every version |
| Reciprocal links | "If two pages don't both point to each other, the tags will be ignored." |
| URLs | fully qualified with protocol (`https://example.com/de/`); protocol-relative and root-relative URLs are not valid |
| Domains | alternates need not share a domain |
| Language code | ISO 639-1 (two letters), for example `en`, `de`, `pt` |
| Region code | optional, ISO 3166-1 Alpha 2, after the language: `en-GB`, `pt-BR`. A country code alone is invalid: `GB` by itself does nothing |
| Reserved codes | `EU`, `UN` and `UK` have no effect. Use `GB` for the United Kingdom |
| Case | values are case-insensitive; region conventionally uppercase |
| `x-default` | fallback for users who match no listed language or region (a selector page or an auto-redirecting home page) |
| Several regions of one language | add a generic language-only version as a catchall |
| Placement | HTML tags inside `<head>`; do not combine hreflang with other attributes such as `media` in the same tag |
| Duplicates | localized pages count as duplicates only if the main content is not translated; template-only translations (nav, footer) and regional variants with similar English content are valid hreflang uses |
| Canonical | `rel="canonical"` annotations with an `hreflang` attribute are not used for canonicalization (Google's duplicate URL documentation). Each localized version carries its own self-referencing canonical, as in Google's site move guide. Do not canonicalize all languages to one page |

## Steps
1. Read the annotations on one page:
   ```bash
   npx sitetiller page https://example.com/en/ --json
   ```
   The `hreflang` field is an array of `{ lang, href }` taken from the HTML `<link rel="alternate" hreflang>` tags. It is empty when none exist, or when the site uses only headers or sitemaps (the tool does not read those). Also read `lang` (the page's `<html lang>`), `canonical`, `noindex` and `finalUrl`.
2. Run the bundled check, which fetches up to `--max` alternates one at a time and tests reciprocity:
   ```bash
   node references/check-hreflang.mjs https://example.com/en/ --max 10
   ```
   The script is in this skill's `references/` folder. It prints `findings[]` with `level` `error` or `review`: missing self-reference, relative URLs, reserved region codes, an alternate that redirects, answers 4xx or 5xx, is noindex, or does not link back, duplicate codes pointing to different URLs, and codes that are not two letters (to review, because Google documents ISO 639-1). It does not verify that two-letter codes are real languages.
3. Compare the result with the rules table. Fix in this order: return links (most common reason annotations are ignored), then wrong codes, then redirecting or erroring alternates, then missing x-default.
4. For the full set of locales, run step 2 on a page from each language (it checks the alternates of the page you give it). The result of a few pages shows a systematic template bug; a clean sample does not prove all pages are clean, so say how many were checked.
5. If the site uses the sitemap method, read the sitemap by eye or with `curl`; each `<url>` must list all alternates including itself with `<xhtml:link rel="alternate" hreflang="..." href="..."/>`. Say honestly that the CLI does not parse these.
6. Make sure each alternate is indexable and in the sitemap (`sitemaps` skill). An alternate that is `noindex`, blocked by robots.txt or redirected cannot serve as a localized result.

## Common errors
| Symptom in the output | Cause | Fix |
|---|---|---|
| "No return link" | page B does not list page A, or lists a different URL for A (trailing slash, http vs https, parameters) | make both sides list the same exact URLs |
| "Page does not list itself" | self-reference missing | add the tag for the current URL |
| "Alternate redirects to another URL" | tag lists a redirecting URL | list the final URL |
| `en-UK` | reserved code | `en-GB` |
| `GB` or `US` alone | country without language | `en-GB`, `en-US` |
| `eng`, `deu` or `ceb` | not ISO 639-1 two-letter code (review: Google documents ISO 639-1) | use the two-letter code where one exists; check Google's documentation before using a three-letter code |
| root-relative `/de/` | not fully qualified | `https://example.com/de/` |
| `hreflang` plus `media` in one tag | not allowed to combine | split into separate tags |
| All languages canonicalized to the English page | contradicts hreflang | each version self-canonical |
| Same code to two URLs | ambiguous annotation | one URL per language-region |

## Real-world example (checked 2026-11-12)
`https://wordpress.org/` lists 157 hreflang tags. Running the script flagged `ca` pointing to both `ca.wordpress.org` and `ca-valencia.wordpress.org` (same code, two URLs) and a three-letter code `ceb`. These are review items, not proof of harm: the tool applies Google's documented rules, and Google does not state what it does in each of those cases.

## Output to the user
1. How many hreflang tags, which method, and how many alternates were tested.
2. The findings table, errors first, each with the URL.
3. The corrected tag set for the page (full list, same on every version).
4. What was not checked: headers, sitemaps, language-code validity beyond the shape, and pages not sampled.

## Guardrails
- Do not claim hreflang improves rankings or fixes duplicate content by itself.
- Do not use hreflang for sites with no real alternates.
- Do not guess code validity: cite the two standards (ISO 639-1 and ISO 3166-1 Alpha 2) and have the user check an official list.
- Do not auto-redirect users by language without an x-default or a visible selector; Google lists a selector page or auto-redirecting home page as x-default uses, and says nothing here about redirect safety, so do not promise it is safe.
- Read-only: do not change the user's pages.

## References
- `references/sources.md`: Google documentation, checked 2026-11-12.
- `references/check-hreflang.mjs`: the reciprocity checker.
