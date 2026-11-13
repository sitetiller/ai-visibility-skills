# Example outputs (real runs, 2026-11-13)

Every file here is the unedited `--json` output of one command, run against our own site, sitetiller.com, on 2026-11-13 with CLI 1.0.0. Nothing is mocked. Run the same command on your site to compare.

| File | Command | Skill | What it showed on sitetiller.com |
|---|---|---|---|
| `crawlers.json` | `npx sitetiller crawlers sitetiller.com` | ai-crawlers | 13 search and AI crawlers, 0 blocked, no Content-Signal lines |
| `page.json` | `npx sitetiller page <guide url>` | onpage | Status chain, title, description, canonical, H1, schema types of one guide |
| `sitemap.json` | `npx sitetiller sitemap sitetiller.com --sample 10` | sitemaps | 105 URLs, in robots.txt, no issues in the sample |
| `llms.json` | `npx sitetiller llms sitetiller.com` | llms-txt | /llms.txt found, all format checks pass, every tested link returns 200 |
| `pages.json` | `npx sitetiller pages sitetiller.com --pages 10` | tech-audit | Titles, descriptions, H1, schema across 10 sitemap pages |
| `links.json` | `npx sitetiller links sitetiller.com --pages 30` | internal-links | 20 sitemap URLs not linked from the 30 crawled pages (a sample: raise `--pages` before acting) |
| `crawl.json` | `npx sitetiller crawl sitetiller.com --max 30 --delay 500` | tech-audit, site-architecture | 30 pages, score 99; 2 long descriptions, 3 pages without structured data, 1 thin page |
| `images.json` | `npx sitetiller images <guide url>` | images | 2 images, no issues, page-specific og:image |
| `quality.json` | `npx sitetiller quality <guide url>` | content-quality | 8 of 10 checks; Flesch 65.3; missing first-hand signals and an about/contact link |
| `cite.json` | `npx sitetiller cite <guide url>` | citability | 9 sections, 78% answer in the first sentence, 11% cite a source inside the section |
| `schema.json` | `npx sitetiller schema <guide url>` | schema | One info note: the page has FAQPage markup, which no longer earns a Google rich result |
| `agent.json` | `npx sitetiller agent sitetiller.com` | agent-ready | 12 of 12 required checks |
| `schema-gen.json` | `npx sitetiller schema-gen software --name SiteTiller --price 0 ...` | schema | Valid JSON-LD; the lint correctly reports that Google requires a rating or review we do not have, so no rich result |

`<guide url>` = https://sitetiller.com/ai/chatgpt-crawlers-oai-searchbot-gptbot-chatgpt-user

## Not included, and why
- **Commands that read private data** (`gsc`, `inspect`, `bing`, `engines`, `ga4-ai`, `backlinks`, `ctr`, `striking`, `brand`, `cannibal`, `decay`, `logs`, `measure`): their output is the site owner's Search Console, Bing, analytics or server-log data. We will publish ours once it has enough rows to be useful, in the build-in-public log.
- **Commands that cost money or need a key** (`track`, `provider`, `cwv`, `crux-history`, `lighthouse`): billed or quota-limited per user. `cwv` and `crux-history` also need enough Chrome traffic to have field data.
- **Commands that write** (`wp`, `ghost`, `github`, `version`): they change a site or local state; the tests cover them with recorded API shapes (`tests/`).
