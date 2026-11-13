# sitetiller

AI visibility and SEO checks from the command line. Zero dependencies, Node 18.17+.

```bash
npx sitetiller agent example.com        # can AI assistants and agents read your page
npx sitetiller crawlers example.com     # which search and AI crawlers robots.txt allows
npx sitetiller cite https://example.com/guide   # how quotable each section is
npx sitetiller crawl example.com        # polite site crawl with findings and a score
npx sitetiller logs access.log          # real AI bot visits, verified against vendor IP lists
npx sitetiller help                     # all 41 commands
```

Add `--json` to any command for machine-readable output.

This CLI powers the 44 open-source agent skills for Claude Code, Codex and Cursor at
[github.com/sitetiller/ai-visibility-skills](https://github.com/sitetiller/ai-visibility-skills), where every command,
its sources and real example outputs are documented.

Read-only by default: checks fetch public pages one at a time and respect robots.txt. Publishing commands (`wp`, `ghost`,
`github`) only ever edit pages this tool created.

Want it run every week, with new pages built and measured for you? See [SiteTiller](https://sitetiller.com/?utm_source=npm&utm_medium=readme).

MIT licensed.
