---
name: local-seo
description: "Local SEO for businesses with a physical location or a service area: how Google says local results are ranked (relevance, distance, prominence), Google Business Profile guidelines (eligibility, real-world name, address, service areas), LocalBusiness structured data checked with the schema command, one page per location, consistent name, address and phone on the site and profiles, Bing Places, and how agencies run this for clients. Includes what is forbidden: fake or incentivized reviews, review gating, keyword-stuffed business names, virtual-office addresses. Use when the user says 'local SEO', 'Google Business Profile', 'Google Maps ranking', 'near me', 'LocalBusiness schema', 'NAP', 'Bing Places', 'multi-location SEO', 'service area business', or 'get more reviews'."
license: MIT
metadata:
  version: 1.0.0
---

# Local SEO

For a business customers can visit or that travels to customers. The three things Google states drive local results are relevance, distance and prominence. Distance cannot be changed by the business; the rest is accurate data, a useful website, and honestly earned reviews and links.

## What Google says about local ranking (Business Profile Help, read 2026-11-12)
- Local results are "mainly based on" relevance, distance and prominence.
- **Relevance**: how well a Business Profile matches what someone searches for. Complete, detailed business information helps Google understand the business.
- **Distance**: how far each business is from the searcher. If the searcher shares no location, Google uses what it knows about their location.
- **Prominence**: how well known a business is. It depends partly on how many websites link to the business and on how many reviews it has. Google says more reviews and positive ratings can help local ranking.
- "There's no way to request or pay for a better local ranking on Google." Anyone selling a guaranteed local rank is selling something Google says does not exist.
The rest of this skill follows from those statements: be eligible, be accurate, be relevant, earn reviews and links.

## Inputs
- Business legal and trading name as used on the storefront, address (or service area), phone, opening hours, primary category, URL of each location page.
- Whether customers visit the location (storefront) or the business travels (service-area business).
- Access to the Business Profile (owner or manager), to Search Console, and to the website.
- Pages and profiles the user owns or is authorised to manage. For an agency: written client authorisation.

## Steps
### 1. Check eligibility and the profile against Google's guidelines
From the Business Profile guidelines (read 2026-11-12):
- Eligible: a business with a physical location customers can visit, or one that travels to customers. A service-area business gets one profile for a central office or location with a designated service area, and should generally hide its address.
- Not eligible: a rented mailing address or virtual office where the business does not operate. P.O. boxes and mailboxes at remote locations are not acceptable addresses. A service-area business cannot list a virtual office unless it is staffed during business hours.
- Name: it should reflect the real-world name used on storefront, website and stationery. Marketing taglines, store codes, hours, phone numbers, URLs and service or location details are not allowed in the name. Extra information in the name "could result in the suspension" of the profile.
- Each location has one page; a suite or mailbox number goes in Address Line 2.
- Google can suspend profiles that break the guidelines. Fix the profile before any other work.

### 2. One useful page per location
Each location gets its own indexable page on the site with facts of its own: street address, phone, hours, how to get there (parking, transit), staff or services actually available there, photos taken there, and its own reviews or case examples if the business has them. Do not create one page per suburb or keyword for a business that has no presence there; Google's spam policies call pages made to rank for similar queries that funnel to one destination doorway abuse (`pseo-quality-gate`). Link the location pages from the main navigation or a locations hub with plain `<a href>` links (`internal-links`).
```bash
npx sitetiller page https://example.com/locations/austin --json
npx sitetiller pages example.com --pages 30 --json
```
Read `status`, `title`, `description`, `canonical`, `noindex`, `h1`. Each location needs its own title, description and canonical, not the homepage's.

### 3. LocalBusiness structured data
```bash
npx sitetiller schema https://example.com/locations/austin --json
```
Google's LocalBusiness documentation requires `name` and `address` (a `PostalAddress`). Recommended: `openingHoursSpecification`, `telephone`, `url` (a working link to that location), `geo` (latitude and longitude to at least 5 decimal places), `priceRange` (under 100 characters). Rules from the same page:
- Use the most specific LocalBusiness subtype (for example Restaurant or DaySpa); `additionalType` is not supported.
- Mark up each location as its own LocalBusiness on its own page.
- `aggregateRating` and `review` on LocalBusiness are for sites that collect reviews of other local businesses. Google's review snippet guidance says pages are ineligible for star results when a business controls its own reviews, including through a widget. Do not add your own reviews as markup.
- Markup must match what visitors can see on the page.
The linter reports a missing `name` or `address` as errors and missing `telephone`, `openingHoursSpecification`, `geo` as warnings. The linter maps only Restaurant, Store and Dentist to LocalBusiness checks; for other subtypes it checks nothing, so read Google's page. Finish with Google's Rich Results Test (see `schema`).

### 4. Name, address and phone (NAP) consistency
Build a table with one row per place the business appears: Business Profile, website footer and location page, schema, Bing Places, Apple Maps, social profiles, and directories the user already uses. Columns: name, address, phone, hours, URL. Differences from the real-world details are errors to fix at the source. This matches Google's requirement that profile name and address reflect the real-world business. The CLI cannot read your Business Profile or the directories, so the table is filled by hand from screenshots or exports; `schema` shows only that the markup has the properties, so read the values on the page.
Not verified: that matching details across third-party directories is a Google ranking factor. Google's pages read for this skill do not say so. Keep details consistent because customers and Google's own checks need them correct.

### 5. Bing Places
Bing's local listings are managed in Bing Places for Business (bingplaces.com redirected to bing.com/forbusiness on 2026-11-12). No Microsoft documentation was readable during authoring, so import options, verification methods and processing times are not stated here. Ask the user to open Bing's current help and follow it, and to use the same name, address, phone and hours as on the Business Profile.

### 6. Reviews, honestly
Google's contribution policy (read 2026-11-12) says:
- Reviews must reflect a genuine experience. Fake engagement is removed.
- Paid reviews are prohibited, directly or in kind.
- Reviews from people with a conflict of interest (current or former employees, relatives, contractors) are prohibited.
- Businesses may not offer payment, discounts or free goods or services for reviews, including in exchange for changing or removing a negative review.
- Review gating is prohibited: do not discourage negative reviews or selectively ask only happy customers.
- Businesses may ask for reviews that reflect genuine experiences, but not by pressuring customers on the premises or asking for specific content. Asking staff to collect a set number of reviews or reviews that name a staff member is not allowed.
Practical routine: send every customer the same neutral request with the Business Profile review link, reply to reviews (Google notes replying shows you value feedback), and report suspected fake or conflict-of-interest reviews of competitors or your own page through Google's reporting tools rather than writing your own.

### 7. Measure
- Search Console: queries with a place name or "near me" (`gsc --dims query`, `brand` to split brand terms), and the location pages (`--dims page`).
- Business Profile performance data is read in Google's interface; the CLI does not read it.
- Page changes: `measure-rollback` on location pages against similar location pages you did not edit.

## How agencies use it
- Per client: a one-page record of legal and trading name, address or service area, phone, hours, category, location URLs, who owns the Business Profile, and the authorisation. Never request a client's Google password; ask the client to give access through Google's own sharing.
- Onboard with steps 1, 3 and 4; set the weekly routine (`weekly-check`) on the location pages; report monthly (`seo-report`) with non-branded clicks first.
- Multi-location clients: one location page and one profile per real location, each with its own data. Refuse requests to add locations that do not exist, keyword-stuffed names, virtual-office addresses and review buying, since the client's profile pays for it.

## Output to the user
1. Eligibility and guideline findings per profile, quoting the guideline.
2. Location page table: URL, title, description, canonical, indexable, schema findings.
3. NAP table with differences marked.
4. A short action list and who does each item. No promise of ranking.

## NAP consistency check
```bash
npx sitetiller nap https://example.com/ https://example.com/contact https://www.yelp.com/biz/example --name "Bright Teeth" --phone "+1 555 010 2000" --address "12 Main Street, Springfield" --json
```
Reads LocalBusiness/Organization JSON-LD, `tel:` links and visible phone numbers on each page the user names, normalises them (digits only; Street/St, Suite/Ste) and compares with the expected values. Output: `consistent`, `distinctPhones`, and `rows[]` with what each page shows and its `issues`. Listing sites often block automated fetches or render with JavaScript: check those by hand, and fetch only listings the user named.

## Guardrails
- Never write, buy, trade or incentivize reviews, and never help gate them. Never create profiles for locations that do not exist or are not staffed.
- Never put keywords, taglines or locations in the business name field.
- Do not state that Google ranks by citations, NAP or directory counts; Google's ranking help names relevance, distance and prominence.
- Do not copy another business's text, photos or reviews.
- Edit only sites and profiles the user owns or is authorised to manage.

## References
- `references/sources.md`: Google Business Profile Help, Google's contribution policy and structured data documentation with access dates; what could not be verified.
