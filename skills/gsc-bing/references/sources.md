# Sources (checked 2026-11-12)

- Search Analytics query: dimensions country, device, page, query, searchAppearance, date, hour; rowLimit 1-25,000; page with startRow; returns top rows, not all. https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- URL Inspection API. https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- Search Console users and permissions (add a service account as a user). https://support.google.com/webmasters/answer/7687615
- Bing Webmaster API access: OAuth 2.0 or API key; key is per user, works across verified sites. https://learn.microsoft.com/en-us/bingwebmaster/getting-access
- GetQueryStats / GetPageStats: JSON endpoint `https://ssl.bing.com/webmaster/api.svc/json/<Method>?siteUrl=...&apikey=...`; fields AvgClickPosition, AvgImpressionPosition, Clicks, Date, Impressions, Query (page URL for GetPageStats); "The data will be updated every week." https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getquerystats
- Bing AI Performance report (Copilot citations, grounding queries). https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/
