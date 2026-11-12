# Sources (checked 2026-11-12)

| Claim | Source |
|---|---|
| Permission levels Owner / Full user / Restricted user / Associate; Add user path Settings, Users and permissions; only owners see the page; up to 100 non-owner users; page speaks of Google Accounts and does not mention service accounts | https://support.google.com/webmasters/answer/7687615 |
| Full users can submit sitemaps and use URL Inspection; Restricted users see Performance and Links data and cannot take most actions | same page |
| Search Console API scopes `webmasters` (read/write) and `webmasters.readonly` (read-only); enable the Google Search Console API in the API console | https://developers.google.com/webmaster-tools/v1/how-tos/authorizing |
| URL Inspection API: `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`, `inspectionUrl` and `siteUrl` required, scopes webmasters or webmasters.readonly; domain property `sc-domain:example.com`, URL-prefix needs trailing slash | https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect |
| Quotas: URL Inspection 2,000 queries per day and 600 per minute per site; Search Analytics 1,200 per minute per site | https://developers.google.com/webmaster-tools/limits |
| Creating a service account JSON key (console steps, gcloud command); key downloads once; org policy `iam.disableServiceAccountKeyCreation` blocks it; Google recommends avoiding keys where possible | https://docs.cloud.google.com/iam/docs/keys-create-delete |
| `gcloud auth application-default login --scopes=...`; default scopes exclude Search Console; `--client-id-file` for non-GCP scopes | https://docs.cloud.google.com/sdk/gcloud/reference/auth/application-default/login |
| GA4 Data API: enable the API, scope `analytics.readonly`, credentials via GOOGLE_APPLICATION_CREDENTIALS | https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries |
| GA4: Admin, Property, Access Management, +, Add users, enter email | https://support.google.com/analytics/answer/9305788 |
| GA4 roles: Viewer can see settings and data, change which data appears in reports, and create/edit/delete own explorations | https://support.google.com/analytics/answer/9305587 |
| GA4 property ID: Admin, Property, Property Settings | https://developers.google.com/analytics/devguides/reporting/data/v1/property-id |
| CrUX API: API key, `POST https://chromeuxreport.googleapis.com/v1/records:queryRecord`, 150 queries per minute per project, free, 28-day window | https://developer.chrome.com/docs/crux/api |
| Bing API: OAuth 2.0 (recommended) or API key; Settings, API Access, Generate API Key; one key per user, works for all verified sites; do not share | https://learn.microsoft.com/en-us/bingwebmaster/getting-access |
| IndexNow key 8-128 chars (a-z, A-Z, 0-9, dashes); UTF-8 key file `<key>.txt` at root; do not resubmit unchanged URLs | https://www.indexnow.org/documentation and https://www.indexnow.org/faq |

## Not verified in official documentation
- Google's help does not say a service account email can be added as a Search Console user. The skill says so and relies on the connection test.
- Whether a Bing API key can be limited to read-only: Microsoft's page describes no such option, so the skill says keys are not scoped.
- Lifetime of a gcloud access token: not in the pages read. The skill says "short-lived" and tells the user to regenerate on 401.
- The CLI's `gsc`, `inspect`, `bing`, `ga4-ai` and `cwv` commands were not run against live credentials during authoring (no credentials available); field names come from the CLI source and Google's API reference.
