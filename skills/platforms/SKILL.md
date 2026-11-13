---
name: platforms
description: "SEO and AI visibility on each site platform, and how to publish new pages to it safely: WordPress, Ghost, static sites on GitHub (Next.js, Astro, Hugo with Vercel, Netlify or Cloudflare Pages), Webflow, Shopify, Wix, Squarespace, Framer, HubSpot CMS, WordPress.com, Drupal and headless CMSs (Contentful, Sanity, Strapi). For each: which SEO fields can be set (title, description, canonical, noindex, JSON-LD, Open Graph), what the platform controls (sitemap, robots.txt), the write API and its access rules, and a fallback when no API exists. Use when the user names their platform: 'SEO on Shopify', 'Webflow canonical', 'Wix SEO settings', 'Squarespace robots.txt', 'publish to Ghost by API', 'Framer SEO', 'which platform is best for SEO', or 'can SiteTiller publish to my site'."
license: MIT
metadata:
  version: 0.2.0
---

# Platforms

Goal: give platform-specific steps instead of generic advice, and pick the safest way to add new pages: an API that touches only objects the tool creates, or a manual fallback. Every audit command in this repo works on any platform, because it reads the public pages.

## First, detect the platform
`npx sitetiller page https://example.com --json` and look at the HTML and headers: `wp-content` (WordPress), `content="Ghost` generator meta (Ghost), `cdn.shopify.com` (Shopify), `static.wixstatic.com` (Wix), `website-files.com` or `data-wf-` (Webflow), `squarespace-cdn.com` (Squarespace), `framerusercontent.com` (Framer), `hs-scripts.com` (HubSpot). Ask the user to confirm.

## Platform table (publishing new pages)
| Platform | Write API for new pages | SEO fields via API | Access | Command or route here |
|---|---|---|---|---|
| WordPress (self-hosted) | REST `/wp/v2/posts`, `/pages` | Title, slug, content; meta description and canonical need an SEO plugin's fields | Application Password | `npx sitetiller wp` (`wordpress-publish`) |
| Ghost | Admin API posts and pages | `meta_title`, `meta_description`, `canonical_url`, `og_*`, `codeinjection_head` | Custom integration key | `npx sitetiller ghost` (`ghost-publish`) |
| Static site on GitHub | Contents API commits | Everything (your template and front matter) | Fine-grained token for one repo | `npx sitetiller github` (`static-site-publish`) |
| Webflow | CMS collection items (not static pages) | Bind SEO title/description to collection fields once in the template; no canonical or noindex field in the API | Site token or app | Manual setup, then CMS items |
| Shopify | GraphQL `pageCreate`, `articleCreate` | `global.title_tag`, `global.description_tag` metafields; no canonical field; JSON-LD lives in the theme | App (custom apps for other organisations now need an IP allowlist; public apps need App Store review) | Fallback or an app |
| Wix | Blog draft posts API (blog only) | `seoData` tags on posts | API key or app | Fallback or an app |
| HubSpot CMS | Blog posts API | `htmlTitle`, `metaDescription`, `linkRelCanonicalUrl`, `headHtml` | OAuth app (legacy private apps cannot be created after 2026-10-26) | Fallback or an app |
| WordPress.com | `wp/v2` through `public-api.wordpress.com` | As WordPress | OAuth2 | Use the WordPress steps with OAuth |
| Drupal | JSON:API (write enabled by the admin) | Metatag module fields | Site-specific auth | Fallback unless the site exposes it |
| Headless (Contentful, Sanity, Strapi) | Management APIs | Whatever the content model has | Tokens | Add a page content type with SEO fields; the front end must render it |
| Squarespace | No content write API found in the developer docs | Set in the editor | - | Fallback |
| Framer | Server API (publishes the whole project) | Not documented | Project API key | Fallback: publishing would also ship the owner's unpublished edits |

Fallback = generate the page (HTML or Markdown plus title, description, canonical, JSON-LD), the user pastes it into a new page in their editor, then `version snapshot` it so measurement still works.

## SEO checklist per platform
- **Shopify:** the platform generates `sitemap.xml` and a default `robots.txt`; robots changes go through the `robots.txt.liquid` theme template. Product structured data comes from the theme: lint it with `npx sitetiller schema <product-url>` and fix it in the theme, not with a second app that duplicates it. Collections with filters create parameter URLs; see `ecommerce-seo`. Hidden resources leave the sitemap.
- **Webflow:** set SEO title, meta description and Open Graph per static page in Page settings; for CMS templates bind them to fields. Excluding an item from the sitemap ("Sitemap indexing" off) also adds noindex. Add JSON-LD in page or template custom code.
- **Wix:** edit SEO per page in the SEO panel; Wix generates the sitemap. Blog posts accept SEO tags through the API.
- **Squarespace:** page SEO titles and descriptions in page settings; code injection depends on the plan and is disabled on Basic.
- **Ghost:** per-post meta title, description, canonical URL and code injection; Ghost generates the sitemap.
- **Static sites:** your framework owns the head; make sure every page template renders title, description, canonical and JSON-LD, and that the sitemap generator includes new content folders.
- **All:** check AI crawler access after any CDN or security change (`ai-crawlers`); some platforms and CDNs add bot-blocking options that override robots.txt.

## Guardrails
- Never edit pages, themes, templates or settings the user did not ask about. For new pages use a dedicated area (a tag, blog, collection or folder) and the ownership ledger.
- Do not install apps or create API keys for the user; tell them where the setting is and let them do it.
- Platform rules change often (Shopify and HubSpot app rules changed in 2026); re-check the vendor page dated in `references/sources.md` before relying on access details.
- Facts marked "not verified" in the sources stay out of advice until checked.

## References
- `references/sources.md`: vendor developer documentation per platform, checked 2026-11-13.
