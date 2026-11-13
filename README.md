# SiteTiller SEO + AI visibility skills

Agent skills and a zero-dependency CLI for SEO and AI search visibility, built on real data: Google Search Console and Bing Webmaster side by side, AI crawler access and verified bot visits in your logs, answer tracking in ChatGPT, Claude and Perplexity, and version-by-version measurement with rollback for pages you own.

Every skill cites the documentation it relies on, with the date it was checked. Nothing here promises rankings or citations.

```bash
npx sitetiller crawl example.com             # polite site crawl: findings per page and a score with its arithmetic
npx sitetiller crawlers example.com          # which search and AI crawlers robots.txt lets in, and the rule that decides
npx sitetiller logs access.log              # real AI bot visits, verified against OpenAI/Google/Bing/Perplexity IP lists
npx sitetiller engines example.com https://example.com/ --start 2026-10-01 --end 2026-11-05   # Google vs Bing by query
npx sitetiller version snapshot https://example.com/page --label "v2 new title"                 # then measure and roll back
```

## Install

**Claude Code (plugin):**
```
/plugin marketplace add sitetiller/seo-skills
/plugin install sitetiller-seo@sitetiller
```
**Codex, Cursor and other agents:** copy `skills/*` into your agent's skills folder (for example `.agents/skills/`) and keep `AGENTS.md` at the repo root.

**CLI only:** `npx sitetiller help` (Node 18.17 or newer, no dependencies).

## What makes it different
Two capabilities none of the READMEs of the repositories compared below mention (keyword scan of each README on 2026-11-12):
1. **Verified AI bot visits.** Log analysis that separates real GPTBot, OAI-SearchBot, PerplexityBot, Googlebot and Bingbot hits from spoofed ones using each vendor's published IP ranges, and counts visits referred by AI assistants.
2. **Measure and roll back your own pages.** Snapshots of what search engines see, diffs, drift detection, difference-in-differences with a bootstrap interval against control pages, and a WordPress publisher that keeps a ledger and refuses to edit any page it did not create.

And one we share: **Google + Bing side by side** (queries only one engine shows you for, biggest position gaps). search-console-mcp offers this as an MCP tool (`compare_engines`) and claude-seo connects to Bing Webmaster Tools; here it is a CLI command plus a skill that turns the gaps into actions.

Also included: a polite site crawler with per-page findings, image and content-quality audits, JSON-LD generation that never invents ratings, CrUX history with LCP subparts, backlinks from Search Console and Bing (no paid index needed), publishing to WordPress, Ghost and GitHub-backed static sites with the same ownership ledger, AI answer tracking with your own API keys (mentions, citations, cited domains), section-level quotability signals, a programmatic SEO quality gate (thin pages, near-duplicates after removing template text, missing sources), Google-required structured data lint, Core Web Vitals from CrUX, IndexNow, sitemap and llms.txt validation.

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
| sitetiller/seo-skills (this repo) | - | MIT | 2026-11-12 | see bench | see bench | see bench |
| coreyhaines31/marketingskills | 59949 | MIT | 2026-11-11 | 53 | 152 | 103 |
| AgriciDaniel/claude-seo | 28612 | MIT | 2026-11-11 | 35 | 111 | 92 |
| zubair-trabzada/geo-seo-claude | 11643 | MIT | 2026-11-12 | 16 | 3 | 11 |
| Ryze-AI-Adgent/open-seo-mcp-skills | 9418 | MIT | 2026-10-27 | 8 | 0 | 1 |
| kostja94/marketing-skills | 1099 | MIT | 2026-11-06 | 177 | 0 | 0 |
| iannuttall/seo | 622 | Apache-2.0 | 2026-11-12 | 2 | 176 | 658 |
| saurabhsharma2u/search-console-mcp | 322 | MIT | 2026-10-21 | 1 | 97 | 108 |

Those projects are good at different things: marketingskills covers marketing broadly, claude-seo has the deepest classic SEO audit set, iannuttall/seo and search-console-mcp are strong data connectors. Use what fits.

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
