// Minimal, polite HTTP helpers. Read-only: GET requests only, size-capped, with a clear user agent.
export const UA = "SiteTillerCLI/0.2 (+https://github.com/sitetiller/seo-skills)";

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

/** True for a public http(s) URL: no IP literals, no localhost-style names, no credentials, default or common web ports.
 * Used on every hop a crawler follows, so a public page cannot redirect or link the tool into a private network. */
export function isPublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return false; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return false;
  if (u.port && !["80", "443", "8080", "8443"].includes(u.port)) return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") || /^[\d.]+$/.test(host) || /^0x/i.test(host)) return false; // IPv6 / IPv4 / hex literals
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) return false;
  return !/(^|\.)(localhost|local|internal|lan|home|corp|intranet|localdomain|home\.arpa)$/.test(host);
}

export const sleep =(ms) => new Promise((r) => setTimeout(r, ms));
