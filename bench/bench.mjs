// Reproducible comparison of open-source SEO / AI visibility skill repos, from the public GitHub API.
// Counts: stars, license, last push, SKILL.md files, test files, scripts. Writes bench/results-<date>.json and prints a Markdown table.
// Usage: node bench/bench.mjs [--token $GITHUB_TOKEN]   (unauthenticated: 60 requests/hour is enough for this list)
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const REPOS = [
  "coreyhaines31/marketingskills",
  "AgriciDaniel/claude-seo",
  "zubair-trabzada/geo-seo-claude",
  "Ryze-AI-Adgent/open-seo-mcp-skills",
  "kostja94/marketing-skills",
  "iannuttall/seo",
  "saurabhsharma2u/search-console-mcp",
];
const args = process.argv.slice(2);
const token = args[args.indexOf("--token") + 1] && args.includes("--token") ? args[args.indexOf("--token") + 1] : process.env.GITHUB_TOKEN;
const H = { accept: "application/vnd.github+json", "user-agent": "sitetiller-bench", ...(token ? { authorization: `Bearer ${token}` } : {}) };
const gh = async (p) => { const r = await fetch(`https://api.github.com/${p}`, { headers: H }); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); };
const isTest = (p) => /(^|\/)(tests?|__tests__|spec)\//i.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]+\.py$|_test\.(py|go)$/i.test(p);
const isScript = (p) => /\.(m?js|cjs|ts|py|sh)$/i.test(p) && !isTest(p) && !/node_modules|\.d\.ts$/.test(p);

async function remote(full) {
  const repo = await gh(`repos/${full}`);
  const tree = await gh(`repos/${full}/git/trees/${repo.default_branch}?recursive=1`);
  const paths = (tree.tree || []).filter((x) => x.type === "blob").map((x) => x.path);
  return { repo: full, stars: repo.stargazers_count, license: repo.license?.spdx_id || "none", pushed: repo.pushed_at?.slice(0, 10), skills: paths.filter((p) => /(^|\/)SKILL\.md$/.test(p)).length, testFiles: paths.filter(isTest).length, scripts: paths.filter(isScript).length, truncated: !!tree.truncated };
}

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", ".sitetiller"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out); else out.push(p.replace(/\\/g, "/"));
  }
  return out;
}

async function local() {
  const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const files = (await walk(root)).map((p) => p.slice(root.replace(/\\/g, "/").length).replace(/^\//, ""));
  const testsSrc = await Promise.all(files.filter((p) => p.startsWith("tests/")).map((p) => readFile(join(root, p), "utf8")));
  return { repo: "sitetiller/seo-skills (this repo)", stars: null, license: "MIT", pushed: new Date().toISOString().slice(0, 10), skills: files.filter((p) => /(^|\/)SKILL\.md$/.test(p)).length, testFiles: files.filter(isTest).length, testCases: testsSrc.reduce((n, s) => n + (s.match(/^test\(/gm) || []).length, 0), scripts: files.filter(isScript).length, truncated: false };
}

const rows = [await local()];
for (const r of REPOS) { try { rows.push(await remote(r)); } catch (e) { rows.push({ repo: r, error: e.message }); } }
const date = new Date().toISOString().slice(0, 10);
await writeFile(new URL(`./results-${date}.json`, import.meta.url), JSON.stringify({ date, method: "GitHub REST API: repos/{repo} and git/trees/{branch}?recursive=1; counts by file path", rows }, null, 2));
console.log(`| Repository | Stars | License | Last push | SKILL.md files | Test files | Scripts |\n|---|---|---|---|---|---|---|`);
for (const r of rows) console.log(r.error ? `| ${r.repo} | error: ${r.error} |||||` : `| ${r.repo} | ${r.stars ?? "-"} | ${r.license} | ${r.pushed} | ${r.skills} | ${r.testFiles}${r.testCases ? ` (${r.testCases} cases)` : ""} | ${r.scripts}${r.truncated ? " (tree truncated)" : ""} |`);
console.log(`\nGenerated ${date}. Counts are file counts, not a quality score. Re-run: node bench/bench.mjs`);
