// RPE → %1RM lookup (PRD §4.3). RTS-style reference values.
// Rows = reps, columns = RPE. Values are fraction of 1RM (e.g. 0.863 = 86.3%).
// Tunable config: edit these numbers to retune the engine.

export const RPE_CHART: Record<number, Record<number, number>> = {
  1: { 10: 1.0, 9: 0.955, 8: 0.922, 7: 0.892, 6: 0.863 },
  2: { 10: 0.955, 9: 0.922, 8: 0.892, 7: 0.863, 6: 0.837 },
  3: { 10: 0.922, 9: 0.892, 8: 0.863, 7: 0.837, 6: 0.811 },
  4: { 10: 0.892, 9: 0.863, 8: 0.837, 7: 0.811, 6: 0.786 },
  5: { 10: 0.863, 9: 0.837, 8: 0.811, 7: 0.786, 6: 0.762 },
  6: { 10: 0.837, 9: 0.811, 8: 0.786, 7: 0.762, 6: 0.739 },
  7: { 10: 0.811, 9: 0.786, 8: 0.762, 7: 0.739, 6: 0.707 },
  8: { 10: 0.786, 9: 0.762, 8: 0.739, 7: 0.707, 6: 0.68 },
  9: { 10: 0.762, 9: 0.739, 8: 0.707, 7: 0.68, 6: 0.653 },
  10: { 10: 0.739, 9: 0.707, 8: 0.68, 7: 0.653, 6: 0.626 },
  12: { 10: 0.707, 9: 0.68, 8: 0.653, 7: 0.626, 6: 0.6 },
};

const REP_ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
const RPE_COLS = [6, 7, 8, 9, 10];

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

// Find the two bracketing values in a sorted list for interpolation.
function bracket(value: number, sorted: number[]): [number, number] {
  const v = clamp(value, sorted[0], sorted[sorted.length - 1]);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (v >= sorted[i] && v <= sorted[i + 1]) return [sorted[i], sorted[i + 1]];
  }
  return [sorted[sorted.length - 1], sorted[sorted.length - 1]];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Target intensity (fraction of 1RM) for a given reps @ RPE.
 * Bilinearly interpolates across both reps and RPE, clamping to the table bounds.
 * Higher reps or lower RPE than the table → clamped to the nearest edge.
 */
export function rpePercent(reps: number, rpe: number): number {
  const [rpeLo, rpeHi] = bracket(rpe, RPE_COLS);
  const rpeT = rpeHi === rpeLo ? 0 : (clamp(rpe, RPE_COLS[0], RPE_COLS[4]) - rpeLo) / (rpeHi - rpeLo);

  const [repLo, repHi] = bracket(reps, REP_ROWS);
  const repT = repHi === repLo ? 0 : (clamp(reps, REP_ROWS[0], 12) - repLo) / (repHi - repLo);

  // Interpolate RPE within each bracketing rep row, then interpolate between rows.
  const atRepLo = lerp(RPE_CHART[repLo][rpeLo], RPE_CHART[repLo][rpeHi], rpeT);
  const atRepHi = lerp(RPE_CHART[repHi][rpeLo], RPE_CHART[repHi][rpeHi], rpeT);
  return lerp(atRepLo, atRepHi, repT);
}
