# Sources (checked 2026-11-13)

| Claim | Source |
|---|---|
| Link spam definition and link scheme examples (buying/selling links, excessive exchanges, automated programs, links required by contract) | https://developers.google.com/search/docs/essentials/spam-policies |
| Paid links are fine when qualified with `rel="nofollow"` or `rel="sponsored"` | same page; https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links |
| Disavow: most sites do not need it; use only with many spammy/artificial/low-quality links that caused or will likely cause a manual action | https://support.google.com/webmasters/answer/2648487 |
| Search Console Links report (top linking sites, top linked pages, top linking text; export) | https://support.google.com/webmasters/answer/9049606 |
| Bing `GetLinkCounts(siteUrl, page)` returns `Links[]` (`Url`, `Count`) and `TotalPages` | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getlinkcounts |
| Bing `GetUrlLinks(siteUrl, link, page)` returns `Details[]` (`Url`, `AnchorText`) and `TotalPages` | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.geturllinks |

The "about half" concentration note, the anchor categories and the review word list are this tool's heuristics, not Google thresholds.
