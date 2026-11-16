// Reproducible sample for `sitetiller study`: every "Show HN" story with an outside URL in a fixed UTC window,
// one row per registrable-looking host, ordered by sha256(seed + host). The first N rows are the sample.
// No judgement is applied to the sites: only mechanical exclusions (code hosts, social, stores) listed in EXCLUDE.
// Source: Hacker News Algolia API (https://hn.algolia.com/api), public, no key. Usage:
//   node scripts/study-sample.mjs --from 2026-09-01 --to 2026-10-31 --seed sitetiller-study-2026-pilot --n 200 --out sites.csv
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

export const EXCLUDE = /(^|\.)(github\.com|gitlab\.com|bitbucket\.org|youtube\.com|youtu\.be|twitter\.com|x\.com|medium\.com|substack\.com|dev\.to|hashnode\.dev|reddit\.com|linkedin\.com|facebook\.com|instagram\.com|arxiv\.org|wikipedia\.org|apps\.apple\.com|play\.google\.com|chromewebstore\.google\.com|addons\.mozilla\.org|huggingface\.co|pypi\.org|npmjs\.com|crates\.io|pkg\.go\.dev|rubygems\.org|itch\.io|producthunt\.com|news\.ycombinator\.com|docs\.google\.com|notion\.site|notion\.so|figma\.com|replit\.app|codepen\.io|observablehq\.com|streamlit\.app|hf\.space|gist\.github\.com|bsky\.app|mastodon\.social|t\.me|discord\.gg|vimeo\.com|loom\.com|imgur\.com|gumroad\.com|kaggle\.com)$/i;

/** Pure: story list -> unique hosts with first story, mechanical exclusions applied. */
export function hostsFromStories(stories) {
  const seen = new Map();
  for (const s of stories) {
    let u; try { u = new URL(s.url); } catch { continue; }
    if (!/^https?:$/.test(u.protocol)) continue;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host) || EXCLUDE.test(host)) continue;
    if (!seen.has(host)) seen.set(host, { host, source: "show-hn", source_url: `https://news.ycombinator.com/item?id=${s.objectID}`, posted_at: s.created_at, title: String(s.title || "").replace(/^Show HN:\s*/i, "") });
  }
  return [...seen.values()];
}
export const rankKey = (seed, host) => createHash("sha256").update(`${seed}|${host}`).digest("hex");
export function pick(rows, seed, n) { return rows.map((r) => ({ ...r, key: rankKey(seed, r.host) })).sort((a, b) => (a.key < b.key ? -1 : 1)).slice(0, n); }

async function fetchWindow(fromS, toS) {
  const out = [];
  for (let t = fromS; t < toS; t += 86400) {
    const end = Math.min(t + 86400, toS);
    for (let page = 0; page < 5; page++) {
      const url = `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=1000&page=${page}&numericFilters=${encodeURIComponent(`created_at_i>=${t},created_at_i<${end}`)}`;
      const r = await fetch(url, { headers: { "user-agent": "SiteTillerResearch/1.0 (+https://sitetiller.com/research)" } });
      if (!r.ok) throw new Error(`Algolia HTTP ${r.status}`);
      const j = await r.json();
      out.push(...j.hits.filter((h) => h.url));
      if (page + 1 >= j.nbPages) break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return out;
}

if (process.argv[1] && /study-sample.mjs$/.test(process.argv[1])) {
  const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith("--") ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []));
  const from = Date.parse(`${a.from}T00:00:00Z`) / 1000, to = Date.parse(`${a.to}T00:00:00Z`) / 1000 + 86400;
  const stories = await fetchWindow(from, to);
  const hosts = hostsFromStories(stories);
  const sample = pick(hosts, a.seed, Number(a.n || 200));
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const cols = ["rank", "host", "source", "source_url", "posted_at", "title"];
  await writeFile(a.out, cols.join(",") + "\n" + sample.map((r, i) => [i + 1, r.host, r.source, r.source_url, r.posted_at, r.title].map(esc).join(",")).join("\n") + "\n");
  console.log(JSON.stringify({ window: `${a.from}..${a.to}`, seed: a.seed, stories_with_url: stories.length, unique_hosts_after_exclusions: hosts.length, sampled: sample.length, out: a.out }));
}
