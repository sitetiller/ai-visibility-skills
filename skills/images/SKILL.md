---
name: images
description: "Audit and fix image SEO and image performance on a page: alt text (missing versus decorative alt=\"\"), descriptive file names, width and height to stop layout shift, the lazy-loaded LCP image mistake, WebP/AVIF alternatives, srcset for phones, og:image for shared links and AI answer cards, byte sizes, and when an image sitemap helps. Use when the user asks 'image SEO', 'alt text', 'images not in Google Images', 'are my images too big', 'CLS from images', 'should I lazy load', 'WebP', 'og:image missing', or 'why no preview when I share a link'. Uses sitetiller images (and crawl for the whole site)."
license: MIT
metadata:
  version: 0.2.0
---

# Images

Goal: every content image can be found, understood and loaded fast; every page has a preview image. Fix the issues that cost the most first: a lazy-loaded LCP image and missing dimensions hurt every visitor, a vague file name hurts only image search.

## Steps
1. Audit one page (start with the most visited template):
   ```bash
   npx sitetiller images https://example.com/guide --json
   npx sitetiller images https://example.com/guide --sizes 20 --json   # adds HEAD requests for byte sizes
   ```
   Output: `images`, `issueCounts`, `ogImage`, `pageIssues`, and `list[]` with `src`, `alt`, `format`, `lazy`, `width`, `height`, `firstContentImage`, `issues[]` (`id`, `severity`, `detail`). With `--sizes`: `sizes[]` with `kb` and `tooLarge` (over 200 KB, a review threshold of this tool, not a Google limit).
2. Check the whole site for the alt problem: `npx sitetiller crawl https://example.com --max 100 --json` reports `images-without-alt` per page.
3. Fix in this order:

| Issue id | Why it matters | Fix |
|---|---|---|
| `lazy-lcp-candidate` (high) | If the first content image is the LCP element, `loading="lazy"` delays it (web.dev) | Remove `loading="lazy"` from it; add `fetchpriority="high"`; keep lazy-loading below-the-fold images |
| `no-dimensions` | Space is not reserved, so the layout shifts (CLS) | Add `width` and `height` attributes or CSS `aspect-ratio` |
| `alt-missing` | No text alternative for screen readers or search | Write alt text that describes the image in the page's context; use `alt=""` only for purely decorative images |
| `legacy-format`, `no-srcset`, `tooLarge` | Heavier downloads, slower LCP on phones | Serve WebP or AVIF via `<picture>` with a JPEG/PNG fallback in `src`; add `srcset`/`sizes`; resize to the displayed size |
| `generic-filename` | File names give Google a weak clue about the subject | `black-kitten-sleeping.jpg`, not `IMG00023.JPG`; keep the extension true to the file type |
| `alt-is-filename`, `alt-redundant-prefix`, `alt-long` | Low-value alt text | Describe what the image shows and why it is on the page; no keyword lists |
| `no-og-image` (page) | Shared links and some answer cards show no image | Add `og:image` (1200x630 works widely) and an `image` in the page's structured data |

4. Images Google cannot see: CSS `background-image` is not indexed; images must be in `<img src>` (also inside `<picture>`). Keep a plain `src` fallback when you use `srcset`.
5. Image sitemap: worth it when important images are loaded by JavaScript or sit on a CDN host; Google supports listing images on other domains. Verify the CDN host in Search Console to see crawl errors.
6. Choosing the preview image Google shows: mark it with `primaryImageOfPage`, an `image` on the main entity, or `og:image`; prefer a representative, high-resolution photo over a logo or an image of text.
7. Re-run `images` after the fix and compare `issueCounts`. For LCP impact, wait for field data (`core-web-vitals`, `npx sitetiller crux-history`).

## Alt text examples
- Bad: missing. Worse: `alt="puppy dog baby dog pup pups puppies doggies"`. Good: `alt="Dalmatian puppy playing fetch"` (Google's own example).
- Charts: say what the chart shows ("Monthly signups rose from 120 to 410 between January and June 2026"), and put the numbers in nearby text or a table too.

## Guardrails
- Never mark a meaningful image `alt=""` to silence a warning, and never stuff keywords into alt text: Google says it can be seen as spam.
- Do not lazy-load the hero or LCP image; do not add `fetchpriority="high"` to more than one or two images.
- Byte-size and "large file" flags are review prompts from this tool, not Google thresholds; say so.
- Do not rename image files on pages the user did not ask about; renaming breaks existing image URLs unless redirected.
- HEAD requests are one at a time and only to public hosts; do not raise `--sizes` above what the user needs.

## References
- `references/sources.md`: Google image SEO best practices, web.dev LCP and CLS guidance, checked 2026-11-13.
