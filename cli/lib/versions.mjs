// Version store for pages you own: snapshot what search engines see, diff versions, detect drift, prepare a rollback.
// Stored locally under .sitetiller/versions/<host>/<path-slug>/<timestamp>.json (gitignored by default).
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pageReport } from "./page.mjs";

const slug = (u) => { const x = new URL(u); return [x.hostname.replace(/^www\./, ""), (x.pathname.replace(/\/+$/, "") || "/home").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"]; };
const dirFor = (root, url) => { const [h, p] = slug(url); return join(root, ".sitetiller", "versions", h, p); };
const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/** The fields that change what a search result or an AI answer can show. */
export function fingerprint(r) {
  return {
    status: r.status, finalUrl: r.finalUrl, title: r.title || "", description: r.description || "",
    h1: (r.h1 || []).join(" | "), headings: (r.headings || []).map((h) => `${"#".repeat(h.level)} ${h.text}`),
    canonical: r.canonical || "", noindex: !!r.noindex, schemaTypes: (r.schemaTypes || []).slice().sort(),
    words: r.words || 0, tables: r.tables || 0, internalLinks: r.internalLinks || 0, textHash: hash(r.text || ""),
  };
}

export async function snapshot(url, { root = process.cwd(), label = "" } = {}) {
  const r = await pageReport(url);
  const fp = fingerprint(r);
  const dir = dirFor(root, r.finalUrl || url);
  await mkdir(dir, { recursive: true });
  const prev = await list(url, { root });
  const last = prev[prev.length - 1];
  if (last && JSON.stringify(last.fingerprint) === JSON.stringify(fp)) return { saved: false, reason: "unchanged since last snapshot", version: last };
  const at = new Date().toISOString();
  const v = { url: r.finalUrl || url, at, label, n: prev.length + 1, fingerprint: fp, text: r.text || "" };
  await writeFile(join(dir, `${at.replace(/[:.]/g, "-")}.json`), JSON.stringify(v, null, 2));
  return { saved: true, version: { ...v, text: undefined } };
}

export async function list(url, { root = process.cwd() } = {}) {
  const dir = dirFor(root, url);
  let files = [];
  try { files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort(); } catch { return []; }
  const out = [];
  for (const f of files) out.push(JSON.parse(await readFile(join(dir, f), "utf8")));
  return out;
}

export function diff(a, b) {
  const changes = [];
  for (const k of Object.keys(b)) {
    const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
    if (x === y) continue;
    if (k === "headings") {
      const A = new Set(a[k]), B = new Set(b[k]);
      changes.push({ field: k, removed: a[k].filter((h) => !B.has(h)), added: b[k].filter((h) => !A.has(h)) });
    } else changes.push({ field: k, from: a[k], to: b[k] });
  }
  return changes;
}

/** Compare the live page with the latest stored version. */
export async function drift(url, { root = process.cwd() } = {}) {
  const versions = await list(url, { root });
  if (!versions.length) return { url, versions: 0, drift: null, note: "No stored version yet. Run snapshot first." };
  const live = fingerprint(await pageReport(url));
  const last = versions[versions.length - 1];
  return { url, versions: versions.length, lastAt: last.at, drift: diff(last.fingerprint, live) };
}

/**
 * Rollback plan: the stored values to restore. This tool does not write to your site; publishing tools
 * (for example the WordPress skill) apply the plan, and only to pages you own.
 */
export async function rollbackPlan(url, { to, root = process.cwd() } = {}) {
  const versions = await list(url, { root });
  if (versions.length < 2 && to == null) return { url, note: "Need at least two stored versions to roll back." };
  const target = to != null ? versions.find((v) => v.n === Number(to)) : versions[versions.length - 2];
  if (!target) return { url, note: `No version ${to}. Stored: ${versions.map((v) => v.n).join(", ")}` };
  const current = versions[versions.length - 1];
  return { url, from: current.n, to: target.n, restore: { title: target.fingerprint.title, description: target.fingerprint.description, h1: target.fingerprint.h1, canonical: target.fingerprint.canonical, noindex: target.fingerprint.noindex }, changes: diff(current.fingerprint, target.fingerprint), text: target.text };
}
