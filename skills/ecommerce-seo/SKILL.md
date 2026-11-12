---
name: ecommerce-seo
description: "SEO for online stores: Product structured data for product snippets versus merchant listings as Google documents them (required properties, Offer, availability values, variants with ProductGroup), faceted navigation and filter URLs (Google's faceted navigation guide: robots.txt, canonical, nofollow, 404 for empty combinations), pagination, out-of-stock and discontinued products, and canonical choices for variants. Uses the schema, page, pages, sitemap and robots-test commands plus the canonicals skill. Use when the user says 'ecommerce SEO', 'product page SEO', 'category pages', 'faceted navigation', 'filter URLs', 'out of stock pages', 'product schema', 'merchant listing', 'product variants canonical', 'Shopify SEO', 'WooCommerce SEO', or 'crawl budget on my store'."
license: MIT
metadata:
  version: 0.1.0
---

# Ecommerce SEO

A store makes many URLs from few products: variants, filters, sort orders, pagination, sessions. The work is to let Google crawl and understand the product and category pages that should rank, and to keep the rest from swamping them. Every rule below comes from a Google documentation page listed in `references/sources.md`. Where Google has no page on a question, the skill says so.

## Inputs
- Store URL and platform; 3 to 5 sample URLs: a product with variants, a category, a filtered category (`?color=red`), a paginated category (page 2), an out-of-stock product.
- The robots.txt as it is today, and the sitemap location.
- Whether the store sells the products itself (merchant listings) or reviews or compares products sold elsewhere (product snippets).
- Optional: Search Console access (`setup`), Merchant Center access (read-only help from the user).

## Step 1: Product structured data
Google uses `Product` markup for two features, and the right one depends on the page.
| Feature | Page | Required (Google) | Notes |
|---|---|---|---|
| Product snippets | Product review pages, aggregators, and other product pages | `name`, plus one of `review`, `aggregateRating` or `offers` | `offers` alone can trigger a warning in the Rich Results Test |
| Merchant listings | Pages where shoppers can buy the product | `name`, `image`, `offers` as an `Offer` with `price` (above zero) and `priceCurrency` | Use `Offer`, not `AggregateOffer`: the merchant must be the seller |
Recommended for merchant listings: `aggregateRating`, `brand.name`, `description`, GTIN fields, `mpn`, `sku`, `review`, and on the Offer `availability`, `itemCondition`, `priceValidUntil`, `url`, `shippingDetails`, `hasMerchantReturnPolicy`.
More rules from Google's pages:
- Product rich results support pages that focus on one product or on variants of the same product. Google recommends marking up product pages rather than pages that list products or a category.
- Availability is one value, such as `InStock`, `OutOfStock`, `SoldOut`, `BackOrder`, `PreOrder`, `LimitedAvailability`, `Discontinued`. Do not give more than one.
- Shipping details need `deliveryTime`, `shippingDestination` and `shippingRate`; a return policy needs `applicableCountry` and `returnPolicyCategory`. These can also be set in Merchant Center or Search Console. When defined in several places, Google lists a precedence order (product feeds first, organization-level markup last).
- Ratings must come from real users and be visible on the page (see `schema`).
```bash
npx sitetiller schema https://store.example/products/blue-mug --json
```
The linter covers the product snippet rule: it errors when `name` is missing or when none of `review`, `aggregateRating`, `offers` is present, and warns when `image`, `brand` or `offers.price` is missing. It does not check merchant listing requirements such as `priceCurrency`, a price above zero, or shipping and return fields. Check those against the list above and in the Rich Results Test and Search Console's merchant listing reports.
Many stores output `Product` twice (theme plus plugin); the linter warns about duplicates. Keep one source.

## Step 2: Variants
Google's product variants page:
- Group variants with `ProductGroup` (`name` required), nest `Product` entries in `hasVariant` or point back with `isVariantOf`, list the differing attributes in `variesBy` (full schema.org URLs such as `https://schema.org/color`, `https://schema.org/size`), and use `productGroupID` (the parent SKU; if given on both group and variants, they must match). Each variant needs a unique identifier such as `sku` or `gtin`.
- The site must let users preselect each variant by its own URL, for example `/coat?size=small&color=green`, showing the right image, price and availability and letting the user add that variant to the cart. A single-page site should have one canonical URL for the `ProductGroup`.
Canonical choice, from Google's two pages on this:
- The ecommerce URL design page gives each variant its own URL (path or query parameter), and says that when optional parameters identify variants, the URL with the parameter omitted is the canonical one; variant pages with unique URLs point their canonical to the main product URL; use self-referencing canonicals on other indexable pages.
- The product variants page requires each variant to be reachable by a distinct URL.
The two pages do not say which to prefer, so this is the skill's judgment: keep the variant URL working and shareable, and point its canonical at the main product URL when the variants are one product to shoppers; give a variant its own self-referencing canonical only when it is a different product people search for separately (a different model, not a different colour). Check that the canonical Google chose matches yours (`inspect`, `googleCanonical` against `userCanonical`) and read the `canonicals` skill for signals and conflicts.
```bash
npx sitetiller page "https://store.example/coat?size=small&color=green" --json
```
Read `canonical`, `canonicalCount`, `noindex`, `status`.

## Step 3: Faceted navigation and filter URLs
Google's guide says filters built on URL parameters can create a very large number of URLs, causing overcrawling and slower discovery of new pages. Choose per filter:
| Goal | Option | What Google says |
|---|---|---|
| Filter URLs need not appear in Search | `robots.txt` disallow on the filter parameters; keep product pages and the unfiltered listing crawlable | Google's example disallows the `products`, `color` and `size` parameters and allows `/*?products=all$` |
| Same | Fragments (`#color=red`) for filters | Generally not supported for crawling and indexing, so filters after `#` have no effect on crawling either way |
| Same | `rel="canonical"` from filtered to unfiltered | "may, over time, decrease the crawl volume"; less effective long term than robots.txt or fragments |
| Same | `rel="nofollow"` on links to filter URLs | Works only if every anchor to that URL has it; less effective long term |
| Filtered pages should rank (for example "red running shoes") | Let them be crawled and indexed | Use `&` as the parameter separator, keep path filter order consistent, return HTTP 404 for empty or invalid combinations at that URL (not a redirect to a generic error page) |
Google also says: use `?key=value` parameters, do not repeat a parameter, do not link internally to session IDs or tracking codes, and keep sort-order variations out of the index with `noindex` or robots.txt.
A robots.txt disallow stops crawling, so Google cannot read `noindex` or a canonical on a blocked page. Do not use both on the same URLs.
Test a draft robots.txt before it ships:
```bash
npx sitetiller robots-test robots.txt "/shoes?color=red" "/shoes" "/products/blue-mug" --agents Googlebot
```
Output: allowed or BLOCKED per path with the matching rule and line. Expect the product and the unfiltered category to be allowed.
Deciding which facets deserve a page: take Search Console queries (`gsc --dims query,page`) and keep indexable only the filter combinations people search for and the store has stock for; see `topic-clusters` and `pseo-quality-gate`. Do not generate a page for every combination.

## Step 4: Pagination
Google's pagination guidance: give each page its own URL (for example `?page=2`); each page has its own canonical, and do not make page 1 the canonical for the whole sequence; Google no longer uses `rel="next"` and `rel="prev"`; link pages with real `<a href>` links; infinite scroll and "load more" that need a click or scroll may not be crawled, so provide paginated URLs or another crawlable path; use one URL form everywhere (always with or always without `?page=1`).
```bash
npx sitetiller page "https://store.example/shoes?page=2" --json
npx sitetiller links store.example --pages 50 --json
```
Read `canonical` (should be page 2 itself) and, in `links`, products that no crawled page links to (`orphans[]`, with the sample-size caveat in `tech-audit`).

## Step 5: Out-of-stock and discontinued products
Google has no Search page in the ecommerce documentation section that covers out-of-stock pages (the section index was read on 2026-11-12). What its pages do say:
- **Temporarily out of stock**: keep availability in the markup and the visible page the same. `OutOfStock` is a valid availability value for merchant listings, and Merchant Center requires that the availability in the product data match the landing page and checkout; a mismatch can disapprove the product. Keep the URL, the content and internal links, show the status plainly, and offer a back-in-stock option if the store has one.
- **Permanently discontinued**: Merchant Center says not to set out of stock for products you no longer sell; remove them from the product data. For the page, choose by the replacement: a close replacement exists, then a 301 to it; none exists, then a 404 or 410 (Google treats 4xx as removal; a "not found" message served with status 200 is a soft 404). Google's site move guidance advises against redirecting many old URLs to the home page. See `redirects-migration` and `indexing`.
- **Empty categories**: Google's URL design page says to use a `noindex` robots meta tag for a category with no items, or to return 404 if the site removes empty categories automatically.
Not verified: reports that Google requires a disabled buy button on out-of-stock pages. It was found only in a news article, not on a Google page.
After the change, check one example of each case:
```bash
npx sitetiller page https://store.example/products/old-mug --json
```
Read `status` (200, 301 or 404), `chain[]`, `noindex`, and `schema` for the availability value.

## Step 6: Sitemap and crawl check
```bash
npx sitetiller sitemap store.example --sample 20 --json
npx sitetiller pages store.example --pages 30 --json
```
The sitemap should list canonical, indexable product and category URLs that answer 200: no filter or sort URLs, no redirecting, noindex or 404 URLs. Read `urlCount`, `issues[]`, `sample[]` (`status`, `noindex`, `redirectedTo`). In `pages`, read `duplicateTitles`, `duplicateDescriptions`, `missingDescription`, `schemaTypes`; products that share one manufacturer description are near-duplicates (see Google's thin affiliation definition if the text is copied from merchants).

## Product and category page content
Write for the shopper: what it is, specs, price, availability, returns, delivery; photos taken by the store; reviews only from real customers. Do not copy manufacturer or merchant descriptions as the only text. Category pages need an intro that helps a buyer choose (sizes, uses, differences) and crawlable links to products; keep promotional text out of review markup.

## Output to the user
1. Table: URL type (product, variant, category, filter, page 2, out of stock), status, canonical, noindex, schema findings, robots.txt result.
2. Issues ranked by impact and effort, each with the command evidence and the Google page behind it.
3. A decision per facet and per out-of-stock case.
4. Measurement plan: `measure-rollback` on changed templates against untouched ones; Search Console Page indexing and merchant listing reports.

## Guardrails
- Edit only stores the user owns. Recommend changes; do not change robots.txt or templates yourself.
- Do not disallow product pages or the unfiltered category while blocking filters. Test with `robots-test` first.
- Do not mark up ratings or reviews the shoppers cannot see, or reviews the store wrote about itself.
- Do not invent availability, prices or reviews to pass the linter.

## References
- `references/sources.md`: Google documentation read, dates, tool behaviour and what was not verified.
