// llms.txt checks against the format at https://llmstxt.org/ (H1 required; blockquote summary; H2 file lists of [name](url): notes).
import { get, looksHtml, target } from "./http.mjs";

export function lintLlms(text) {
  const lines = String(text).replace(/^﻿/, "").split(/\r?\n/);
  const first = lines.find((l) => l.trim()) || "";
  const sections = lines.filter((l) => /^##\s+\S/.test(l)).map((l) => l.replace(/^##\s+/, "").trim());
  const links = [...String(text).matchAll(/^\s*[-*]\s*\[([^\]]+)\]\(([^)\s]+)\)(?::\s*(.*))?$/gm)].map((m) => ({ name: m[1], url: m[2], note: (m[3] || "").trim() }));
  const checks = [
    { id: "h1", ok: /^#\s+\S/.test(first), label: "Starts with an H1 (# Name), the only required part" },
    { id: "summary", ok: lines.some((l) => /^>\s*\S/.test(l)), label: "Blockquote summary under the H1" },
    { id: "sections", ok: sections.length > 0, label: "Links grouped under H2 sections" },
    { id: "links", ok: links.length > 0, label: "Links in [name](url): notes format" },
    { id: "size", ok: String(text).length < 100_000, label: "Short enough to read in one pass (<100 KB)" },
  ];
  return { checks, sections, links, optional: sections.some((s) => /^optional$/i.test(s)) };
}

export async function llmsReport(raw, { testLinks = 10 } = {}) {
  const t = target(raw);
  const url = `${t.origin}/llms.txt`;
  const r = await get(url, { ms: 8000, maxBytes: 500_000 });
  const ctype = r.headers.get("content-type") || "";
  if (r.status !== 200 || looksHtml(r.text)) return { url, status: r.status, found: false, contentType: ctype, note: r.status === 200 ? "Returns an HTML page, not a text file (a catch-all route)." : `No llms.txt (HTTP ${r.status}).` };
  const lint = lintLlms(r.text);
  lint.checks.push({ id: "ctype", ok: /text\/(plain|markdown)/i.test(ctype), label: `Served as text/plain or text/markdown (got: ${ctype || "none"})` });
  const tested = [];
  for (const l of lint.links.slice(0, testLinks)) {
    let status = 0;
    try { status = (await get(new URL(l.url, t.origin).toString(), { ms: 6000, maxBytes: 20_000 })).status; } catch { status = 0; }
    tested.push({ ...l, status });
  }
  return { url, status: r.status, found: true, contentType: ctype, bytes: r.text.length, ...lint, links: tested, linkCount: lint.links.length };
}

/** Build a spec-shaped llms.txt from a name, summary and [{section, url, title, note}]. */
export function buildLlms({ name, summary = "", pages = [] }) {
  const by = new Map();
  for (const p of pages) { const s = p.section || "Pages"; if (!by.has(s)) by.set(s, []); by.get(s).push(p); }
  let out = `# ${name}\n\n` + (summary ? `> ${summary.replace(/\s+/g, " ")}\n\n` : "");
  for (const [s, list] of by) out += `## ${s}\n\n` + list.map((p) => `- [${p.title || p.url}](${p.url})${p.note ? ": " + p.note : ""}`).join("\n") + "\n\n";
  return out.trim() + "\n";
}
