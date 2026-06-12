import { describe, it, expect } from "vitest";
import { epley, computeE1RM } from "../e1rm";
import type { HistorySet } from "@/lib/types";

const set = (date: string, weight: number, reps: number, rir: number): HistorySet => ({
  date,
  weight,
  reps,
  reps_in_reserve: rir,
});

describe("epley", () => {
  it("matches the PRD bench example (~205 from 5@165 with 2 in reserve)", () => {
    // 7-rep-capacity effort: 165 * (1 + 7/30) ≈ 203.5
    expect(epley(165, 7)).toBeCloseTo(203.5, 1);
  });
});

describe("computeE1RM", () => {
  it("returns null with no history", () => {
    expect(computeE1RM([])).toBeNull();
  });

  it("seeds from the first set", () => {
    expect(computeE1RM([set("2026-06-01", 165, 5, 2)])).toBeCloseTo(203.5, 1);
  });

  it("uses the best (max-e1RM) set within a session", () => {
    const e = computeE1RM([
      set("2026-06-01", 135, 5, 0), // weaker
      set("2026-06-01", 165, 5, 2), // best → ~203.5
    ]);
    expect(e).toBeCloseTo(203.5, 1);
  });

  it("weights recent sessions more heavily", () => {
    // Old weak session, recent strong session — estimate should sit closer to the recent one.
    const e = computeE1RM([
      set("2026-05-01", 180, 5, 1), // older, epley=180*1.2=216
      set("2026-06-01", 200, 5, 1), // recent, epley=240
    ])!;
    const midpoint = (216 + 240) / 2;
    expect(e).toBeGreaterThan(midpoint); // pulled toward the recent, stronger session
    expect(e).toBeLessThan(240);
  });

  it("clamps an outlier session toward the median", () => {
    const steady = [
      set("2026-06-01", 200, 5, 1),
      set("2026-06-03", 202, 5, 1),
      set("2026-06-05", 201, 5, 1),
    ];
    const withFluke = [...steady, set("2026-06-07", 320, 5, 1)]; // absurd spike
    const eSteady = computeE1RM(steady)!;
    const eFluke = computeE1RM(withFluke)!;
    // The fluke moves the estimate up, but clamping keeps it well below the raw spike.
    expect(eFluke).toBeGreaterThan(eSteady);
    expect(eFluke).toBeLessThan(280);
  });

  it("only considers the trailing window of sessions", () => {
    const sets: HistorySet[] = [];
    // 6 sessions; the 2 oldest are very heavy and should be ignored with window=4
    sets.push(set("2026-05-01", 400, 5, 0));
    sets.push(set("2026-05-02", 400, 5, 0));
    for (let d = 10; d < 14; d++) sets.push(set(`2026-06-${d}`, 200, 5, 1));
    const e = computeE1RM(sets, { window: 4 })!;
    expect(e).toBeLessThan(260); // heavy oldest sessions excluded
  });
});
