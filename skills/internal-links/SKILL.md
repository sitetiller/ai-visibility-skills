---
name: internal-links
description: "Find orphan and weakly linked pages from the sitemap and a crawl sample (links), check anchor text against Google's link best practices, and add contextual internal links without spam. Covers crawlable links, descriptive anchors, where links belong, hub-to-spoke linking and how to measure the effect. Use when the user says 'internal linking', 'orphan pages', 'add internal links', 'anchor text', 'pages with no links', 'link my new post', 'site architecture links'."
license: MIT
metadata:
  version: 0.1.0
---

# Internal links: crawlable, descriptive, in context

Google's documented position: every important page should be linked from at least one other page, links should be crawlable `<a href>` elements, and anchor text should be descriptive, reasonably concise and relevant. It publishes no ideal number of internal links per page. The skill finds pages that fail the first rule and fixes anchors, without inventing quotas.

## Inputs
- The site URL (public, with an XML sitemap; `links` compares the sitemap with what it crawls).
- Optionally a query+page export (`gsc`) to choose which pages deserve links first.
- Pages the user owns and may edit.

## Steps
1. Find orphans and weak pages:
   ```bash
   npx sitetiller links https://example.com --pages 100 --json
   ```
   Output: `sitemapUrl`, `listed`, `crawled`, `orphans` and `weak`, each row `{url, linkedFrom, anchors}`. `linkedFrom` counts crawled pages linking to it. `weak` means linked from 1 or 2 crawled pages. The crawl is a spread sample of the sitemap, so a page listed as orphan is "not linked from the sample". Raise `--pages` and re-run before acting on important pages. The command fetches one page at a time with delays; do not run several at once.
2. Rank candidates. Use impressions from `gsc` (`striking` for positions 4-20) or business value. A page with queries at positions 4-20 and no links is the first target.
3. Check the page itself:
   ```bash
   npx sitetiller page https://example.com/guides/invoice-template --json
   ```
   Fields: `internalLinks`, `links[]` (`href`, `internal`, `anchor`). Look for empty anchors, generic anchors ("click here", "read more"), image links without alt, and links that are not `<a href>` (JavaScript-only, `onclick`, `span`). Google cannot reliably follow those.
4. For each target page, find 3-5 existing pages where a reader of that page would plausibly want the target. Pick pages on the same topic first (`topic-clusters`), and pages that already have traffic.
5. Write the link into a sentence where it helps the reader, then use anchor text that:
   - describes the target page and makes sense read alone (Google's own test),
   - is reasonably concise, relevant to both pages, and varies naturally,
   - is not a repeated exact-match keyword.
   Example: instead of `click here`, write `see the <a href="/guides/invoice-template">invoice template with payment terms</a>`.
6. Add navigation links where structure calls for them: breadcrumbs, hub page lists, related-pages blocks written by hand or from data, not by keyword string match.
7. Re-run `links` after the edits. Orphans should drop to zero for the pages touched. Track the effect with `measure-rollback`: pages that gained links against matched pages that did not, 28 days.

## Anchor review table
| Pattern | Problem | Fix |
|---|---|---|
| `click here`, `read more`, `this` | No context for reader or Google | Name the destination |
| Image link, empty alt | Empty link, no anchor text | Add descriptive alt text; Google uses it as anchor text |
| Long sentence as anchor | Hard to read, diluted | Cut to the descriptive core |
| Same exact-match anchor on dozens of pages | Looks forced | Vary by context; one clear anchor per sentence |
| Two links to the same page in one paragraph | Noise | Keep the more useful one |
| Link text unrelated to the target | Misleads readers | Make anchor and target agree |
| JavaScript-only navigation | May not be followed | Use `<a href>` with a real URL |

## Without spam
- Link only where the destination helps the reader at that moment.
- No hidden links, no links in footers stuffed with keyword lists, no auto-inserting links on every occurrence of a word.
- Do not add links to pages the user marked noindex or that redirect.
- Do not chain links back to back or put many links in one block.
- Pages not worth linking (thin, duplicate, outdated) should be improved, merged or removed instead (`cannibalization`, `content-decay`).

## Output to the user
1. Orphans and weak pages with `linkedFrom` and the crawl coverage (`crawled` of `listed`).
2. For each target: the source pages, the sentence, the anchor and the HTML to add.
3. Anchors to rewrite, with current and proposed text.
4. Measurement plan and a reminder that the crawl is a sample.

## Guardrails
- Do not state a target link count per page. Google gives none.
- Do not edit pages the user did not name. Provide the proposed text for them to apply.
- Do not use `nofollow` on internal links to "sculpt" signals; use it only for untrusted external sources, with `sponsored` for paid links and `ugc` for user-submitted links, per Google.
- Treat orphan results as sampling output until confirmed with a larger crawl or the user's own CMS data.

## References
- `examples/links.json`: real output of this skill's command on sitetiller.com (2026-11-13), see `examples/README.md`.
- `references/sources.md`
