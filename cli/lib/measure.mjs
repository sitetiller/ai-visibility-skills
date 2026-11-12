// Measuring the effect of a change: standard difference-in-differences against control pages,
// with a percentile bootstrap interval on daily data. Original code.

/** Two-period estimate: expected = changedBefore * (controlAfter / controlBefore). */
export function didTotals({ changedBefore, changedAfter, controlBefore, controlAfter }) {
  if (!(changedBefore > 0)) throw new Error("changedBefore must be > 0");
  const raw = changedAfter / changedBefore - 1;
  if (!(controlBefore > 0)) return { raw, trend: null, expected: null, effect: null, lift: null };
  const trend = controlAfter / controlBefore - 1;
  const expected = changedBefore * (1 + trend);
  return { raw, trend, expected, effect: changedAfter - expected, lift: changedAfter / expected - 1 };
}

// Small deterministic PRNG so results are reproducible in tests and reports.
function rng(seed = 42) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

/**
 * Daily series version. Inputs: arrays of daily clicks for changed and control groups, before and after.
 * Lift = (sum changedAfter / sum changedBefore) / (sum controlAfter / sum controlBefore) - 1.
 * 95% interval by resampling days with replacement within each of the four series (B iterations).
 */
export function didDaily({ changedBefore, changedAfter, controlBefore, controlAfter }, { iterations = 2000, seed = 42 } = {}) {
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const lift = (cb, ca, kb, ka) => (sum(ca) / sum(cb)) / (sum(ka) / sum(kb)) - 1;
  for (const [n, a] of Object.entries({ changedBefore, changedAfter, controlBefore, controlAfter })) if (!Array.isArray(a) || a.length < 7) throw new Error(`${n} needs at least 7 daily values`);
  const point = lift(changedBefore, changedAfter, controlBefore, controlAfter);
  const r = rng(seed);
  const resample = (a) => a.map(() => a[Math.floor(r() * a.length)]);
  const sims = [];
  for (let i = 0; i < iterations; i++) {
    const v = lift(resample(changedBefore), resample(changedAfter), resample(controlBefore), resample(controlAfter));
    if (Number.isFinite(v)) sims.push(v);
  }
  sims.sort((a, b) => a - b);
  const q = (p) => sims[Math.min(sims.length - 1, Math.max(0, Math.floor(p * sims.length)))];
  const lo = q(0.025), hi = q(0.975);
  return { lift: point, low: lo, high: hi, iterations: sims.length, verdict: lo > 0 ? "win" : hi < 0 ? "loss" : "unclear" };
}
