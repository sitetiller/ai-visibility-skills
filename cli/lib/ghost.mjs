// Publish to Ghost through the Admin API with a Custom Integration key, and only ever touch posts/pages this tool created.
// Same ownership ledger as WordPress (.sitetiller/owned.json, key "ghost"). New posts default to "draft".
// Docs (checked 2026-11-13): https://docs.ghost.org/admin-api (token auth: key "id:secret", JWT HS256 with kid=id,
// aud "/admin/", exp at most 5 minutes after iat, secret hex-decoded; header "Authorization: Ghost <token>"; body wrapped
// as {"posts":[{...}]}) and https://docs.ghost.org/admin-api/posts/updating-a-post (PUT /admin/posts/{id}/,
// updated_at required for collision detection).
import { createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ledgerPath = (root) => join(root, ".sitetiller", "owned.json");
async function readL(root) { try { return JSON.parse(await readFile(ledgerPath(root), "utf8")); } catch { return { wordpress: [] }; } }
async function writeL(l, root) { await mkdir(join(root, ".sitetiller"), { recursive: true }); await writeFile(ledgerPath(root), JSON.stringify(l, null, 2)); }
const b64u = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/** Short-lived Admin API token (5 minutes). Pure apart from the clock. */
export function ghostToken(key, now = Math.floor(Date.now() / 1000)) {
  const [id, secret] = String(key || "").split(":");
  if (!id || !/^[0-9a-f]+$/i.test(secret || "")) throw new Error("GHOST_ADMIN_API_KEY must look like <id>:<hex secret> (Ghost Admin → Integrations → Custom integration). Never paste it into chat.");
  const head = b64u(JSON.stringify({ alg: "HS256", kid: id, typ: "JWT" }));
  const body = b64u(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
  const sig = b64u(createHmac("sha256", Buffer.from(secret, "hex")).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}

function cfg(site, { key = process.env.GHOST_ADMIN_API_KEY } = {}) {
  const base = String(site || "").replace(/\/+$/, "").replace(/\/ghost(\/api\/admin)?$/, "");
  if (!/^https:\/\//.test(base)) throw new Error("Use the https:// admin address of the Ghost site (for Ghost(Pro): https://<name>.ghost.io).");
  if (!key) throw new Error("Set GHOST_ADMIN_API_KEY.");
  return { base, key };
}

async function call(c, method, path, body, fetcher = fetch) {
  const r = await fetcher(`${c.base}/ghost/api/admin/${path}`, { method, headers: { authorization: `Ghost ${ghostToken(c.key)}`, "accept-version": "v5.0", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Ghost ${r.status}: ${j.errors?.[0]?.message || "request failed"}`);
  return j;
}

export const GHOST_FIELDS = ["title", "html", "slug", "status", "custom_excerpt", "meta_title", "meta_description", "canonical_url", "og_image", "og_title", "og_description", "feature_image", "codeinjection_head"];
const pick = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => GHOST_FIELDS.includes(k) && v != null));
export function isGhostOwned(ledger, site, type, id) { const base = site.replace(/\/+$/, ""); return (ledger.ghost || []).some((x) => x.site === base && x.type === type && x.id === String(id)); }

/** Create a post or page (draft by default) tagged #sitetiller (an internal tag) and record it as owned. */
export async function ghostCreate(site, { type = "posts", ...fields }, opts = {}) {
  if (!["posts", "pages"].includes(type)) throw new Error("type must be posts or pages");
  if (!fields.title || !fields.html) throw new Error("title and html are required");
  const c = cfg(site, opts);
  const j = await call(c, "POST", `${type}/?source=html`, { [type]: [{ status: "draft", ...pick(fields), tags: [{ name: "#sitetiller" }] }] }, opts.fetcher);
  const p = j[type]?.[0] || {};
  const root = opts.root || process.cwd();
  const l = await readL(root);
  (l.ghost ||= []).push({ site: c.base, type, id: String(p.id), url: p.url, createdAt: new Date().toISOString(), title: fields.title });
  await writeL(l, root);
  return { id: p.id, url: p.url, status: p.status, owned: true };
}

/** Update an owned post or page. Reads it first for updated_at (Ghost's collision check) and keeps its tags. */
export async function ghostUpdate(site, { type = "posts", id, ...fields }, opts = {}) {
  const root = opts.root || process.cwd();
  if (!isGhostOwned(await readL(root), site, type, id)) throw new Error(`Refusing to edit ${type}/${id}: it was not created by this tool (not in .sitetiller/owned.json). Existing pages are never edited.`);
  const c = cfg(site, opts);
  const upd = pick(fields);
  if (!Object.keys(upd).length) throw new Error("Nothing to update.");
  const cur = (await call(c, "GET", `${type}/${encodeURIComponent(id)}/`, null, opts.fetcher))[type]?.[0];
  if (!cur) throw new Error(`${type}/${id} not found on the site.`);
  const j = await call(c, "PUT", `${type}/${encodeURIComponent(id)}/${upd.html ? "?source=html" : ""}`, { [type]: [{ ...upd, updated_at: cur.updated_at }] }, opts.fetcher);
  const p = j[type]?.[0] || {};
  return { id: p.id, url: p.url, status: p.status, updated: Object.keys(upd) };
}

export const ghostUnpublish = (site, { type = "posts", id }, opts = {}) => ghostUpdate(site, { type, id, status: "draft" }, opts);
