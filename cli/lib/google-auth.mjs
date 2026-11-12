// Google API access tokens without dependencies.
// Order: GOOGLE_ACCESS_TOKEN env (e.g. from `gcloud auth print-access-token`), then a service account key file
// (GOOGLE_APPLICATION_CREDENTIALS or --key). Service accounts must be added as a user on the Search Console
// property / GA4 property with read access. Tokens are kept in memory only.
import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

const cache = new Map();
const b64url = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

export async function accessToken(scope, { keyFile } = {}) {
  if (process.env.GOOGLE_ACCESS_TOKEN) return process.env.GOOGLE_ACCESS_TOKEN;
  const file = keyFile || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!file) throw new Error("No Google credentials. Set GOOGLE_ACCESS_TOKEN, or GOOGLE_APPLICATION_CREDENTIALS to a service account JSON key file (see skills/st-setup).");
  const k = cache.get(scope + file);
  if (k && k.exp > Date.now() + 60_000) return k.token;
  const key = JSON.parse(await readFile(file, "utf8"));
  if (!key.client_email || !key.private_key) throw new Error(`${file} is not a service account key (needs client_email and private_key).`);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: key.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${b64url(signer.sign(key.private_key))}`;
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`Google token error: ${j.error_description || j.error || r.status}`);
  cache.set(scope + file, { token: j.access_token, exp: Date.now() + j.expires_in * 1000 });
  return j.access_token;
}

export async function googleJson(url, { scope, body, keyFile, method = body ? "POST" : "GET" } = {}) {
  const token = await accessToken(scope, { keyFile });
  const r = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google API ${r.status}: ${j.error?.message || JSON.stringify(j).slice(0, 200)}`);
  return j;
}
