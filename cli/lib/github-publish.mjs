// Publish pages to a static site (Next.js, Astro, Hugo, Eleventy, plain HTML) by committing files to its GitHub repository.
// Vercel, Netlify and Cloudflare Pages then deploy the commit as they do for any other push.
// Safety: writes only inside one allow-listed folder, never overwrites a file it did not create (ledger key "github"),
// and refuses paths that escape the folder. Docs (checked 2026-11-13): https://docs.github.com/en/rest/repos/contents
// (PUT /repos/{owner}/{repo}/contents/{path} with base64 content, sha required to update; DELETE needs sha).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, posix } from "node:path";

const ledgerPath = (root) => join(root, ".sitetiller", "owned.json");
async function readL(root) { try { return JSON.parse(await readFile(ledgerPath(root), "utf8")); } catch { return { wordpress: [] }; } }
async function writeL(l, root) { await mkdir(join(root, ".sitetiller"), { recursive: true }); await writeFile(ledgerPath(root), JSON.stringify(l, null, 2)); }

/** Normalise and check a repo path against the allowed folder. Throws on anything outside it. */
export function safePath(dir, file) {
  const d = posix.normalize(String(dir || "").replace(/\\/g, "/")).replace(/^\/+|\/+$/g, "");
  if (!d || d === "." || d.startsWith("..")) throw new Error("--dir must be a folder inside the repository, for example content/sitetiller");
  const p = posix.normalize(`${d}/${String(file || "").replace(/\\/g, "/")}`).replace(/^\/+/, "");
  if (!p.startsWith(d + "/") || p.includes("..") || /(^|\/)\.(git|github)(\/|$)/.test(p)) throw new Error(`Refusing path ${file}: outside ${d}/`);
  if (!/\.(md|mdx|html|json|ya?ml)$/i.test(p)) throw new Error("Only .md, .mdx, .html, .json or .yaml content files are written.");
  return p;
}

function cfg(repo, { token = process.env.GITHUB_TOKEN, branch } = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(String(repo || ""))) throw new Error("Repository must be owner/name.");
  if (!token) throw new Error("Set GITHUB_TOKEN (fine-grained token limited to this one repository, Contents: read and write). Never paste it into chat.");
  return { repo, token, branch };
}

async function gh(c, method, path, body, fetcher = fetch) {
  const r = await fetcher(`https://api.github.com/repos/${c.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}${method === "GET" && c.branch ? `?ref=${encodeURIComponent(c.branch)}` : ""}`,
    { method, headers: { authorization: `Bearer ${c.token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, j };
}
export const isGithubOwned = (l, repo, path) => (l.github || []).some((x) => x.repo === repo && x.path === path);

/** Create or update one content file. Creating fails if the file already exists and is not ours. */
export async function githubPut(repo, { dir, file, content, message }, opts = {}) {
  const c = cfg(repo, opts);
  const path = safePath(dir, file);
  const root = opts.root || process.cwd();
  const l = await readL(root);
  const cur = await gh(c, "GET", path, null, opts.fetcher);
  const owned = isGithubOwned(l, repo, path);
  if (cur.ok && !owned) throw new Error(`Refusing to overwrite ${path}: it exists and was not created by this tool. Existing pages are never edited.`);
  if (!cur.ok && cur.status !== 404) throw new Error(`GitHub ${cur.status}: ${cur.j.message || "request failed"}`);
  const res = await gh(c, "PUT", path, { message: message || `${cur.ok ? "Update" : "Add"} ${path} (SiteTiller)`, content: Buffer.from(String(content), "utf8").toString("base64"), ...(cur.ok ? { sha: cur.j.sha } : {}), ...(c.branch ? { branch: c.branch } : {}) }, opts.fetcher);
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${res.j.message || "request failed"}`);
  if (!owned) { (l.github ||= []).push({ repo, path, createdAt: new Date().toISOString() }); await writeL(l, root); }
  return { path, created: !cur.ok, commit: res.j.commit?.sha, url: res.j.content?.html_url };
}

/** Delete a file this tool created (the static-site version of unpublish). */
export async function githubDelete(repo, { dir, file, message }, opts = {}) {
  const c = cfg(repo, opts);
  const path = safePath(dir, file);
  const root = opts.root || process.cwd();
  const l = await readL(root);
  if (!isGithubOwned(l, repo, path)) throw new Error(`Refusing to delete ${path}: it was not created by this tool.`);
  const cur = await gh(c, "GET", path, null, opts.fetcher);
  if (!cur.ok) throw new Error(`GitHub ${cur.status}: ${cur.j.message || "not found"}`);
  const res = await gh(c, "DELETE", path, { message: message || `Remove ${path} (SiteTiller)`, sha: cur.j.sha, ...(c.branch ? { branch: c.branch } : {}) }, opts.fetcher);
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${res.j.message || "request failed"}`);
  l.github = l.github.filter((x) => !(x.repo === repo && x.path === path));
  await writeL(l, root);
  return { path, deleted: true, commit: res.j.commit?.sha };
}
