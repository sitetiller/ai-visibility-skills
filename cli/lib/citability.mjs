// Section-by-section signals for how easy a page is to quote in an answer. Deterministic: counts what is on the page.
// It does not predict citations. The agent (skill) adds judgement about whether answers are correct and specific.
// Signals follow published guidance: Microsoft's AI Performance post asks for clear headings, tables, FAQ sections,
// claims supported with examples, data and sources; Google's helpful-content guidance asks for original information.

// A sentence ends at . ! or ? followed by whitespace and a capital letter, digit or quote, or at the end of text.
// Dots inside tokens (llms.txt, e.g., 3.5, example.com) do not end a sentence.
const sentences = (t) => String(t).split(/(?<=[.!?])\s+(?=["'(\[]?[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);

/** html -> [{heading, level, words, firstSentence, firstSentenceWords, numbers, hasList, hasTable, links, question}] */
export function sections(html) {
  const body = String((html.match(/<body[\s\S]*$/i) || [html])[0])
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form)\b[\s\S]*?<\/\1>/gi, " ");
  const parts = body.split(/(?=<h[1-4]\b)/i);
  const out = [];
  for (const p of parts) {
    const hm = p.match(/^<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/i);
    const heading = hm ? hm[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "(intro)";
    const rest = hm ? p.slice(hm[0].length) : p;
    const text = rest.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const s = sentences(text);
    out.push({
      heading, level: hm ? Number(hm[1]) : 0,
      words: text.split(" ").length,
      firstSentence: s[0]?.slice(0, 220) || "",
      firstSentenceWords: (s[0] || "").split(/\s+/).filter(Boolean).length,
      numbers: (text.match(/\b\d[\d,.]*\s?(%|percent|\$|€|£|ms|s|days?|hours?|months?|years?|x)?/gi) || []).length,
      hasList: /<(ul|ol)\b/i.test(rest), hasTable: /<table\b/i.test(rest),
      links: (rest.match(/<a\b[^>]*href\s*=\s*["']https?:/gi) || []).length,
      question: /\?\s*$/.test(heading),
    });
  }
  return out;
}

/** Page-level summary with the share of sections that answer up front and carry specifics. */
export function citability(html) {
  const secs = sections(html).filter((s) => s.words >= 25);
  const n = secs.length || 1;
  const share = (f) => secs.filter(f).length / n;
  return {
    sections: secs,
    summary: {
      sectionCount: secs.length,
      questionHeadings: secs.filter((s) => s.question).length,
      answerFirstShare: share((s) => s.firstSentenceWords > 0 && s.firstSentenceWords <= 30),
      specificShare: share((s) => s.numbers > 0),
      structuredShare: share((s) => s.hasList || s.hasTable),
      sourcedShare: share((s) => s.links > 0),
      longSections: secs.filter((s) => s.words > 400).map((s) => s.heading),
    },
  };
}
