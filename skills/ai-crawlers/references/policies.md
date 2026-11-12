# robots.txt policies

Copy, adapt paths, then test with `npx sitetiller robots-test`.

## In AI search, out of training (most common for businesses)
```
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: CCBot
User-agent: Google-Extended
User-agent: Applebot-Extended
Disallow: /

User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php

Sitemap: https://example.com/sitemap.xml
```
Search crawlers (Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot) fall to the `*` group and are allowed except the admin path.

## Maximum reach
```
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

## Docs section open to AI search only
```
User-agent: OAI-SearchBot
User-agent: Claude-SearchBot
User-agent: PerplexityBot
Allow: /docs/
Disallow: /

User-agent: *
Allow: /
```
Longest match: `/docs/...` allowed for those three, everything else blocked for them; other bots unaffected.

## Out of AI products entirely (as far as robots.txt reaches)
```
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: GPTBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: CCBot
User-agent: Google-Extended
User-agent: Applebot-Extended
Disallow: /

User-agent: *
Allow: /
```
User-triggered fetchers may ignore robots.txt (OpenAI, Perplexity say so). Enforcing that needs firewall rules on the vendors' published IP ranges.
