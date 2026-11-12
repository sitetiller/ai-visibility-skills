# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| FAQ rich results: deprecation notice added 2026-05-08, feature "will no longer appear in Google Search starting May 7, 2026"; documentation removed 2026-06-15 | https://developers.google.com/search/docs/appearance/structured-data/faqpage |
| Search gallery lists Article, Breadcrumb, Organization, Software app, Product, Review snippet, Video, Profile page, Q&A among others; FAQ, HowTo and Sitelinks searchbox are not listed in it | https://developers.google.com/search/docs/appearance/structured-data/search-gallery |
| SoftwareApplication: required `name` and `offers.price` (0 for free, add priceCurrency for paid), plus `aggregateRating` or `review` ("must include one of the following"); recommended `applicationCategory` and `operatingSystem`; MobileApplication and WebApplication supported as subtypes; guideline violations can lead to a manual action and the markup is then ignored | https://developers.google.com/search/docs/appearance/structured-data/software-app |
| Article: no required properties, all recommended; author guidance (every author, separate entries, `url` or `sameAs`, only the name in `author.name`); `dateModified` ISO 8601 with timezone | https://developers.google.com/search/docs/appearance/structured-data/article |
| Organization: no required properties; recommended list (name, alternateName, legalName, description, url, logo, email, telephone, contactPoint, address, sameAs, identifiers and others) | https://developers.google.com/search/docs/appearance/structured-data/organization |
| BreadcrumbList: required `itemListElement` with at least two ListItems; ListItem needs `position`, `name`, `item` (item optional on the last); trail should be a typical user path; still supported on desktop | https://developers.google.com/search/docs/appearance/structured-data/breadcrumb |
| Review snippet: ratings and reviews must be visible; ratings from users; do not aggregate reviews from other sites; no fake or undisclosed incentivized reviews; self-serving reviews make LocalBusiness or Organization pages ineligible for stars; reviews must refer to a specific item, not a list or category | https://developers.google.com/search/docs/appearance/structured-data/review-snippet |
| Product, Event and LocalBusiness requirements used by the CLI lint (`cli/lib/schema-lint.mjs`) | https://developers.google.com/search/docs/appearance/structured-data/product-snippet , /event , /local-business (not re-opened in this pass; listed as the source named in the CLI) |

## Not verified in this pass
- Product, Event and LocalBusiness property lists: the CLI cites these pages, they were not re-read here. The skill states only that the lint covers them and sends users to the Rich Results Test.
- HowTo: absence from the search gallery was verified; no separate Google statement on HowTo was read.
- The Rich Results Test URL is Google's documented tool; its current UI behaviour was not tested.
