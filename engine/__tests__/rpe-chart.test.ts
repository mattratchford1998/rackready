import { describe, it, expect } from "vitest";
import { rpePercent } from "../rpe-chart";

describe("rpePercent", () => {
  it("returns exact table values on grid points", () => {
    expect(rpePercent(1, 10)).toBeCloseTo(1.0, 5);
    expect(rpePercent(5, 8)).toBeCloseTo(0.811, 5);
    expect(rpePercent(10, 6)).toBeCloseTo(0.626, 5);
    expect(rpePercent(12, 9)).toBeCloseTo(0.68, 5);
  });

  it("interpolates half-RPE steps", () => {
    // 5 reps: RPE 8 = 0.811, RPE 9 = 0.837 → RPE 8.5 ≈ 0.824
    expect(rpePercent(5, 8.5)).toBeCloseTo(0.824, 3);
  });

  it("interpolates in-between reps (11 between 10 and 12)", () => {
    // RPE 8: reps 10 = 0.68, reps 12 = 0.653 → reps 11 ≈ 0.6665
    expect(rpePercent(11, 8)).toBeCloseTo(0.6665, 3);
  });

  it("clamps reps above the table to the 12-rep row", () => {
    expect(rpePercent(15, 7)).toBeCloseTo(rpePercent(12, 7), 5);
  });

  it("clamps RPE above 10 and below 6 to table edges", () => {
    expect(rpePercent(3, 11)).toBeCloseTo(rpePercent(3, 10), 5);
    expect(rpePercent(3, 4)).toBeCloseTo(rpePercent(3, 6), 5);
  });

  it("intensity decreases as reps rise (fixed RPE)", () => {
    expect(rpePercent(3, 8)).toBeGreaterThan(rpePercent(8, 8));
  });

  it("intensity rises as RPE rises (fixed reps)", () => {
    expect(rpePercent(5, 9)).toBeGreaterThan(rpePercent(5, 7));
  });
});
