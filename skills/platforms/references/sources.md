# Sources (checked 2026-11-13)

| Platform | Claim | Source |
|---|---|---|
| WordPress | Application Passwords; core REST fields | https://developer.wordpress.org/advanced-administration/security/application-passwords/ ; https://developer.wordpress.org/rest-api/reference/posts/ |
| Ghost | Admin API token auth (id:secret, HS256 JWT, aud /admin/, 5 min), resource wrapper | https://docs.ghost.org/admin-api |
| Ghost | Post fields (meta_title, meta_description, canonical_url, og_*, codeinjection_head); update needs updated_at | https://docs.ghost.org/admin-api/posts/overview ; https://docs.ghost.org/admin-api/posts/updating-a-post |
| GitHub | Contents API create/update/delete, sha for updates | https://docs.github.com/en/rest/repos/contents |
| Webflow | Create live CMS item; no endpoint creates static pages; page settings API has seo/openGraph but no canonical or noindex | https://developers.webflow.com/data/reference/cms/collection-items/live-items/create-item-live ; https://developers.webflow.com/data/reference/pages-and-components/pages/update-page-settings |
| Webflow | Sitemap indexing toggle off adds noindex and removes from sitemap | https://help.webflow.com/hc/en-us/articles/33961355371667-Create-a-sitemap-in-Webflow |
| Webflow | Rate limits per plan; site tokens | https://developers.webflow.com/data/reference/rate-limits ; https://developers.webflow.com/data/docs/get-a-site-token |
| Shopify | pageCreate and articleCreate mutations and fields | https://shopify.dev/docs/api/admin-graphql/latest/mutations/pageCreate ; https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ArticleCreateInput |
| Shopify | SEO metafields title_tag / description_tag in namespace global | https://shopify.dev/docs/apps/build/marketing-analytics/optimize-storefront-seo |
| Shopify | robots.txt via robots.txt.liquid theme template | https://shopify.dev/docs/storefronts/themes/seo/robots-txt |
| Shopify | Distribution: public (App Store review) vs custom; IP allowlist for custom apps outside your organisation from 2026-11-20 | https://shopify.dev/docs/apps/launch/distribution ; https://shopify.dev/docs/apps/launch/distribution/select-distribution-method |
| Shopify | Legacy custom apps cannot be created after 2026-01-01 | https://changelog.shopify.com/posts/legacy-custom-apps-can-t-be-created-after-january-1-2026 |
| Wix | Create draft post, publish, seoData | https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/create-draft-post |
| Wix | Private vs public apps | https://dev.wix.com/docs/build-apps/get-started/overview/exposing-apps-publicly-and-privately |
| HubSpot | Blog post create fields (htmlTitle, metaDescription, linkRelCanonicalUrl, headHtml) | https://developers.hubspot.com/docs/api-reference/latest/cms/blogs/posts/create-post |
| HubSpot | Legacy private apps cannot be created after 2026-10-26 | https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview |
| WordPress.com | wp/v2 namespace, OAuth2 | https://developer.wordpress.com/docs/api/namespaces-versions/ ; https://developer.wordpress.com/docs/api/getting-started/ |
| Drupal | JSON:API POST | https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/creating-new-resources-post |
| Squarespace | Developer APIs listed: Commerce, Reseller, Webhooks (no content write API found) | https://developers.squarespace.com/ |
| Squarespace | Code injection depends on plan | https://support.squarespace.com/hc/en-us/articles/216107348-Code-based-customizations |
| Framer | Server API, publish and deploy | https://www.framer.com/developers/server-api-introduction ; https://www.framer.com/developers/server-api-quick-start |

Not verified (keep out of advice until checked): Shopify `seo.hidden` on pages and articles; Shopify rate-limit table; Wix canonical/robots fields and plan requirements; Webflow CMS API plan availability and whether the sitemap toggle is writable by API; Framer CMS write methods and limits; WordPress.com free-plan API access.
