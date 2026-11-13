---
name: static-site-publish
description: "Publish new pages to a static or framework site (Next.js, Astro, Hugo, Eleventy, Jekyll, plain HTML) by committing Markdown or HTML files to its GitHub repository, so Vercel, Netlify or Cloudflare Pages deploy them like any push. Writes only inside one allow-listed content folder, refuses to overwrite files it did not create, and deletes only its own files. Includes the one-time template check (title, description, canonical, JSON-LD, sitemap). Use when the user's site is built from a Git repo and asks 'publish pages to my Next.js / Astro site', 'commit content by API', 'GitHub contents API', or 'add pages without touching my code'. Uses sitetiller github."
license: MIT
metadata:
  version: 0.2.0
---

# Static site publishing (GitHub)

Goal: new pages arrive as commits in one folder the user chose; nothing else in the repository can change.

## One-time setup (with the user)
1. Pick the folder, for example `content/sitetiller/` (Astro content collection, Hugo section, Next.js MDX folder). It must be a folder the site already turns into pages, or one the user adds a route for.
2. Check the template that renders it outputs: `<title>`, meta description, canonical, Open Graph, JSON-LD, and that the sitemap includes the folder. Verify on one test page with `npx sitetiller page <url>` and `npx sitetiller schema <url>`.
3. The user creates a fine-grained GitHub token limited to that one repository with Contents read and write, and sets `GITHUB_TOKEN` locally. Never paste it into chat.

## Steps
1. Write the file with front matter the template expects (title, description, canonical, date).
2. Commit it:
   ```bash
   npx sitetiller github put owner/site --dir content/sitetiller --file pricing-calculator.md --content-file draft.md --json
   ```
   Output: `path`, `created` (true for a new file), `commit`, `url`. The path is recorded in `.sitetiller/owned.json`. Add `--branch preview` to commit to a branch and let the user merge.
3. After the deploy, check the live page: `npx sitetiller page <url>`, then `npx sitetiller version snapshot <url> --label v1`.
4. Update the same file later with the same command; it sends the current `sha` as the API requires.
5. Remove a page the tool created: `npx sitetiller github delete owner/site --dir content/sitetiller --file pricing-calculator.md`.

## What the tool refuses
- Paths outside `--dir`, `..` segments, `.git` or `.github` folders, and non-content files (only .md, .mdx, .html, .json, .yaml).
- Overwriting an existing file that is not in the ledger, and deleting any file not in the ledger.

## Guardrails
- Run one write at a time; GitHub's docs warn that parallel create/update and delete requests on the same repository conflict.
- Prefer committing to a branch for the first pages so the user reviews the deploy preview.
- Do not change build config, templates, routes or dependencies; if the template is missing SEO tags, tell the user what to add.

## References
- `references/sources.md`: GitHub REST docs, checked 2026-11-13.
