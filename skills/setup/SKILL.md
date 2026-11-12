---
name: setup
description: "Connect the user's own Search Console, Bing Webmaster Tools, Google Analytics 4, Chrome UX Report (CrUX) and IndexNow accounts so the sitetiller CLI can read their data, then test each connection. Use when the user says 'set up Search Console', 'connect GSC/Bing/GA4', 'get an API key', 'GOOGLE_APPLICATION_CREDENTIALS', 'service account', 'my gsc command fails with 401/403', 'IndexNow key', or runs a sitetiller command that reports missing credentials. Covers read-only scopes, where secrets live, and a connection test per service."
license: MIT
metadata:
  version: 0.1.0
---

# Connect your data sources

Goal: get each credential working with the least access it needs, keep it out of chat and out of git, and prove it works with one real command per service. Public-site checks (`crawlers`, `page`, `sitemap`, `pages`, `links`, `schema`) need no setup. Only the services below do.

## Inputs
- Which services the user wants: Search Console, Bing, GA4, CrUX, IndexNow.
- Their site as verified in each tool (for Search Console, a domain property `sc-domain:example.com` or a URL-prefix property `https://www.example.com/`).

## Rules before anything else
1. **Never ask the user to paste a key, token or JSON file into chat.** Tell them to set it in their own shell or a local `.env` and confirm with the test commands below.
2. **Gitignore secrets first:** add `.env`, key files such as `gsc-key.json`, and `.sitetiller/` to `.gitignore` before the key exists.
3. **Read-only where the vendor allows it.** Google: `webmasters.readonly` and `analytics.readonly`. Bing and CrUX keys cannot be scoped (see below), so say so.
4. **Windows PowerShell sets variables differently:** `$env:NAME = "value"` instead of `export NAME=value`.

## Search Console (Google)
The CLI uses either a service account key or a short-lived access token.

**Option A: service account (best for repeat use)**
1. In a Google Cloud project, enable the **Google Search Console API**.
2. Create a service account and a JSON key. Console: Service accounts, the account, Keys, Add key, Create new key, JSON. Or: `gcloud iam service-accounts keys create KEY_FILE --iam-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com`. The key downloads once. If key creation fails, an organization policy (`iam.disableServiceAccountKeyCreation`) is enforced; use Option B or ask the org admin.
3. In Search Console open the property: **Settings, Users and permissions, Add user**. Enter the service account email (`...iam.gserviceaccount.com`) and choose a permission level. Only property owners see this page.
   - **Restricted** is enough for `gsc` (Performance data). **Full** is needed for URL Inspection (`inspect`): Google lists URL Inspection among the actions Full users can take and says Restricted users cannot take most actions. If `inspect` returns 403 with Restricted, upgrade to Full.
   - Honest note: Google's Users and permissions page speaks of Google Account emails and does not mention service accounts. Adding a service account email is the usual practice; the test below proves it works for this property.
4. Point the CLI at the key:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/outside/repo/gsc-key.json
   ```

**Option B: user access token (no key file)**
Plain `gcloud auth print-access-token` carries gcloud's default scopes, which do not include Search Console. Google's gcloud reference says that for scopes outside Google Cloud you supply an OAuth client file:
```bash
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/webmasters.readonly,https://www.googleapis.com/auth/cloud-platform --client-id-file=client_secret.json
export GOOGLE_ACCESS_TOKEN=$(gcloud auth application-default print-access-token)
```
The OAuth client file comes from the user's own Cloud project (Credentials, OAuth client ID, Desktop app). Tokens are short-lived: repeat the export when a command returns 401.

**Test**
```bash
npx sitetiller gsc example.com --start 2026-10-01 --end 2026-10-07 --dims query --json
npx sitetiller inspect example.com https://example.com/ --json
```
Expect rows with `clicks`, `impressions`, `ctr`, `position`, `query`. `example.com` becomes `sc-domain:example.com`; pass a full `https://.../` URL for a URL-prefix property (trailing slash required).

## Bing Webmaster Tools
1. Sign in at bing.com/webmasters, add and verify the site.
2. **Settings (top right), API Access**, accept the terms, **API Key, Generate API Key**. One key per user, valid for all that user's verified sites.
3. `export BING_WEBMASTER_API_KEY=...`
4. **The key is not scoped.** Microsoft documents API key and OAuth 2.0 access (OAuth recommended) and describes no read-only key. Treat it like a password and delete and regenerate it if exposed. The CLI only calls the read methods `GetQueryStats` and `GetPageStats`.

**Test**
```bash
npx sitetiller bing https://example.com/ --start 2026-10-01 --end 2026-11-05 --json
```
Bing's stats update weekly; a new site may return an empty list.

## Google Analytics 4 (AI-referral sessions)
1. Enable the **Google Analytics Data API** in a Cloud project.
2. Create a service account and key as above (scope used: `analytics.readonly`).
3. In GA4: **Admin, Property, Access Management, +, Add users**. Enter the service account email and pick a role. Use Viewer, the lowest role that can read data. Google's role page does not call Viewer read-only: Viewers can create and edit their own explorations.
4. Property ID: **Admin, Property, Property Settings**. It is a number, not the `G-...` measurement ID.

**Test**
```bash
npx sitetiller ga4-ai 123456789 --start 2026-10-01 --end 2026-10-31 --json
```
An empty array means no matching sessions. A 403 means the account is not on that property.

## Chrome UX Report (field Core Web Vitals)
1. In Google Cloud Credentials create an **API key** and enable the **Chrome UX Report API**. Restrict the key to that API.
2. `export CRUX_API_KEY=...`
3. Free within 150 queries per minute per project (Google's CrUX API page; more quota cannot be bought).

**Test**
```bash
npx sitetiller cwv https://example.com/ --origin --json
```
`available: false` with a note means CrUX has no data for that URL or origin. That is a data gap, not a broken key.

## IndexNow (fast Bing notification)
1. Make a key: 8 to 128 characters, letters, digits and dashes.
2. Host a UTF-8 text file named `<key>.txt` at the site root containing only the key.
3. `export INDEXNOW_KEY=<key>`
4. Test the key file: `curl -s https://example.com/<key>.txt` must print exactly the key.
5. Submit only changed URLs (see the `indexing` skill). IndexNow's FAQ says not to resubmit unchanged URLs, so do not use unchanged URLs as a test.

## Connection checklist
| Service | Variable | Test | Pass looks like |
|---|---|---|---|
| Search Console | `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_ACCESS_TOKEN` | `npx sitetiller gsc <site> --start .. --end .. --json` | rows with clicks and impressions |
| URL Inspection | same | `npx sitetiller inspect <site> <url> --json` | `verdict` and `coverageState` filled |
| Bing | `BING_WEBMASTER_API_KEY` | `npx sitetiller bing <siteUrl> --json` | rows or an empty list, no HTTP error |
| GA4 | same Google variable | `npx sitetiller ga4-ai <propertyId> --start .. --end ..` | array, may be empty |
| CrUX | `CRUX_API_KEY` | `npx sitetiller cwv <url> --origin --json` | `available: true` or a data-gap note |
| IndexNow | `INDEXNOW_KEY` | `curl` the key file | body equals the key |

## Common failures
| Message | Cause | Fix |
|---|---|---|
| `No Google credentials` | neither variable set in this shell | set one; every new terminal needs it again |
| `Google API 403` on `gsc` | service account not on the property, or wrong property type | add it under Users and permissions; use `sc-domain:` for domain properties and the exact URL-prefix otherwise |
| `Google API 403` on `inspect` only | Restricted permission | give the account Full |
| `Google API 401` | expired token | regenerate `GOOGLE_ACCESS_TOKEN` |
| `Google API 403` saying the API is disabled | API not enabled in the Cloud project | enable it and retry in a few minutes |
| `No Bing key` | variable unset | generate the key as above |
| `Set CRUX_API_KEY` | variable unset | create the key |
| `Key file not found or wrong content` | IndexNow file missing or has extra characters | re-upload it with only the key |

## Output to the user
1. Which services are connected, each with its test result.
2. What is missing and the exact next step (never the secret itself).
3. The permission level granted and how to revoke it.

## Guardrails
- Never print, log or commit a key, token or key file. If the user pastes one, tell them to revoke and regenerate it.
- Do not request write scopes (`webmasters`, `analytics.edit`). Submitting sitemaps through the Search Console API needs the write scope; use the Search Console UI.
- Do not call a Bing or CrUX key read-only.
- Do not state quotas Google does not publish; only the numbers in `references/sources.md` are published.

## References
- `references/sources.md`: official documentation for every step, checked 2026-11-12.
