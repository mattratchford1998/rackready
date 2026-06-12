import { describe, it, expect } from "vitest";
import { recommendWeight, type RecommendInput } from "../recommend";
import type { Exercise, HistorySet, UserSettings } from "@/lib/types";

const settings: UserSettings = {
  bodyweight: 185,
  available_dumbbells: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  available_kettlebells: [18, 26, 35, 44, 53, 62, 70],
  barbell_weight: 45,
  plate_inventory: [45, 35, 25, 10, 5, 2.5],
};

const ex = (over: Partial<Exercise>): Exercise => ({
  id: "bench_press",
  display_name: "Bench Press",
  load_type: "barbell",
  unilateral: false,
  aliases: [],
  default_reps: 5,
  ...over,
});

const set = (date: string, weight: number, reps: number, rir: number): HistorySet => ({
  date,
  weight,
  reps,
  reps_in_reserve: rir,
});

const base = (over: Partial<RecommendInput>): RecommendInput => ({
  exercise: ex({}),
  prescribedReps: 5,
  prescribedRpe: 8,
  history: [set("2026-06-01", 135, 5, 1)],
  settings,
  ...over,
});

describe("recommendWeight", () => {
  it("returns no_history on first encounter", () => {
    expect(recommendWeight(base({ history: [] }))).toEqual({ kind: "no_history" });
  });

  it("produces a rounded barbell recommendation with rationale and e1rm", () => {
    const r = recommendWeight(base({}));
    expect(r.kind).toBe("recommendation");
    if (r.kind !== "recommendation") return;
    expect(r.weight % 5).toBe(0); // loadable to nearest 5
    expect(r.e1rm).toBeGreaterThan(135);
    expect(r.rationale).toContain("Last bench press");
    expect(r.rationale).toContain(r.display);
  });

  it("autoregulates: an easier last set (more in reserve) recommends more", () => {
    const hard = recommendWeight(base({ history: [set("2026-06-01", 100, 5, 0)] }));
    const easy = recommendWeight(base({ history: [set("2026-06-01", 100, 5, 4)] }));
    if (hard.kind !== "recommendation" || easy.kind !== "recommendation") throw new Error("expected recs");
    expect(easy.weight).toBeGreaterThan(hard.weight);
  });

  it("caps an overshoot after one very easy day", () => {
    // last 100, 8 in reserve → e1rm ~143; raw would exceed bench +5 cap (105)
    const r = recommendWeight(base({ history: [set("2026-06-01", 100, 5, 8)] }));
    if (r.kind !== "recommendation") throw new Error("expected rec");
    expect(r.weight).toBeLessThanOrEqual(105);
  });

  it("handles a 1RM test day (reps 1, no RPE)", () => {
    const r = recommendWeight(
      base({ exercise: ex({ id: "back_squat", display_name: "Back Squat" }), prescribedReps: 1, prescribedRpe: null, history: [set("2026-06-01", 225, 5, 1)] })
    );
    expect(r.kind).toBe("max_test");
    if (r.kind !== "max_test") return;
    expect(r.display).toContain("1RM");
    expect(r.e1rm).toBeGreaterThan(225);
  });

  it("recommends added load for a bodyweight movement", () => {
    const pullup = ex({ id: "pull_up", display_name: "Pull-Up", load_type: "bodyweight" });
    const r = recommendWeight(
      base({ exercise: pullup, prescribedReps: 5, prescribedRpe: 8, history: [set("2026-06-01", 25, 5, 2)] })
    );
    if (r.kind !== "recommendation") throw new Error("expected rec");
    expect(r.display).toMatch(/\+\d+ lb/);
  });

  it("labels dumbbells per-hand for bilateral movements", () => {
    const dbBench = ex({ id: "db_bench_press", display_name: "DB Bench Press", load_type: "dumbbell", unilateral: false });
    const r = recommendWeight(
      base({ exercise: dbBench, history: [set("2026-06-01", 40, 8, 2)] })
    );
    if (r.kind !== "recommendation") throw new Error("expected rec");
    expect(r.display).toContain("each hand");
  });
});
