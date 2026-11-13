---
name: backlinks
description: "Analyse the links pointing to a site from first-party data: Search Console Links exports (top linking sites, top linked pages, top linking text) and the Bing Webmaster API (pages with inbound links, linking URLs and anchor text per page). Reports linking-site concentration, anchor mix (brand, URL, generic, other), pages that earn links, and suspicious links for manual review; explains Google's link spam policy, when the disavow tool is and is not needed, and honest ways to earn links. Use when the user asks 'backlinks', 'who links to me', 'link profile', 'toxic links', 'should I disavow', 'anchor text', 'link building', or 'referring domains'. Uses sitetiller backlinks."
license: MIT
metadata:
  version: 1.0.0
---

# Backlinks

Goal: know who links to the site and to which pages, spot real problems (a manual action, an obvious paid-link pattern), and plan link earning that follows Google's rules. Search Console and Bing are free and come from the engines themselves; third-party indexes (Ahrefs, Moz, Semrush, DataForSEO) see more of the web but are estimates and cost money, so treat them as optional.

## Inputs
- Search Console: Links report, export each table as CSV (Top linking sites, Top linked pages, Top linking text).
- Bing Webmaster Tools API key in `BING_WEBMASTER_API_KEY` (see `setup`).
- Brand terms, for the anchor mix.

## Steps
1. Search Console exports (one command per file; the kind is detected from the header):
   ```bash
   npx sitetiller backlinks "Top linking sites.csv" --json
   npx sitetiller backlinks "Top linking text.csv" --brand "acme,acme.com" --json
   npx sitetiller backlinks "Top linked pages.csv" --json
   ```
   - Linking sites -> `linkingSites`, `linkingPages`, `topSite`, `topSiteShare`, `top10Share`, `review[]`.
   - Linking text -> `counts` and `shares` for `brand`, `url`, `generic`, `other`, `empty`, plus `review[]`.
   - Linked pages -> `pages[]` (`page`, `links`, `linkingSites`) sorted by links.
2. Bing (covers links Google's export may not list):
   ```bash
   npx sitetiller backlinks --bing https://example.com/ --json
   npx sitetiller backlinks --bing https://example.com/ --page https://example.com/pricing --brand acme --json
   ```
   First form: `pages[]` (`url`, `count`) for every page Bing knows has inbound links. Second form: `links[]` (`from`, `anchor`), `linkingDomains[]`, and the same anchor mix.
3. Read the numbers:
   - **Concentration.** A `topSiteShare` above about half usually means one sitewide link (footer, blogroll, a partner's template). Not a problem by itself; it means the profile is thinner than the page count suggests.
   - **Anchor mix.** Brand and URL anchors are the natural majority for most sites. A large share of exact commercial phrases ("best crm software") from unrelated sites is the pattern Google's link spam policy describes; investigate where they came from.
   - **Pages that earn links.** The top linked pages show what the web values on the site; build related pages and internal links from them (`internal-links`).
   - **`review[]`.** Domains or anchors with gambling, pharma, adult or loan terms. They are prompts to look, not verdicts.
4. Disavow decision. Google says most sites do not need the disavow tool. Use it only when there are many spammy, artificial or low-quality links pointing to the site **and** they caused a manual action or are likely to. Check Search Console > Security & Manual actions first. If there is no manual action and no paid-link history, do nothing; Google already ignores most spam links.
5. Earning links (allowed): original data or tools others cite, clear documentation, being listed where the user really is a member or customer, PR with real news. Paid or exchanged links must carry `rel="sponsored"` or `rel="nofollow"`.

## Output to the user
1. Linking sites, linking pages, top site share, top 10 share.
2. Anchor mix table and the review list (with "check manually").
3. The 10 pages that earn the most links and one idea per page to build on it.
4. Disavow: "not needed" or the specific reason it is needed.
5. Three link-earning actions that fit the site.

## Optional paid indexes (your own keys)
```bash
npx sitetiller provider status --json
npx sitetiller provider dataforseo example.com --yes --json
npx sitetiller provider ahrefs example.com --yes --json
```
`status` shows which providers have credentials set (never the values). DataForSEO returns backlinks, referring domains, rank, broken backlinks and referring IPs from its Backlinks Summary endpoint; Ahrefs returns Domain Rating and Ahrefs Rank. Each call is billed by the provider, so the command refuses without `--yes`. Treat both as third-party estimates next to the first-party Search Console and Bing data.

## Guardrails
- Never buy links, propose link exchanges at scale, or automate link creation: all are link schemes under Google's spam policies.
- Do not label a link "toxic" from a third-party score; there is no Google toxicity score. Use "review" and explain why.
- Never recommend disavowing broadly as maintenance; disavowing good links can hurt.
- Bing and Search Console show samples, not every link; say so when quoting counts.
- Keep API keys in environment variables; never print them.

## References
- `references/sources.md`: Google spam policies and disavow help, Bing Webmaster API, checked 2026-11-13.
