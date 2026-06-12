import { describe, it, expect } from "vitest";
import { applyProgressionCaps, defaultCapsFor } from "../caps";

describe("defaultCapsFor", () => {
  it("gives lower-body movements bigger increase caps", () => {
    expect(defaultCapsFor("back_squat").maxIncrease).toBe(10);
    expect(defaultCapsFor("deadlift").maxIncrease).toBe(10);
  });
  it("gives upper-body movements smaller increase caps", () => {
    expect(defaultCapsFor("bench_press").maxIncrease).toBe(5);
    expect(defaultCapsFor("overhead_press").maxIncrease).toBe(5);
  });
});

describe("applyProgressionCaps", () => {
  const upper = defaultCapsFor("bench_press");

  it("passes raw through when there is no prior weight", () => {
    expect(applyProgressionCaps(225, null, upper)).toBe(225);
  });

  it("caps a too-large jump up", () => {
    // last 150, upper cap +5 → max 155
    expect(applyProgressionCaps(170, 150, upper)).toBe(155);
  });

  it("caps a too-large drop", () => {
    // last 150, upper decrease 10 → min 140
    expect(applyProgressionCaps(120, 150, upper)).toBe(140);
  });

  it("leaves an in-range recommendation untouched", () => {
    expect(applyProgressionCaps(152, 150, upper)).toBe(152);
  });

  it("allows larger lower-body jumps", () => {
    const lower = defaultCapsFor("back_squat");
    expect(applyProgressionCaps(225, 220, lower)).toBe(225); // +5 within +10 cap
    expect(applyProgressionCaps(240, 220, lower)).toBe(230); // capped at +10
  });
});
