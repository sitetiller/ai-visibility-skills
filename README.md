# SiteTiller AI visibility skills

Get your site found in ChatGPT, Claude, Perplexity, Google AI answers and classic search. Agent skills and a zero-dependency CLI that work from real data: which AI crawlers can reach you and which actually visit (verified against vendor IP lists), whether assistants mention and cite you for the questions your buyers ask, how quotable each section of a page is, Google Search Console and Bing side by side, and version-by-version measurement with rollback for pages you own.

Every skill cites the documentation it relies on, with the date it was checked. Nothing here promises rankings or citations.

```bash
npx sitetiller agent example.com             # can AI assistants and agents read the page: access, server text, accessible names
npx sitetiller cite https://example.com/guide # section by section: does it answer first, with numbers and sources
npx sitetiller crawl example.com             # polite site crawl: findings per page and a score with its arithmetic
npx sitetiller crawlers example.com          # which search and AI crawlers robots.txt lets in, and the rule that decides
npx sitetiller logs access.log              # real AI bot visits, verified against OpenAI/Google/Bing/Perplexity IP lists
npx sitetiller engines example.com https://example.com/ --start 2026-10-01 --end 2026-11-05   # Google vs Bing by query
npx sitetiller version snapshot https://example.com/page --label "v2 new title"                 # then measure and roll back
```

## Install

**Claude Code (plugin):**
```
/plugin marketplace add sitetiller/ai-visibility-skills
/plugin install sitetiller-ai-visibility@sitetiller
```
**Codex, Cursor and other agents:** copy `skills/*` into your agent's skills folder (for example `.agents/skills/`) and keep `AGENTS.md` at the repo root.

**CLI only:** `npx sitetiller help` (Node 18.17 or newer, no dependencies).

## What makes it different
Two capabilities none of the READMEs of the repositories compared below mention (keyword scan of each README on 2026-11-12):
1. **Verified AI bot visits.** Log analysis that separates real GPTBot, OAI-SearchBot, PerplexityBot, Googlebot and Bingbot hits from spoofed ones using each vendor's published IP ranges, and counts visits referred by AI assistants.
2. **Measure and roll back your own pages.** Snapshots of what search engines see, diffs, drift detection, difference-in-differences with a bootstrap interval against control pages, and a WordPress publisher that keeps a ledger and refuses to edit any page it did not create.

And one we share: **Google + Bing side by side** (queries only one engine shows you for, biggest position gaps). search-console-mcp offers this as an MCP tool (`compare_engines`) and claude-seo connects to Bing Webmaster Tools; here it is a CLI command plus a skill that turns the gaps into actions.

Also included: agent-readiness checks (accessible names, landmarks, server-rendered text, Content-Signal), Lighthouse runs across many pages, NAP consistency for local businesses, optional paid indexes with your own keys (DataForSEO, Ahrefs; refused without `--yes`), drift alerts rated by severity, a polite site crawler with per-page findings, image and content-quality audits, JSON-LD generation that never invents ratings, CrUX history with LCP subparts, backlinks from Search Console and Bing (no paid index needed), publishing to WordPress, Ghost and GitHub-backed static sites with the same ownership ledger, AI answer tracking with your own API keys (mentions, citations, cited domains), section-level quotability signals, a programmatic SEO quality gate (thin pages, near-duplicates after removing template text, missing sources), Google-required structured data lint, Core Web Vitals from CrUX, IndexNow, sitemap and llms.txt validation.

## Want it done every week?
These skills are free and stay free. [SiteTiller](https://sitetiller.com/?utm_source=github&utm_medium=readme) is the hosted version: it connects to Search Console and Bing, builds the new pages and free tools your buyers search for, publishes them to your site (WordPress, Ghost, static sites, or a guides subdomain for any platform), tracks AI citations, measures every version and rolls back the ones that lose. Your existing pages are never edited. Try the [free SEO + AI visibility check](https://sitetiller.com/check?utm_source=github&utm_medium=readme) first.

## Example outputs
`examples/` holds unedited `--json` output from real runs on sitetiller.com (crawl, agent, quality, citability, links and more), so you can see what each command returns before installing.

## Skills
44 skills; see `AGENTS.md` for the full index. Groups:
- **Data and planning:** setup, gsc-bing, ga4-ai, quick-wins, weekly-check, seo-report, seo-plan
- **Technical:** tech-audit, site-architecture, sitemaps, indexing, redirects-migration, canonicals, hreflang, core-web-vitals, images
- **Content:** onpage, titles-meta, content-brief, content-quality, sxo, topic-clusters, cannibalization, content-decay, internal-links, schema, comparison-pages, competitors
- **Links:** backlinks
- **AI visibility:** ai-crawlers, ai-logs, citability, ai-tracker, llms-txt, ai-citations, agent-ready
- **Measurement and publishing:** measure-rollback, pseo-quality-gate, wordpress-publish, ghost-publish, static-site-publish, platforms
- **Verticals:** local-seo, ecommerce-seo

## Comparison (generated, not hand-written)
`node bench/bench.mjs` regenerates this from the GitHub API. File counts are not a quality score.

| Repository | Stars | License | Last push | SKILL.md files | Test files | Scripts |
|---|---|---|---|---|---|---|
| sitetiller/ai-visibility-skills (this repo) | - | MIT | 2026-11-12 | see bench | see bench | see bench |
| coreyhaines31/marketingskills | 59949 | MIT | 2026-11-11 | 53 | 152 | 103 |
| AgriciDaniel/claude-seo | 28612 | MIT | 2026-11-11 | 35 | 111 | 92 |
| zubair-trabzada/geo-seo-claude | 11643 | MIT | 2026-11-12 | 16 | 3 | 11 |
| Ryze-AI-Adgent/open-seo-mcp-skills | 9418 | MIT | 2026-10-27 | 8 | 0 | 1 |
| kostja94/marketing-skills | 1099 | MIT | 2026-11-06 | 177 | 0 | 0 |
| iannuttall/seo | 622 | Apache-2.0 | 2026-11-12 | 2 | 176 | 658 |
| saurabhsharma2u/search-console-mcp | 322 | MIT | 2026-10-21 | 1 | 97 | 108 |

Those projects cover different ground: marketingskills is broad marketing, claude-seo is a classic SEO audit set, iannuttall/seo and search-console-mcp are data connectors. This repository is centred on AI visibility with measured, reversible changes.

## Principles
- **Read-only by default.** Checks fetch public pages one at a time; data connectors use read-only scopes.
- **Own pages only.** Publishing and rollback never touch pages the tool did not create.
- **Sourced.** Every threshold and vendor behaviour links to the vendor's documentation in `references/sources.md`.
- **Secrets stay local.** Environment variables or a gitignored `.env`; never in prompts, commits or reports.

## Develop
```bash
node --test tests/*.test.mjs        # offline tests
node scripts/validate-skills.mjs    # skill format, real CLI commands only, sources present
node bench/bench.mjs                # comparison table
```
MIT licensed. See `THIRD_PARTY_NOTICES.md`. Built by [SiteTiller](https://sitetiller.com).
