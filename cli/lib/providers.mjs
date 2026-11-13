// Optional paid data providers with the user's own keys (BYO-key). Nothing here runs without a key and an explicit --yes.
// Free first-party sources (Search Console, Bing, CrUX) stay the default; third-party indexes are estimates.
// Docs (checked 2026-11-13):
//   DataForSEO Backlinks Summary (live): POST https://api.dataforseo.com/v3/backlinks/summary/live, Basic login:password,
//     body [{ target, include_subdomains }], result at tasks[0].result[0] (backlinks, referring_domains, rank, broken_backlinks, referring_ips)
//     https://docs.dataforseo.com/v3/backlinks/summary/live/
//   Ahrefs Site Explorer Domain Rating: GET https://api.ahrefs.com/v3/site-explorer/domain-rating?target=&date=, Bearer key,
//     response { domain_rating: { domain_rating, ahrefs_rank } }  https://docs.ahrefs.com/docs/api/site-explorer/operations/get-domain-rating

export const PROVIDERS = {
  dataforseo: { env: ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"], billing: "per request (see dataforseo.com/pricing)" },
  ahrefs: { env: ["AHREFS_API_KEY"], billing: "API units on your Ahrefs plan" },
};

export function providerStatus(env = process.env) {
  return Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, { configured: p.env.every((e) => !!env[e]), needs: p.env, billing: p.billing }]));
}

export async function dataforseoSummary(target, { login = process.env.DATAFORSEO_LOGIN, password = process.env.DATAFORSEO_PASSWORD, fetcher = fetch } = {}) {
  if (!login || !password) throw new Error("Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD (your DataForSEO API credentials).");
  const r = await fetcher("https://api.dataforseo.com/v3/backlinks/summary/live", { method: "POST", headers: { authorization: "Basic " + Buffer.from(`${login}:${password}`).toString("base64"), "content-type": "application/json" },
    body: JSON.stringify([{ target, include_subdomains: true }]) });
  const j = await r.json().catch(() => ({}));
  const task = j.tasks?.[0];
  if (!r.ok || !task || task.status_code >= 40000) throw new Error(`DataForSEO: ${task?.status_message || j.status_message || `HTTP ${r.status}`}`);
  const x = task.result?.[0] || {};
  return { provider: "dataforseo", target, backlinks: x.backlinks ?? null, referringDomains: x.referring_domains ?? null, rank: x.rank ?? null, brokenBacklinks: x.broken_backlinks ?? null, referringIps: x.referring_ips ?? null, cost: task.cost ?? null };
}

export async function ahrefsDomainRating(target, { key = process.env.AHREFS_API_KEY, date = new Date().toISOString().slice(0, 10), fetcher = fetch } = {}) {
  if (!key) throw new Error("Set AHREFS_API_KEY (Ahrefs API v3 key).");
  const r = await fetcher(`https://api.ahrefs.com/v3/site-explorer/domain-rating?${new URLSearchParams({ target, date })}`, { headers: { authorization: `Bearer ${key}`, accept: "application/json" } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Ahrefs: ${j.error || `HTTP ${r.status}`}`);
  return { provider: "ahrefs", target, date, domainRating: j.domain_rating?.domain_rating ?? null, ahrefsRank: j.domain_rating?.ahrefs_rank ?? null };
}
