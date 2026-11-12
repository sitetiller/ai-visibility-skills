# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Three equivalent methods (HTML, HTTP header, sitemap); self-reference; reciprocal links ("If two pages don't both point to each other, the tags will be ignored."); fully-qualified URLs; alternates need not share a domain; generic language catchall; tags in `<head>`, no combining with `media`; ISO 639-1 language, ISO 3166-1 Alpha 2 region; region alone invalid; `EU`, `UN`, `UK` reserved and ineffective, use `GB`; case-insensitive; `x-default` use; translated vs similar content and duplicates | https://developers.google.com/search/docs/specialty/international/localized-versions |
| `rel="canonical"` with `hreflang`, `lang`, `media` or `type` attributes is not used for canonicalization | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls |
| Each new page gets a self-referencing canonical; update hreflang annotations in a site move | https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes |
| Language or regional variants without hreflang can cause Google to pick a different canonical | https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting |
| Mobile-first: pair hreflang links mobile-to-mobile and desktop-to-desktop on separate mobile URLs | https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing |

## Tool behaviour observed (sitetiller 0.1.0, 2026-11-12)
- `page https://wordpress.org/ --json` returned `hreflang` as an array of `{ "lang": "af-za", "href": "https://af.wordpress.org/" }` objects (157 entries). `lang` is the attribute value as written in the HTML.
- `references/check-hreflang.mjs` on that page with `--max 3` reported two review items (`ca` mapped to two URLs; `ceb` is a three-letter code) and no errors among three alternates.
- The tool reads `<link>` tags only in the first 250,000 characters of the HTML. It does not read HTTP `Link:` headers or XML sitemap hreflang.

## Not verified
- Which language codes beyond ISO 639-1 Google accepts (for example three-letter codes or script subtags such as `zh-Hans`): the page read documents only ISO 639-1 and ISO 3166-1 Alpha 2, so the skill marks other codes "review" and does not call them invalid.
- Google's behaviour when one language code maps to two URLs: not stated in the page read; the skill marks it "review".
- Bing's hreflang handling: not researched; the skill makes no Bing claim.
- Whether an automatic language redirect is safe: Google's page names only `x-default` uses; no claim is made.
