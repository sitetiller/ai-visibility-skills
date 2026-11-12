---
name: redirects-migration
description: "Plan, run and monitor a site move or URL change (domain change, HTTPS move, new URL structure, CMS or replatform) following Google's site move guide: build the old-to-new URL mapping CSV, choose 301/308 over 302, avoid redirect chains, test every mapped URL, use the Change of Address tool only when it applies, and watch the result. Use when the user says 'migrate my site', 'change domains', 'redirect map', '301 vs 302', 'redirect chain', 'site move', 'new URL structure', 'did my migration lose traffic', 'Change of Address', or 'replatforming SEO checklist'. Uses sitetiller page, version and decay."
license: MIT
metadata:
  version: 0.1.0
---

# Redirects and site moves

Goal: every old URL that matters ends at the right new URL in one permanent hop, the new site is crawlable and indexable, and the move is monitored until Google has seen every old and new URL. Google warns to expect temporary ranking fluctuation, and that for medium sites showing the new URLs can take a few weeks or more. Promise no traffic outcome.

## Inputs
- Type of change: domain or subdomain move, HTTP to HTTPS, path or URL structure change within a site, CMS migration, or a mix. Google advises changing one thing at a time.
- The old URL list (sitemaps, analytics, server logs, the Search Console links report, the CMS) and the new structure.
- Access: Search Console owner on both old and new properties for a domain move.

## Steps

### 1. Baseline before touching anything
```bash
npx sitetiller sitemap old-site.com --json
npx sitetiller gsc old-site.com --start 2026-08-01 --end 2026-10-31 --dims page --out before-pages.csv
npx sitetiller version snapshot https://old-site.com/ --label before-move
npx sitetiller version snapshot https://old-site.com/top-page/ --label before-move
```
Keep `before-pages.csv`, the old sitemap, and logs. `version snapshot` stores title, description, H1, canonical, noindex, schema types, word count and a text hash in `./.sitetiller/` so you can later show what changed. Snapshot the top pages (by clicks in the CSV), not every page.

### 2. Build the URL mapping
Google's guide: collect old URLs from sitemaps, analytics, server logs, the Search Console links report and the CMS; include images, video, JavaScript and CSS; map each to its new destination. Use a CSV:
```
old,new,notes
https://old-site.com/blog/post-a,https://new-site.com/blog/post-a/,same slug
https://old-site.com/services,https://new-site.com/what-we-do/,renamed
https://old-site.com/old-promo,,deleted: serve 404 or 410
```
Rules from Google:
- Map each old URL to the closest equivalent page. Do not send many old URLs to an unrelated page such as the new home page.
- Content you deleted or merged: return 404 or 410 for deleted content; merged content redirects to the page that now holds it.
- Each new page gets a self-referencing canonical. Update hreflang annotations and internal links to the new URLs.

### 3. Choose the redirect type
| Type | Codes | Google's treatment |
|---|---|---|
| Permanent | 301, 308 | strong signal that the target should be canonical; use when the redirect will not be reverted |
| Temporary | 302, 303, 307 | weak signal; Google keeps showing the source; use for short-term situations |
| Meta refresh, JavaScript | not recommended | last resort; server-side is the most reliable method |

Google says permanent redirects such as 301 do not cause a loss in PageRank. A move should use permanent, server-side redirects. A temporary redirect left in place after a move can leave Google showing the old URL.

### 4. Avoid chains and loops
Send each old URL straight to its final destination. Googlebot follows up to 10 hops, and Google advises keeping chains ideally no more than 3 and fewer than 5. Typical chain builders: `http` to `https` then `www`, then a new path. Combine them into one rule. A chain or loop that fails appears as the "Redirect error" status.

### 5. Prepare and launch
- New site: crawlable (robots.txt blocks only what you intend), no leftover `noindex` from staging, TLS in place for HTTPS, server able to handle heavier Googlebot crawling.
- Verify both old and new properties in Search Console (all variants). Keep verification files and tags on the new site.
- Turn on the redirects, confirm canonicals and robots meta point at the new URLs.
- Submit the new sitemap, remove the old one, and update internal links, external profiles and ad campaigns at once.
- Keep redirects generally at least 1 year, longer if old URLs still get traffic or links.

### 6. Test every mapped URL
Single URL, showing the whole chain:
```bash
npx sitetiller page http://old-site.com/blog/post-a --json
```
Read `chain[]` (each hop `url` and `status`), `finalUrl`, `status`, then on the destination `canonical`, `noindex`, `robotsTxtGooglebot.allowed`. The tool follows at most 6 hops, reads HTML only, and reports a chain; it does not read `Link:` header canonicals.
Whole map: `references/check-map.mjs` reads the CSV and runs `page` for each old URL, flagging a final URL that differs from the map, no redirect, chains, a first hop that is not 301 or 308, noindex, and a canonical that differs from the final URL:
```bash
node references/check-map.mjs map.csv --delay 500 > map-results.json
```
The script is slow by design (one request every 500 ms or more); for thousands of URLs sample the top 200 by traffic and test the rest by pattern. Fix every flagged row before announcing the move.

### 7. Change of Address (domain or subdomain moves only)
Use the Change of Address tool in Search Console from the old domain-level property after the 301s are live. Google says it is not for HTTP to HTTPS (handled automatically), path moves within a site, www to non-www changes, or hosting changes. Requirements: you own both properties with the same Google account; domain-level properties only; include every variant (www, other subdomains) of the old domain. Its effects last 180 days; keep redirects at least 180 days, longer if old URLs still get Google traffic; keep the old domain registered at least a year. You can cancel within 180 days by reversing the redirects and choosing Cancel Move.

### 8. Monitor
- Search Console: Sitemaps report (warnings that old URLs redirect are expected), Page indexing report, Performance data. Old-site traffic should fall as new-site traffic rises.
- Server logs: Googlebot activity and error codes (`ai-logs` skill reads logs).
- Google's guide counts the move as complete when Googlebot has visited every old and new URL at least once.
- After 2 to 4 weeks export page data again and compare:
  ```bash
  npx sitetiller gsc new-site.com --start 2026-12-01 --end 2026-12-28 --dims page --out after-pages.csv
  npx sitetiller decay before-pages.csv after-pages.csv --min-clicks 20 --drop 30 --json
  ```
  `decay` lists pages that lost 30 percent or more of clicks, with `reason`: "gone from report" (not indexed, redirected, renamed or below export limits), "lost rankings", "less demand at a similar position", "lower CTR at similar impressions", or "mixed". It matches rows by page URL, so for a URL change compare after mapping old URLs to new ones (join through your CSV), otherwise every page appears gone. For an HTTPS or path-only change, normalise the URLs in both CSVs first.
- Drift on key pages:
  ```bash
  npx sitetiller version drift https://new-site.com/top-page/
  ```
  `version drift` compares the live page with the last stored snapshot and lists changed fields. After a move, snapshot the new URL, because a snapshot is keyed to the URL.

## Common mistakes (Google's list)
Leftover `noindex` or robots.txt blocks, wrong redirect targets, spikes in crawl errors, servers that cannot cope, stale sitemaps.

## Output to the user
1. The mapping CSV (or its gaps) and the redirect type chosen for each group.
2. Test results: ok count, flagged rows with the flag.
3. The launch checklist with the user's remaining items.
4. A monitoring plan: what to check at week 1, 2 and 4, and what the `decay` output means.
5. A clear note that temporary ranking changes are expected and no outcome is guaranteed.

## Guardrails
- Never recommend 302 for a permanent move, and never recommend JavaScript or meta-refresh redirects as the main method.
- Do not run Change of Address for a path, HTTPS or www change.
- Do not remove redirects early: at least 1 year in general, at least 180 days for Change of Address.
- Do not redirect everything to the home page.
- Do not change the domain, URL structure and design at once; Google advises changing one thing at a time.
- The CLI writes only to `./.sitetiller/`; it never changes the user's site.

## References
- `references/sources.md`: Google's site move, redirect and Change of Address documentation, checked 2026-11-12.
- `references/check-map.mjs`: tests a mapping CSV with `sitetiller page`.
