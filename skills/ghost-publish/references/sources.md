# Sources (checked 2026-11-13)

| Claim | Source |
|---|---|
| Admin API base `https://{admin_domain}/ghost/api/admin/`; `Authorization: Ghost <token>`; `Accept-Version: v{major}.{minor}` | https://docs.ghost.org/admin-api |
| Token: key split into id and hex secret; JWT header alg HS256, kid = id, typ JWT; payload iat, exp at most 5 minutes later, aud `/admin/` | same page |
| Request bodies use the resource wrapper `{"posts":[{...}]}` | same page |
| Create post with `title`, `html` (`?source=html`), `status`, `tags` | https://docs.ghost.org/admin-api/posts/creating-a-post |
| Post fields include slug, meta_title, meta_description, canonical_url, og_image, og_title, codeinjection_head | https://docs.ghost.org/admin-api/posts/overview |
| Update: `PUT /admin/posts/{id}/`, `updated_at` required (collision detection); relations such as tags are replaced | https://docs.ghost.org/admin-api/posts/updating-a-post |
| Tags starting with `#` are internal tags ("Internal tags use a hashtag") | https://ghost.org/help/tags/ |
