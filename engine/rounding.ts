import type { Exercise, UserSettings } from "@/lib/types";

// PRD §4.4 — round a raw recommendation to real, loadable equipment.
// All weights in lb. Round to nearest; on an exact tie, round DOWN (safer).

export interface RoundResult {
  weight: number;  // canonical stored value: barbell total · DB per-hand · KB bell · BW added-load
  display: string; // human label, always stating unilateral/bilateral or added/assist
}

// Round to nearest integer with halves going down: 2.5 → 2, 2.6 → 3.
function roundHalfDown(x: number): number {
  return Math.ceil(x - 0.5 - 1e-9);
}

// Format: drop trailing ".0" but keep real fractions (42.5 → "42.5").
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

// Nearest member of a sorted-or-unsorted list; ties resolve to the lighter option.
function nearestInList(value: number, list: number[]): number {
  let best = list[0];
  let bestDiff = Math.abs(list[0] - value);
  for (const cand of list) {
    const diff = Math.abs(cand - value);
    if (diff < bestDiff - 1e-9 || (Math.abs(diff - bestDiff) < 1e-9 && cand < best)) {
      best = cand;
      bestDiff = diff;
    }
  }
  return best;
}

function roundBarbell(rawTotal: number, s: UserSettings): RoundResult {
  const bar = s.barbell_weight;
  const minPlate = Math.min(...s.plate_inventory);
  const increment = 2 * minPlate; // smallest change to the total (one plate per side)
  if (rawTotal <= bar) return { weight: bar, display: `${fmt(bar)} lb` };
  const steps = roundHalfDown((rawTotal - bar) / increment);
  const total = bar + steps * increment;
  return { weight: total, display: `${fmt(total)} lb` };
}

function roundDumbbell(rawPerHand: number, s: UserSettings, ex: Exercise): RoundResult {
  const w = nearestInList(rawPerHand, s.available_dumbbells);
  const display = ex.unilateral
    ? `one ${fmt(w)} lb dumbbell`
    : `${fmt(w)} lb dumbbells (each hand)`;
  return { weight: w, display };
}

function roundKettlebell(rawBell: number, s: UserSettings): RoundResult {
  const w = nearestInList(rawBell, s.available_kettlebells);
  return { weight: w, display: `one ${fmt(w)} lb kettlebell` };
}

function roundBodyweight(rawTotal: number, s: UserSettings): RoundResult {
  const added = roundHalfDown((rawTotal - s.bodyweight) / 5) * 5;
  if (added > 0) return { weight: added, display: `+${fmt(added)} lb` };
  if (added === 0) return { weight: 0, display: `bodyweight` };
  return { weight: added, display: `assistance (~${fmt(-added)} lb band)` };
}

/**
 * Round `raw` to loadable equipment for this movement.
 * For bodyweight, `raw` is the target TOTAL system load (bodyweight + added);
 * for all others it is the implement load in the canonical unit.
 */
export function roundToEquipment(raw: number, ex: Exercise, s: UserSettings): RoundResult {
  switch (ex.load_type) {
    case "barbell":
      return roundBarbell(raw, s);
    case "dumbbell":
      return roundDumbbell(raw, s, ex);
    case "kettlebell":
      return roundKettlebell(raw, s);
    case "bodyweight":
      return roundBodyweight(raw, s);
  }
}
