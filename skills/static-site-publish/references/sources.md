# Sources (checked 2026-11-13)

| Claim | Source |
|---|---|
| `PUT /repos/{owner}/{repo}/contents/{path}` creates or updates a file with base64 `content`; `sha` required to update; optional `branch` | https://docs.github.com/en/rest/repos/contents |
| `DELETE` the same path with `message` and `sha` | same page |
| Parallel create/update and delete requests on the same repository can conflict; run them serially | same page |
| Rate limits: 5,000 requests per hour for authenticated users; secondary limits on content creation | https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api |
| Fine-grained personal access tokens can be limited to selected repositories and permissions | https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens |
