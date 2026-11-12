// Publish to WordPress through the core REST API with an Application Password, and only ever touch posts this tool created.
// Every created post id is written to a local ledger (.sitetiller/owned.json). Updates, unpublishing and rollbacks
// refuse any id that is not in the ledger. New posts default to "draft".
// Docs (checked 2026-11-12): https://developer.wordpress.org/rest-api/reference/posts/ (create POST /wp/v2/posts,
// update POST /wp/v2/posts/<id>, status: publish|future|draft|pending|private) and
// https://developer.wordpress.org/rest-api/reference/application-passwords/
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ledgerPath = (root) => join(root, ".sitetiller", "owned.json");
export async function readLedger(root = process.cwd()) { try { return JSON.parse(await readFile(ledgerPath(root), "utf8")); } catch { return { wordpress: [] }; } }
async function writeLedger(l, root) { await mkdir(join(root, ".sitetiller"), { recursive: true }); await writeFile(ledgerPath(root), JSON.stringify(l, null, 2)); }

function cfg(site, { user = process.env.WP_USER, appPassword = process.env.WP_APP_PASSWORD } = {}) {
  if (!user || !appPassword) throw new Error("Set WP_USER and WP_APP_PASSWORD (Users → Profile → Application Passwords). Never paste them into chat.");
  const base = site.replace(/\/+$/, "");
  if (!/^https:\/\//.test(base)) throw new Error("Use the https:// address of the WordPress site; Application Passwords over plain http are unsafe.");
  return { base, auth: "Basic " + Buffer.from(`${user}:${appPassword.replace(/\s+/g, "")}`).toString("base64") };
}

async function call(c, path, body) {
  const r = await fetch(`${c.base}/wp-json/wp/v2/${path}`, { method: body ? "POST" : "GET", headers: { authorization: c.auth, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`WordPress ${r.status}: ${j.message || j.code || "request failed"}`);
  return j;
}

export function isOwned(ledger, site, type, id) {
  const base = site.replace(/\/+$/, "");
  return ledger.wordpress.some((x) => x.site === base && x.type === type && x.id === Number(id));
}

/** Create a post or page (draft by default) and record it as owned. */
export async function wpCreate(site, { type = "posts", title, content, excerpt, slug, status = "draft" }, opts = {}) {
  if (!["posts", "pages"].includes(type)) throw new Error("type must be posts or pages");
  if (!title || !content) throw new Error("title and content are required");
  const c = cfg(site, opts);
  const j = await call(c, type, { title, content, ...(excerpt ? { excerpt } : {}), ...(slug ? { slug } : {}), status });
  const root = opts.root || process.cwd();
  const l = await readLedger(root);
  l.wordpress.push({ site: c.base, type, id: j.id, link: j.link, createdAt: new Date().toISOString(), title });
  await writeLedger(l, root);
  return { id: j.id, link: j.link, status: j.status, owned: true };
}

/** Update fields on a post this tool created. Refuses anything else. */
export async function wpUpdate(site, { type = "posts", id, ...fields }, opts = {}) {
  const root = opts.root || process.cwd();
  if (!isOwned(await readLedger(root), site, type, id)) throw new Error(`Refusing to edit ${type}/${id}: it was not created by this tool (not in .sitetiller/owned.json). Existing pages are never edited.`);
  const allowed = Object.fromEntries(Object.entries(fields).filter(([k, v]) => ["title", "content", "excerpt", "slug", "status"].includes(k) && v != null));
  if (!Object.keys(allowed).length) throw new Error("Nothing to update.");
  const j = await call(cfg(site, opts), `${type}/${Number(id)}`, allowed);
  return { id: j.id, link: j.link, status: j.status, updated: Object.keys(allowed) };
}

/** Pull an owned post back to draft (the "remove" option when a customer cancels). */
export const wpUnpublish = (site, { type = "posts", id }, opts = {}) => wpUpdate(site, { type, id, status: "draft" }, opts);
