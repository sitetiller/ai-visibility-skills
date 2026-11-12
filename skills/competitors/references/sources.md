# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Scraping policy: "taking content from other sites, often through automated means" to host it for ranking purposes; abusive examples include republishing content without original content or value and without citing the source, copying with only slight changes such as synonyms, reproducing feeds without unique benefit, compiling embedded media without substantial added value | https://developers.google.com/search/docs/essentials/spam-policies (opened 2026-11-12) |
| Machine-generated traffic: "sending automated queries to Google", including scraping results for rank-checking and other automated access to Google Search without express permission | same page |
| Helpful content questions: original information, reporting, research or analysis; substantial value compared with other results; added value over sources | https://developers.google.com/search/docs/fundamentals/creating-helpful-content (as recorded in `skills/content-brief/references/sources.md`, same date) |
| Structured data: valid markup does not guarantee a rich result; markup must match visible content | https://developers.google.com/search/docs/appearance/structured-data/sd-policies (as recorded in `skills/tech-audit/references/sources.md`) |
| What `cite` counts and where it misleads | `skills/citability/references/signals.md` |
| Crawler access for search and AI bots | `skills/ai-crawlers/references/sources.md` |

## Tool behaviour (sitetiller 0.1.0, read-only single fetch of https://wordpress.org/news/ on 2026-11-12)
- `page` returned `requested`, `finalUrl`, `status`, `chain[]`, `contentType`, `robotsTxtGooglebot` (`allowed`, `group`, `rule`, `line`), `title`, `titleCount`, `description`, `descriptionCount`, `robotsMeta[]`, `xRobots`, `noindex`, `canonical`, `canonicalCount`, `hreflang[]`, `h1[]`, `headings[]` (`level`, `text`), and more. `robotsTxtGooglebot` tests only Googlebot's rules, not the CLI's own user agent.
- `cite` on the same URL returned `sections: []` and a zeroed `summary`: the page had no section of 25 or more words under h1 to h4 headings after the tool removed navigation and similar blocks. An empty result means the tool found nothing to measure.
- `cli/lib/http.mjs`: user agent `SiteTillerCLI/0.1 (+https://github.com/sitetiller/seo-skills)`, GET only, timeout and byte caps, and `target()` rejects private hostnames. `links` and `pages` wait 300 ms between pages by default. None of the fetch commands checks robots.txt rules for the CLI's own user agent (`sitemap` reads robots.txt only to find Sitemap lines).

## Not verified
- That following robots.txt `User-agent: *` rules is sufficient for every site's terms of service. The skill limits itself to public pages, few requests and no copying; the user remains responsible for a site's terms.
- Any claim that competitor markup, length or structure causes a ranking. No source says so.
