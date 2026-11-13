---
name: site-architecture
description: "Plan or audit how a site's pages are organised: URL structure, folder hierarchy, click depth from the home page, navigation and breadcrumbs, hub (category) pages and their spokes, crawlable links, faceted and parameter URLs, and where new pages should live. Measures depth, orphans and redirect links with a crawl. Use when the user asks 'site structure', 'URL structure', 'information architecture', 'how deep should pages be', 'categories or tags', 'breadcrumbs', 'subfolder or subdomain', 'hub pages', or 'where should these new pages go'. Uses sitetiller crawl, links and pages."
license: MIT
metadata:
  version: 0.2.0
---

# Site architecture

Goal: every important page is reachable through plain links in a few clicks, URLs say where a page sits, and related pages link to each other through a hub. New pages get a home before they are written.

## Steps
1. Crawl from the home page (polite: one request at a time, robots.txt respected):
   ```bash
   npx sitetiller crawl https://example.com --max 200 --json
   npx sitetiller links https://example.com --pages 100 --json
   ```
   From `crawl`: each page's `depth` (clicks from the start URL), `deep-page` findings (over 3 clicks), `no-internal-links`, `link-to-redirect`, `broken-internal-link`, and `blockedByRobots`. From `links`: sitemap URLs that no crawled page links to (`orphans`) and weakly linked ones.
2. Map the current structure: group URLs by first folder (`/blog/`, `/tools/`, `/docs/`), count pages per group, and list the hub page of each group. A group without a hub page that links to its members is the first gap.
3. Apply the rules:
   - **Links Google can follow:** `<a href="...">` with a real URL. Not buttons with click handlers, not links that only exist after a user action.
   - **Descriptive URLs:** words separated by hyphens, readable folders, one URL per piece of content; avoid session IDs and endless parameter combinations.
   - **Depth:** keep revenue and key content pages within about three clicks of the home page (a working rule; Google publishes no number). Hubs and breadcrumbs are how large sites do this.
   - **Breadcrumbs:** visible on the page and marked up with `BreadcrumbList` (`npx sitetiller schema-gen breadcrumb --items "Home|https://example.com/,Guides|https://example.com/guides/"`).
   - **Faceted navigation and parameters:** decide which filter combinations deserve indexable pages; keep the rest out of links or canonicalised (`canonicals`, `ecommerce-seo`).
   - **Subfolder vs subdomain:** Google's documentation sets no preference. Choose what is easier to maintain; when a blog or docs belong to the same product, a subfolder keeps navigation and internal links in one site and one Search Console property.
4. Place new pages: name the hub each new page belongs to, the URL it will get, and the two or three existing pages that will link to it (`topic-clusters`, `internal-links`).
5. Changes to existing URLs are migrations: map every old URL to a new one and 301 it (`redirects-migration`). Do not move URLs for small structure gains.

## Output to the user
1. Folder map with page counts, hub per folder (or "missing").
2. Depth distribution (how many pages at 0, 1, 2, 3, 4+ clicks) and the deepest important pages.
3. Orphans, broken internal links and links to redirects, with the pages that hold them.
4. A target structure: hubs, URL pattern, breadcrumb trail, and where new pages go.

## Guardrails
- Crawl only the user's site, with the default delay; do not raise `--max` beyond what is needed.
- Do not recommend changing existing URLs unless the gain is large and a redirect map exists; never on pages the user did not name.
- The three-click depth is a heuristic; say so.
- Do not hide links from Google with JavaScript-only navigation or `nofollow` on internal links to "sculpt" PageRank.

## References
- `references/sources.md`: Google URL structure, crawlable links, breadcrumbs, faceted navigation, site moves, checked 2026-11-13.
