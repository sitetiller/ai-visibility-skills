---
name: schema
description: "Lint and plan structured data (JSON-LD) for a page: checks Google's required properties, flags Software application markup without aggregateRating or review, notes that FAQ rich results ended on 2026-05-07 and that HowTo is not in Google's gallery, picks types per page type, shows a valid @graph example, and ends with the Rich Results Test. Uses the schema and schema-gen commands. Use when the user says 'structured data', 'schema markup', 'JSON-LD', 'rich results', 'add schema', 'FAQ schema', 'SoftwareApplication schema', 'why no stars in Google'."
license: MIT
metadata:
  version: 0.2.0
---

# Structured data: only what Google documents, only what is on the page

Google says structured data does not guarantee a rich result, and the markup must describe content visible on the page. The skill lints what is on a live page, recommends types per page type from Google's search gallery, and sends the final check to Google's Rich Results Test.

## Inputs
- The URL of a live page (or the user's draft JSON-LD to paste in a test page they own).
- Page type: article, product or software page, comparison, homepage, tool.

## Steps
1. Lint:
   ```bash
   npx sitetiller schema https://example.com/guides/invoice-template --json
   ```
   Output: `url`, `status`, `types` (type to count) and `findings` (`level` error, warning or info; `type`; `message`; `doc` link). Errors are missing properties that Google documents as required for the rich result. Warnings are recommended properties or duplicated entities. Info lines mark features that no longer produce rich results.
2. Interpret with the table.

| Finding | Meaning | Action |
|---|---|---|
| Invalid JSON-LD | The block does not parse; Google cannot read it | Fix syntax (trailing commas, unescaped quotes) |
| SoftwareApplication missing `offers.price` | Google requires `name` and `offers.price` (use `0` for free; add `priceCurrency` for paid) | Add the price shown on the page |
| SoftwareApplication missing `aggregateRating` or `review` | Google says one of the two must be included | Add genuine, visible user ratings, or do not use this type for rich results (see rules below) |
| Product missing review, aggregateRating or offers | Google's product snippet needs one of them in addition to `name` | Add from real data on the page |
| Article recommended properties | Google lists no required properties for Article, only recommended ones | Add `headline`, `image`, `datePublished`, `dateModified`, `author` where true |
| FAQPage found | Google's FAQ rich results stopped appearing on 2026-05-07 | Keep the visible Q&A for readers; markup earns no Google rich result. Remove or leave, but do not add it for Google |
| HowTo found | Not in Google's structured data gallery | Same as above; do not add for Google |
| More than one Organization, WebSite, Article, Product or SoftwareApplication | Theme and plugin both output it | Keep one source, remove the duplicate |

3. Choose types by page type. Use a type only if the page really is that thing and the data is visible:
   | Page type | Use | Notes |
   |---|---|---|
   | Blog post, guide | `Article` (or `BlogPosting`), `BreadcrumbList` | Article has no required properties; add author (name only in `author.name`, plus `url` or `sameAs`), `datePublished`, `dateModified` with timezone |
   | Homepage / about | `Organization`, `WebSite` | Organization has no required properties; useful ones: `name`, `url`, `logo`, `sameAs`, `contactPoint`. `WebSite` can inform the site name |
   | SaaS product page | `SoftwareApplication` (or `WebApplication`) | Requires `name`, `offers.price`, and `aggregateRating` or `review`. Only mark up ratings from real users that are visible on the page |
   | Physical or digital product with price | `Product` | See Google's product snippet doc |
   | Any page in a hierarchy | `BreadcrumbList` | At least two `ListItem`s, each with `position`, `name`, `item` (last item may omit `item`); trail should reflect a typical user path |
   | Video page | `VideoObject` | Only for video actually on the page |
   | Comparison / alternatives pages | `Article` + `BreadcrumbList`; do not use `Review` or `AggregateRating` for your own editorial scoring (see `comparison-pages`) | |
   | FAQ, HowTo | none for Google rich results | |

4. Write JSON-LD in one `@graph` per page, linked by `@id`. Example for a guide page (replace every value with real, visible data):
   ```json
   <script type="application/ld+json">
   {
     "@context": "https://schema.org",
     "@graph": [
       { "@type": "Organization", "@id": "https://example.com/#org", "name": "Example Inc.", "url": "https://example.com/", "logo": "https://example.com/logo.png", "sameAs": ["https://www.linkedin.com/company/example"] },
       { "@type": "WebSite", "@id": "https://example.com/#site", "url": "https://example.com/", "name": "Example", "publisher": { "@id": "https://example.com/#org" } },
       { "@type": "BreadcrumbList", "@id": "https://example.com/guides/invoice-template#crumbs", "itemListElement": [
         { "@type": "ListItem", "position": 1, "name": "Guides", "item": "https://example.com/guides" },
         { "@type": "ListItem", "position": 2, "name": "Invoice template" } ] },
       { "@type": "Article", "@id": "https://example.com/guides/invoice-template#article", "headline": "Invoice template with payment terms", "image": "https://example.com/img/invoice.png", "datePublished": "2026-10-01T09:00:00+00:00", "dateModified": "2026-11-05T09:00:00+00:00", "author": { "@type": "Person", "name": "Jane Doe", "url": "https://example.com/about/jane" }, "publisher": { "@id": "https://example.com/#org" }, "mainEntityOfPage": "https://example.com/guides/invoice-template" }
     ]
   }
   </script>
   ```
   To start from the user's facts instead of hand-writing, generate and lint in one step:
   ```bash
   npx sitetiller schema-gen article --headline "Invoice template with payment terms" --url https://example.com/guides/invoice-template --datePublished 2026-10-01T09:00:00+00:00 --author "Jane Doe" --publisher "Example Inc." --image https://example.com/img/invoice.png
   npx sitetiller schema-gen software --name "Example" --price 0 --currency USD --category BusinessApplication --os Web
   npx sitetiller schema-gen breadcrumb --items "Guides|https://example.com/guides,Invoice template|https://example.com/guides/invoice-template"
   ```
   Types: organization, website, article, product, software, localbusiness, breadcrumb, event, person. Empty inputs are left out, never filled with placeholders; the lint under the output lists what is still required or recommended. Ratings and reviews are never generated: `--rating` and similar inputs are ignored with a note, because they must come from real reviews visible on the page.
   Put `Organization` and `WebSite` on the pages where they belong (homepage or all pages, one source), not as multiple copies.
5. Re-run the lint after editing. Then run Google's Rich Results Test on the URL (https://search.google.com/test/rich-results) and look at Search Console enhancement reports after Google recrawls. The lint is not a replacement for the test: it checks only the properties listed in this skill, not every Google rule.

## Rules for eligibility
- Markup must match visible content; reviews and ratings must be visible to users.
- Ratings must come from users. Do not write reviews or ratings of your own product to mark up, and do not aggregate reviews from other sites.
- Guideline violations can lead to a manual action, after which the structured data is ignored.

## Output to the user
1. Types found and findings by level, each quoting the message.
2. Recommended types for this page type and why.
3. The corrected JSON-LD, ready to paste, with the properties filled from visible page content only and `TODO` markers where data is missing.
4. The Rich Results Test link and what to check afterwards.

## Guardrails
- Never invent ratings, review counts or prices. If a required value is not on the page, say the type cannot qualify.
- Do not add FAQPage or HowTo markup expecting rich results.
- Do not mark up content that is not visible on the page.
- The lint covers a short list of types (Article, SoftwareApplication, Product, Event, LocalBusiness); for other types use Google's documentation and the Rich Results Test.
- Edit only pages the user owns.

## References
- `examples/schema.json`, `examples/schema-gen.json`: real output of this skill's command on sitetiller.com (2026-11-13), see `examples/README.md`.
- `references/sources.md`
