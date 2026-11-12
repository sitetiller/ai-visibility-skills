# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Crawlable links: `<a>` with an `href` holding a real URL; avoid onclick-only, span, framework-only attributes and `javascript:` URLs; JavaScript-inserted links work if standard `<a href>`; anchor text should be descriptive, reasonably concise and relevant to both pages; avoid generic text, overly long phrases and keyword stuffing; test anchor text by reading it alone; image links use alt text as anchor; empty links give no context; surrounding text helps; do not chain links back to back; every important page linked from at least one other page; link related resources in context, avoid excessive links per page; `nofollow` for untrusted, `sponsored` for paid, `ugc` for user-submitted | https://developers.google.com/search/docs/crawling-indexing/links-crawlable |
| Link spam: links created mainly to manipulate rankings, excessive link exchanges, optimized anchor text in articles or guest posts; paid links acceptable with nofollow or sponsored | https://developers.google.com/search/docs/essentials/spam-policies |
| Before/after measurement | `skills/measure-rollback/references/method.md` |

## Not verified
- Any ideal number of internal links per page or ideal click depth: Google's link page gives none ("avoid excessive links per page" has no number). The skill gives none.
- That adding internal links raises rankings: not stated by Google. The skill measures it against control pages.
- `links` is a sampled crawl of sitemap URLs; "orphan" means unlinked from the sample only.
