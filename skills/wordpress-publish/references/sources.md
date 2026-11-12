# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Create a post: `POST /wp/v2/posts`. Update: `POST /wp/v2/posts/<id>` (JSON body such as `{"title":"My New Title"}`). Arguments include `title`, `content`, `excerpt`, `slug`, `status` (`publish`, `future`, `draft`, `pending`, `private`), `meta` (object), `date`, `date_gmt`, `password`, `author`, `featured_media`, `comment_status`, `ping_status`, `format`, `sticky`, `template`, `categories`, `tags`. The page does not cover authentication or meta registration | https://developer.wordpress.org/rest-api/reference/posts/ (opened 2026-11-12) |
| "As of 5.6, WordPress has shipped with Application Passwords"; generated from the Edit User page in wp-admin; credentials sent with REST requests over https:// using Basic Auth (RFC 7617) | https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/ (opened 2026-11-12) |
| Meta keys registered with `show_in_rest` => true are accessible through the REST API; `register_post_meta` limits a key to one post type; custom post types need `custom-fields` support; with `register_meta` the value appears under `.meta` | https://developer.wordpress.org/rest-api/extending-the-rest-api/modifying-responses/ (opened 2026-11-12) |
| Yoast SEO REST API is read-only: "currently read-only, and doesn't currently support POST or PUT calls to update the data"; posts gain `yoast_head` and `yoast_head_json` through the native REST API; `/wp-json/yoast/v1/get_head?url=` is a GET that returns `html`, `json`, `status` | https://developer.yoast.com/customization/apis/rest-api/ (opened 2026-11-12) |
| The `pages` type uses the same pattern (`/wp/v2/pages`); `wordpress.mjs` accepts `posts` and `pages` only | `cli/lib/wordpress.mjs` (read 2026-11-12) |
| Snippets are built mainly from page content; the meta description is used when it describes the page better | `skills/titles-meta/references/sources.md` |

## Tool behaviour (sitetiller 0.1.0)
- `wp owned` on a folder without a ledger printed `{"wordpress": []}` (run 2026-11-12). No `wp create`, `wp update` or `wp unpublish` was run against any real site while writing this skill.
- Offline tests (`tests/wordpress.test.mjs`, mocked fetch) cover: create defaults to draft with Basic auth and records ownership; update is limited to safe fields; an id not in the ledger, on another site or another type is refused; unpublish sends `draft`; `http://` sites and missing credentials are rejected.
- `wpCreate` sends `title` and `content` as plain strings. The REST reference above lists them as object-type arguments; whether every WordPress version accepts plain strings was not tested against a live site here.

## Not verified
- Rank Math, SEOPress and All in One SEO REST write support: no official documentation was opened, so the skill makes no claim and tells the user to test on a draft.
- The exact behaviour of a draft's Preview link and of the public URL after `unpublish`: not read from WordPress documentation; the skill tells the user to check by loading the page.
- Which roles may create pages on a given site: depends on the user's configuration.
