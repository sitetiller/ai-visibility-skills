// Generate JSON-LD for common types from facts the user gives, then lint it with the same rules as `schema`.
// Never invents values: a property with no input is left out, and the lint lists what is still required or recommended.
// Ratings and reviews are never generated; they must come from real reviews shown on the page (Google review snippet policy).
import { lintSchema, REMOVED } from "./schema-lint.mjs";

const clean = (o) => {
  if (Array.isArray(o)) { const a = o.map(clean).filter((v) => v !== undefined); return a.length ? a : undefined; }
  if (o && typeof o === "object") { const r = {}; for (const [k, v] of Object.entries(o)) { const c = clean(v); if (c !== undefined) r[k] = c; } return Object.keys(r).filter((k) => k !== "@type").length ? r : undefined; }
  return o === "" || o == null ? undefined : o;
};
const list = (v) => (v == null || v === "" ? undefined : String(v).split(",").map((s) => s.trim()).filter(Boolean));
const num = (v) => (v == null || v === "" ? undefined : Number(v));

export const TYPES = {
  organization: (d) => ({ "@type": d.subtype || "Organization", name: d.name, url: d.url, logo: d.logo, description: d.description, email: d.email, sameAs: list(d.sameAs) }),
  website: (d) => ({ "@type": "WebSite", name: d.name, url: d.url, publisher: d.publisher ? { "@type": "Organization", name: d.publisher } : undefined }),
  article: (d) => ({ "@type": d.subtype || "Article", headline: d.headline || d.name, description: d.description, image: list(d.image), datePublished: d.datePublished, dateModified: d.dateModified || d.datePublished,
    author: d.author ? { "@type": d.authorType || "Person", name: d.author, url: d.authorUrl } : undefined, publisher: d.publisher ? { "@type": "Organization", name: d.publisher, logo: d.logo ? { "@type": "ImageObject", url: d.logo } : undefined } : undefined, mainEntityOfPage: d.url }),
  product: (d) => ({ "@type": "Product", name: d.name, description: d.description, image: list(d.image), sku: d.sku, gtin: d.gtin, brand: d.brand ? { "@type": "Brand", name: d.brand } : undefined,
    offers: d.price != null ? { "@type": "Offer", price: num(d.price), priceCurrency: d.currency, availability: d.availability ? `https://schema.org/${d.availability}` : undefined, url: d.url, priceValidUntil: d.priceValidUntil } : undefined }),
  software: (d) => ({ "@type": d.subtype || "SoftwareApplication", name: d.name, description: d.description, url: d.url, applicationCategory: d.category, operatingSystem: d.os,
    offers: d.price != null ? { "@type": "Offer", price: num(d.price), priceCurrency: d.currency } : undefined }),
  localbusiness: (d) => ({ "@type": d.subtype || "LocalBusiness", name: d.name, url: d.url, image: list(d.image), telephone: d.telephone, priceRange: d.priceRange,
    address: d.street || d.city ? { "@type": "PostalAddress", streetAddress: d.street, addressLocality: d.city, addressRegion: d.region, postalCode: d.postalCode, addressCountry: d.country } : undefined,
    geo: d.lat != null && d.lng != null ? { "@type": "GeoCoordinates", latitude: num(d.lat), longitude: num(d.lng) } : undefined, sameAs: list(d.sameAs) }),
  breadcrumb: (d) => ({ "@type": "BreadcrumbList", itemListElement: (list(d.items) || []).map((pair, i) => { const [name, item] = pair.split("|"); return { "@type": "ListItem", position: i + 1, name, item }; }) }),
  event: (d) => ({ "@type": "Event", name: d.name, startDate: d.startDate, endDate: d.endDate, description: d.description, eventAttendanceMode: d.online ? "https://schema.org/OnlineEventAttendanceMode" : undefined,
    location: d.online ? { "@type": "VirtualLocation", url: d.url } : d.venue ? { "@type": "Place", name: d.venue, address: d.address } : undefined, organizer: d.organizer ? { "@type": "Organization", name: d.organizer } : undefined }),
  person: (d) => ({ "@type": "Person", name: d.name, url: d.url, jobTitle: d.jobTitle, worksFor: d.worksFor ? { "@type": "Organization", name: d.worksFor } : undefined, sameAs: list(d.sameAs) }),
};

/** -> { jsonld, html, lint, notes } */
export function generateSchema(type, data = {}) {
  const k = String(type || "").toLowerCase().replace(/[^a-z]/g, "");
  const f = TYPES[k];
  if (!f) throw new Error(`Unknown type "${type}". One of: ${Object.keys(TYPES).join(", ")}`);
  const notes = [];
  for (const banned of ["rating", "ratingValue", "reviewCount", "review", "aggregateRating"]) if (data[banned] != null) notes.push(`Ignored "${banned}": ratings and reviews must come from real reviews visible on the page; add them by hand from that source.`);
  const node = clean(f(data)) || { "@type": k };
  const jsonld = { "@context": "https://schema.org", ...node };
  const html = `<script type="application/ld+json">${JSON.stringify(jsonld, null, 2).replace(/</g, "\\u003c")}</script>`;
  const lint = lintSchema(html);
  if (REMOVED[node["@type"]]) notes.push(REMOVED[node["@type"]]);
  return { type: node["@type"], jsonld, html, lint, notes };
}
