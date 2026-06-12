import type { Exercise, HistorySet, UserSettings } from "@/lib/types";
import { computeE1RM, type E1RMOptions } from "./e1rm";
import { rpePercent } from "./rpe-chart";
import { applyProgressionCaps, defaultCapsFor, type ProgressionCaps } from "./caps";
import { roundToEquipment } from "./rounding";

// PRD §4.2 — the orchestrator. Pure: no DB, network, or framework deps.

export interface RecommendInput {
  exercise: Exercise;
  prescribedReps: number;
  prescribedRpe: number | null; // null = 1RM test day (PRD §9)
  history: HistorySet[];        // pre-filtered to this canonical movement
  settings: UserSettings;
  e1rmOptions?: E1RMOptions;
  caps?: ProgressionCaps;
}

export type RecommendResult =
  | { kind: "no_history" } // first encounter — user logs after the set (PRD §4.5)
  | {
      kind: "recommendation";
      weight: number;
      display: string;
      rationale: string;
      e1rm: number;
      last_set: HistorySet;
    }
  | {
      // 1RM test day: show current estimate as a reference target (PRD §9)
      kind: "max_test";
      display: string;
      rationale: string;
      e1rm: number;
      last_set: HistorySet;
    };

const isBodyweight = (ex: Exercise) => ex.load_type === "bodyweight";

// For bodyweight, the load that matters is bodyweight + added; history stores added.
function toLoadSpace(history: HistorySet[], ex: Exercise, s: UserSettings): HistorySet[] {
  if (!isBodyweight(ex)) return history;
  return history.map((h) => ({ ...h, weight: h.weight + s.bodyweight }));
}

// Representative "last time" set = top set (heaviest) of the most recent session.
function lastSet(history: HistorySet[]): HistorySet {
  const latestDate = history.reduce((d, h) => (h.date > d ? h.date : d), history[0].date);
  const sameDay = history.filter((h) => h.date === latestDate);
  return sameDay.reduce((best, h) => (h.weight > best.weight ? h : best), sameDay[0]);
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function describeLast(ex: Exercise, ls: HistorySet): string {
  const rir = ls.reps_in_reserve;
  const effort = rir === 0 ? "to failure" : `~${rir} in reserve`;
  if (isBodyweight(ex)) {
    const load = ls.weight > 0 ? `+${fmt(ls.weight)} lb` : ls.weight < 0 ? `${fmt(-ls.weight)} lb assist` : "bodyweight";
    return `${load} × ${ls.reps}, ${effort}`;
  }
  const unit =
    ex.load_type === "dumbbell"
      ? `${fmt(ls.weight)} lb ${ex.unilateral ? "DB" : "DBs"}`
      : ex.load_type === "kettlebell"
      ? `${fmt(ls.weight)} lb KB`
      : `${fmt(ls.weight)} lb`;
  return `${unit} × ${ls.reps}, ${effort}`;
}

export function recommendWeight(input: RecommendInput): RecommendResult {
  const { exercise, prescribedReps, prescribedRpe, history, settings } = input;

  if (history.length === 0) return { kind: "no_history" };

  const loadHistory = toLoadSpace(history, exercise, settings);
  const e1rm = computeE1RM(loadHistory, input.e1rmOptions)!; // non-null: history is non-empty
  const ls = lastSet(history);

  // 1RM test day — no normal recommendation; surface the estimate as a target.
  if (prescribedRpe === null && prescribedReps === 1) {
    return {
      kind: "max_test",
      e1rm,
      display: `~${fmt(Math.round(e1rm))} lb (est. 1RM)`,
      rationale: `Max test day. Your estimated 1RM is ~${fmt(Math.round(e1rm))} lb — work up and log the actual.`,
      last_set: ls,
    };
  }

  const pct = rpePercent(prescribedReps, prescribedRpe ?? 8);
  const raw = e1rm * pct;

  const caps = input.caps ?? defaultCapsFor(exercise.id);
  const lastLoad = isBodyweight(exercise) ? ls.weight + settings.bodyweight : ls.weight;
  const capped = applyProgressionCaps(raw, lastLoad, caps);

  const rounded = roundToEquipment(capped, exercise, settings);

  // Direction vs last time, for the rationale line. rounded.weight and ls.weight
  // are in the same currency (implement load, or added-load for bodyweight).
  const dir =
    rounded.weight > ls.weight ? "bump up" : rounded.weight < ls.weight ? "ease off" : "hold";

  const rationale =
    `Last ${exercise.display_name.toLowerCase()}: ${describeLast(exercise, ls)}. ` +
    `Today ${prescribedReps} @ RPE ${fmt(prescribedRpe ?? 8)} → ${dir} to ${rounded.display}.`;

  return {
    kind: "recommendation",
    weight: rounded.weight,
    display: rounded.display,
    rationale,
    e1rm,
    last_set: ls,
  };
}
