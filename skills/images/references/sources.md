# Sources (checked 2026-11-13)

| Claim | Source |
|---|---|
| Useful, context-fitting alt text; avoid filling alt with keywords (spam risk); Dalmatian example | https://developers.google.com/search/docs/appearance/google-images |
| Descriptive short file names (`my-new-black-kitten.jpg` vs `IMG00023.JPG`); extension must match the type | same page |
| Supported formats in `src`: BMP, GIF, JPEG, PNG, WebP, SVG, AVIF | same page |
| `srcset` or `<picture>`; always give a fallback `src` | same page |
| Google indexes `<img src>` (also in `<picture>`), not CSS background images | same page |
| Image sitemaps can list images on other domains (CDN); verify the CDN host in Search Console | same page |
| Influence the preferred image with `primaryImageOfPage`, `image` on `mainEntityOfPage`, or `og:image`; avoid logos, images of text, extreme aspect ratios | same page |
| Do not lazy-load the LCP image; `fetchpriority="high"` for the LCP image only | https://web.dev/articles/optimize-lcp |
| Width/height or `aspect-ratio` reserve space and prevent layout shift | https://web.dev/articles/optimize-cls |
| Open Graph `og:image` property | https://ogp.me/ |

The 200 KB "too large" flag and the severity levels are this tool's review defaults, not vendor thresholds.
