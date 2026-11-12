// Structured data lint against Google's documented required properties for common rich result types.
// Sources (checked 2026-11-12): Google Search Central structured data docs per type and the search gallery.
// This is not a replacement for Google's Rich Results Test; it catches the common omissions across many pages.

export const REQUIRED = {
  Article: { required: [], recommended: ["headline", "image", "datePublished", "dateModified", "author"], doc: "https://developers.google.com/search/docs/appearance/structured-data/article" },
  SoftwareApplication: { required: ["name", "offers.price", "aggregateRating|review"], recommended: ["applicationCategory", "operatingSystem"], doc: "https://developers.google.com/search/docs/appearance/structured-data/software-app" },
  Product: { required: ["name", "review|aggregateRating|offers"], recommended: ["image", "brand", "offers.price"], doc: "https://developers.google.com/search/docs/appearance/structured-data/product-snippet" },
  Event: { required: ["name", "startDate", "location"], recommended: ["endDate", "offers", "organizer"], doc: "https://developers.google.com/search/docs/appearance/structured-data/event" },
  LocalBusiness: { required: ["name", "address"], recommended: ["telephone", "openingHoursSpecification", "geo"], doc: "https://developers.google.com/search/docs/appearance/structured-data/local-business" },
};
export const REMOVED = {
  FAQPage: "Google stopped showing FAQ rich results on 2026-05-07 (changelog on the FAQ structured data page).",
  HowTo: "HowTo is not in Google's structured data search gallery; no rich result.",
};
const SUBTYPES = { BlogPosting: "Article", NewsArticle: "Article", WebApplication: "SoftwareApplication", MobileApplication: "SoftwareApplication", Restaurant: "LocalBusiness", Store: "LocalBusiness", Dentist: "LocalBusiness" };

const has = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : Array.isArray(o) ? o.map((x) => x?.[k]).find((v) => v != null) : o[k]), obj) != null;

function entities(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => entities(n, out));
  else if (node && typeof node === "object") { if (node["@type"]) out.push(node); if (node["@graph"]) entities(node["@graph"], out); }
  return out;
}

/** Lint all JSON-LD blocks in an HTML string. */
export function lintSchema(html) {
  const findings = [];
  const types = [];
  for (const m of String(html).matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(m[1].trim()); } catch (e) { findings.push({ level: "error", type: "-", message: `Invalid JSON-LD: ${String(e.message).slice(0, 100)}` }); continue; }
    for (const e of entities(data)) {
      for (const raw of [].concat(e["@type"])) {
        types.push(raw);
        if (REMOVED[raw]) findings.push({ level: "info", type: raw, message: REMOVED[raw] });
        const spec = REQUIRED[raw] || REQUIRED[SUBTYPES[raw]];
        if (!spec) continue;
        for (const req of spec.required) if (!req.split("|").some((p) => has(e, p))) findings.push({ level: "error", type: raw, message: `Missing required ${req.replace(/\|/g, " or ")} for Google's rich result`, doc: spec.doc });
        for (const rec of spec.recommended) if (!has(e, rec)) findings.push({ level: "warning", type: raw, message: `Recommended property ${rec} missing`, doc: spec.doc });
      }
    }
  }
  const counts = types.reduce((a, t) => ((a[t] = (a[t] || 0) + 1), a), {});
  for (const [t, n] of Object.entries(counts)) if (n > 1 && ["Organization", "WebSite", "Article", "BreadcrumbList", "Product", "SoftwareApplication"].includes(t)) findings.push({ level: "warning", type: t, message: `${n} ${t} entities on one page; usually a theme and a plugin both output it` });
  return { types: counts, findings };
}
