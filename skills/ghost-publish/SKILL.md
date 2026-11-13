---
name: ghost-publish
description: "Create and manage new posts or pages on a Ghost site through the Admin API with a custom integration key, with full SEO fields (meta title, meta description, canonical URL, Open Graph, head code injection for JSON-LD or robots), drafts by default, an internal #sitetiller tag, and a local ownership ledger that refuses to edit anything the tool did not create. Use when the user runs Ghost or Ghost(Pro) and asks 'publish to Ghost', 'Ghost Admin API', 'create Ghost post by API', 'set canonical in Ghost', or 'unpublish what SiteTiller made'. Uses sitetiller ghost."
license: MIT
metadata:
  version: 0.2.0
---

# Ghost publishing

Goal: add new pages to a Ghost site with every SEO field set, without any way to change the owner's existing posts.

## Setup (the user does this)
1. Ghost Admin > Settings > Integrations > Add custom integration. Copy the Admin API key (`<id>:<secret>`) and the API URL.
2. Put the key in an environment variable on their machine: `GHOST_ADMIN_API_KEY`. Never paste it into chat.
3. Use the admin URL over https (Ghost(Pro): `https://<name>.ghost.io`).

## Steps
1. Write the page as HTML (`page.html`), with a head snippet if needed (`head.html`, for JSON-LD from `npx sitetiller schema-gen article ...`).
2. Create a draft:
   ```bash
   npx sitetiller ghost create https://example.ghost.io --title "Title" --html-file page.html \
     --meta-title "Title tag" --meta-description "150 characters..." --slug my-page --head-file head.html --json
   ```
   Add `--type pages` for a page instead of a post. Output: `id`, `url`, `status` (draft), `owned: true`. The post carries the internal tag `#sitetiller` and is recorded in `.sitetiller/owned.json`.
3. Review in Ghost Admin, then publish:
   ```bash
   npx sitetiller ghost update https://example.ghost.io --id <id> --status published --json
   ```
   Updates read the post first and send its `updated_at`, which Ghost requires to prevent overwriting newer edits.
4. Snapshot the live URL for measurement: `npx sitetiller version snapshot <url> --label "v1"`.
5. To roll back: `npx sitetiller ghost unpublish https://example.ghost.io --id <id>` (back to draft).

Writable fields: title, html, slug, status, custom_excerpt, meta_title, meta_description, canonical_url, og_image, og_title, og_description, feature_image, codeinjection_head. Anything else (authors, tags, visibility) is ignored.

## Guardrails
- The tool refuses ids not in the ledger: "Existing pages are never edited." Do not work around it by editing the ledger.
- New content starts as a draft; publishing is a separate, explicit step the user approves.
- Ghost has no noindex field; if a page must not be indexed, put `<meta name="robots" content="noindex">` in `codeinjection_head` and say so.
- Members-only or paid visibility is not changed by this tool.

## References
- `references/sources.md`: Ghost Admin API docs, checked 2026-11-13.
