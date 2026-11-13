// NAP (name, address, phone) consistency for local businesses across the user's own pages and listing pages the user names.
// Reads LocalBusiness/Organization JSON-LD, tel: links and visible phone numbers; normalises and compares.
import { get, isPublicUrl, sleep } from "./http.mjs";
import { readable } from "./page.mjs";

export const normPhone = (s) => { const d = String(s || "").replace(/^tel:/i, "").replace(/[^\d+]/g, ""); return d.replace(/^00/, "+"); };
export const normText = (s) => String(s || "").toLowerCase().replace(/&amp;/g, "&").replace(/\b(street|st|avenue|ave|road|rd|suite|ste|boulevard|blvd|drive|dr)\b\.?/g, (m) => ({ street: "st", avenue: "ave", road: "rd", suite: "ste", boulevard: "blvd", drive: "dr" }[m.replace(".", "")] || m.replace(".", ""))).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const last = (p) => p.replace(/^\+/, "").slice(-9); // compare the national part; country prefixes differ in formatting

function entities(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => entities(n, out));
  else if (node && typeof node === "object") { if (node["@type"]) out.push(node); if (node["@graph"]) entities(node["@graph"], out); }
  return out;
}

/** Pure: NAP facts found in one HTML document. */
export function extractNap(html) {
  const found = { names: new Set(), addresses: new Set(), phones: new Set(), sources: [] };
  for (const m of String(html).matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data; try { data = JSON.parse(m[1].trim()); } catch { continue; }
    for (const e of entities(data)) {
      const types = [].concat(e["@type"]);
      if (!types.some((t) => /LocalBusiness|Organization|Store|Restaurant|Dentist|Attorney|Hotel|Physician|AutoRepair|Plumber|Electrician|HomeAndConstructionBusiness|ProfessionalService/i.test(t))) continue;
      if (e.name) found.names.add(String(e.name));
      if (e.telephone) found.phones.add(normPhone(e.telephone));
      const a = e.address;
      if (a && typeof a === "object") found.addresses.add([a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry?.name || a.addressCountry].filter(Boolean).join(", "));
      else if (typeof a === "string") found.addresses.add(a);
      found.sources.push("json-ld");
    }
  }
  for (const m of String(html).matchAll(/href\s*=\s*["']tel:([^"']+)["']/gi)) { found.phones.add(normPhone(m[1])); found.sources.push("tel-link"); }
  const text = readable(html);
  for (const m of text.matchAll(/(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{2,4}[\s.-]\d{2,4}[\s.-]\d{2,5}/g)) { const p = normPhone(m[0]); if (p.replace("+", "").length >= 9 && p.replace("+", "").length <= 15) found.phones.add(p); }
  return { names: [...found.names], addresses: [...found.addresses], phones: [...found.phones], sources: [...new Set(found.sources)] };
}

/** Pure: compare NAP sets across pages against the expected (canonical) NAP. */
export function compareNap(pages, expected = {}) {
  const exp = { name: normText(expected.name), address: normText(expected.address), phone: expected.phone ? last(normPhone(expected.phone)) : "" };
  const rows = pages.map((p) => {
    const issues = [];
    if (exp.name && p.names.length && !p.names.some((n) => normText(n) === exp.name)) issues.push(`name differs: ${p.names.join(" | ")}`);
    if (exp.phone && !p.phones.some((x) => last(x) === exp.phone)) issues.push(p.phones.length ? `phone differs: ${p.phones.join(" | ")}` : "phone not found");
    if (exp.address && p.addresses.length && !p.addresses.some((a) => normText(a).includes(exp.address) || exp.address.includes(normText(a)))) issues.push(`address differs: ${p.addresses.join(" | ")}`);
    return { url: p.url, ...p, issues };
  });
  const allPhones = new Set(rows.flatMap((r) => r.phones.map(last)));
  return { expected, consistent: rows.every((r) => !r.issues.length), distinctPhones: allPhones.size, rows };
}

export async function napReport(urls, { name, address, phone, delayMs = 1000 } = {}) {
  const pages = [];
  for (const u of urls) {
    if (!isPublicUrl(u)) { pages.push({ url: u, names: [], addresses: [], phones: [], sources: [], error: "not a public URL" }); continue; }
    try { const r = await get(u, { ms: 10000, maxBytes: 3_000_000 }); pages.push({ url: u, status: r.status, ...extractNap(r.text) }); }
    catch (e) { pages.push({ url: u, names: [], addresses: [], phones: [], sources: [], error: String(e.message || e) }); }
    if (delayMs) await sleep(delayMs);
  }
  return { ...compareNap(pages, { name, address, phone }), note: "Listing sites may block automated fetches or render NAP with JavaScript; check those by hand. Fetch only pages the user named." };
}
