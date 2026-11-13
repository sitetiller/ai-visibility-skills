// Content quality signals for one page: readability, trust and experience signals (who wrote it, when, based on what),
// sourcing, and filler phrasing. Deterministic counts. They support a human or agent judgement; Google does not use a
// "quality score" like this, and none of these signals is a ranking factor by itself.
import { readable } from "./page.mjs";

const sentences = (t) => String(t).split(/(?<=[.!?])\s+(?=["'(\[]?[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
const wordsOf = (s) => String(s).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));

/** English syllable estimate (vowel groups, silent e, minimum 1). Good enough for Flesch on body text. */
export function syllables(word) {
  let w = String(word).toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (w.match(/[aeiouy]{1,2}/g) || []).length);
}

/** Flesch Reading Ease (English): 206.835 - 1.015 x words/sentence - 84.6 x syllables/word. */
export function readability(text) {
  const lines = String(text).split("\n").filter((l) => !/^#/.test(l));
  const ss = lines.flatMap((l) => sentences(l)).filter((s) => wordsOf(s).length >= 3);
  const ws = ss.flatMap(wordsOf);
  if (!ss.length || !ws.length) return { sentences: 0, words: 0, fleschReadingEase: null, avgSentenceWords: null, longSentenceShare: null };
  const syl = ws.reduce((n, w) => n + syllables(w), 0);
  const fre = 206.835 - 1.015 * (ws.length / ss.length) - 84.6 * (syl / ws.length);
  return {
    sentences: ss.length, words: ws.length,
    fleschReadingEase: Math.round(fre * 10) / 10,
    avgSentenceWords: Math.round((ws.length / ss.length) * 10) / 10,
    longSentenceShare: Math.round((ss.filter((s) => wordsOf(s).length > 30).length / ss.length) * 100) / 100,
    longParagraphs: lines.filter((l) => wordsOf(l).length > 150).length,
  };
}

export const FILLER = [
  ["delve", /\bdelv(e|es|ing)\b/gi], ["fast-paced world", /\bin today'?s (fast[- ]paced|digital|ever[- ]changing)\b/gi],
  ["it's important to note", /\bit'?s (important|worth|crucial) to (note|mention|remember)\b/gi], ["in conclusion", /\bin conclusion\b/gi],
  ["unlock / unleash", /\b(unlock|unleash)(s|ing)? the (full )?(power|potential)\b/gi], ["game-changer", /\bgame[- ]chang(er|ing)\b/gi],
  ["navigate the landscape", /\bnavigat(e|ing) the (complex |ever[- ]changing )?(landscape|world|realm)\b/gi], ["tapestry", /\btapestry\b/gi],
  ["seamless(ly)", /\bseamless(ly)?\b/gi], ["elevate", /\belevat(e|es|ing) your\b/gi], ["embark", /\bembark(s|ing)? on\b/gi],
  ["not X, it's Y", /\b(it'?s|this is|that'?s) not (just |only |merely )?(about )?[^.!?]{1,60}[,;—–-]+\s*it'?s\b/gi],
  ["look no further", /\blook no further\b/gi], ["comprehensive guide", /\b(ultimate|comprehensive|definitive) guide\b/gi],
];
const VAGUE = /\b(studies (show|suggest)|research (shows|suggests)|experts (say|agree)|according to (experts|research)|it is (widely )?(known|believed))\b/gi;
const FIRST_HAND = /\b(we|i) (tested|tried|measured|ran|built|surveyed|interviewed|analy[sz]ed|compared|found)\b|\bour (data|test|tests|results|analysis|experience|benchmark)\b|\bin (my|our) experience\b/gi;

/** Signals and a checklist for one HTML page. */
export function contentQuality(html, { url = "" } = {}) {
  const h = String(html);
  const text = readable(h);
  const body = (h.match(/<body[\s\S]*$/i) || [h])[0];
  const main = (body.match(/<(main|article)\b[\s\S]*?<\/\1>/i) || [body])[0];
  let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* none */ }
  const external = [...main.matchAll(/<a\b[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1]).filter((u) => { try { return new URL(u).hostname.replace(/^www\./, "") !== host; } catch { return false; } });
  const ld = [...h.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
  const signals = {
    author: /<meta[^>]+name\s*=\s*["']author["']/i.test(h) || /"author"\s*:/.test(ld) || /rel\s*=\s*["']author["']/i.test(h) || /\b(written|reviewed) by\b|\bby [A-Z][a-z]+ [A-Z][a-z]+/.test(text),
    datePublished: /"datePublished"\s*:/.test(ld) || /<time\b[^>]*datetime/i.test(main) || /article:published_time/i.test(h),
    dateModified: /"dateModified"\s*:/.test(ld) || /article:modified_time/i.test(h) || /\b(updated|last reviewed)\b[^.]{0,30}\b(20\d\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text),
    externalSources: new Set(external.map((u) => { try { return new URL(u).hostname; } catch { return u; } })).size,
    firstHand: (text.match(FIRST_HAND) || []).length,
    figures: (main.match(/<(figure|table|img|video|pre)\b/gi) || []).length,
    aboutOrContact: /href\s*=\s*["'][^"']*\/(about|contact|team|company)(\/|["'?#])/i.test(h),
  };
  const filler = FILLER.map(([label, re]) => ({ label, count: (text.match(re) || []).length })).filter((x) => x.count);
  const vague = [...new Set((text.match(VAGUE) || []).map((s) => s.toLowerCase()))];
  const r = readability(text);
  const checks = [
    ["Author is named", signals.author],
    ["Publish date is shown", signals.datePublished],
    ["Update date is shown", signals.dateModified],
    ["Cites at least 2 outside sources", signals.externalSources >= 2],
    ["Shows first-hand work (tested, measured, our data)", signals.firstHand > 0],
    ["Has figures, tables, code or media", signals.figures > 0],
    ["Links to about or contact", signals.aboutOrContact],
    ["No filler phrases", filler.length === 0],
    ["No unsourced 'studies show' claims", vague.length === 0],
    ["Readable (Flesch >= 40, few 30+ word sentences)", r.fleschReadingEase != null && r.fleschReadingEase >= 40 && (r.longSentenceShare ?? 1) <= 0.2],
  ].map(([check, pass]) => ({ check, pass: !!pass }));
  return { url, readability: r, signals, filler, vagueClaims: vague, checklist: checks, passed: checks.filter((c) => c.pass).length, of: checks.length,
    note: "Signals support a judgement about helpfulness and trust; they are not Google ranking factors. Read the page before acting." };
}
