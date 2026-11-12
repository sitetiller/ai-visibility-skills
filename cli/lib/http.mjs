// Minimal, polite HTTP helpers. Read-only: GET requests only, size-capped, with a clear user agent.
export const UA = "SiteTillerCLI/0.1 (+https://github.com/sitetiller/seo-skills)";

export class ToolError extends Error {}

/** GET with timeout and byte cap. Follows redirects unless manual=true. */
export async function get(url, { ms = 8000, maxBytes = 1_500_000, manual = false, headers = {} } = {}) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      redirect: manual ? "manual" : "follow",
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.5", ...headers },
    });
    let text = "";
    if (r.body) {
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        got += value.byteLength;
        text += dec.decode(value, { stream: true });
        if (got > maxBytes) { await reader.cancel(); break; }
      }
    }
    return { status: r.status, url: r.url || url, text, headers: r.headers, ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

export const looksHtml = (t) => /<html|<!doctype/i.test(String(t).slice(0, 800));

/** Normalise user input into origin + path. Rejects private hosts. */
export function target(raw) {
  let v = String(raw || "").trim();
  if (!v) throw new ToolError("Give a website address, for example example.com");
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  let u;
  try { u = new URL(v); } catch { throw new ToolError(`Not a valid address: ${raw}`); }
  const host = u.hostname.toLowerCase();
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host) || /(^|\.)(localhost|local|internal|lan|home|corp)$/.test(host)) {
    throw new ToolError(`Not a public website address: ${raw}`);
  }
  return { host, origin: `${u.protocol}//${u.hostname}${u.port ? ":" + u.port : ""}`, path: (u.pathname || "/") + (u.search || "") };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
