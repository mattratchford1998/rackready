import type { HistorySet } from "@/lib/types";

// PRD §4.1, §4.2, §4.7.3 — continually-updated e1RM per movement.

export interface E1RMOptions {
  window?: number;     // trailing sessions to consider (default 4)
  outlierTol?: number; // clamp each session estimate to ±tol of the window median (default 0.15)
}

const DEFAULTS: Required<E1RMOptions> = { window: 4, outlierTol: 0.15 };

// Epley with RIR adjustment: a set of `reps` @ some RPE is really a
// (reps + repsInReserve)-capacity effort. PRD §4.2.
export function epley(weight: number, repsToFailure: number): number {
  return weight * (1 + repsToFailure / 30);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

// One representative estimate per session = the best (max-e1RM) set that day.
function sessionEstimates(history: HistorySet[]): { date: string; value: number }[] {
  const byDate = new Map<string, number>();
  for (const s of history) {
    const e = epley(s.weight, s.reps + s.reps_in_reserve);
    const prev = byDate.get(s.date);
    if (prev === undefined || e > prev) byDate.set(s.date, e);
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // most recent first
}

/**
 * Current estimated 1-rep max for a movement, or null if no history.
 * Recency-weighted average over the last `window` sessions, with each
 * session's estimate clamped to ±outlierTol of the window median so a single
 * fluke can't whipsaw the recommendation.
 */
export function computeE1RM(history: HistorySet[], options: E1RMOptions = {}): number | null {
  const { window, outlierTol } = { ...DEFAULTS, ...options };
  if (history.length === 0) return null;

  const sessions = sessionEstimates(history).slice(0, window);
  const raw = sessions.map((s) => s.value);
  const med = median(raw);
  const clamped = raw.map((v) => clamp(v, med * (1 - outlierTol), med * (1 + outlierTol)));

  // Recency weights: most recent gets weight n, next n-1, … oldest gets 1.
  const n = clamped.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const w = n - i;
    num += clamped[i] * w;
    den += w;
  }
  return num / den;
}
