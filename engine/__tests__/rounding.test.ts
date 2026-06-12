import { describe, it, expect } from "vitest";
import { roundToEquipment } from "../rounding";
import type { Exercise, UserSettings } from "@/lib/types";

const settings: UserSettings = {
  bodyweight: 185,
  available_dumbbells: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  available_kettlebells: [18, 26, 35, 44, 53, 62, 70],
  barbell_weight: 45,
  plate_inventory: [45, 35, 25, 10, 5, 2.5],
};

const ex = (over: Partial<Exercise>): Exercise => ({
  id: "x",
  display_name: "X",
  load_type: "barbell",
  unilateral: false,
  aliases: [],
  default_reps: 5,
  ...over,
});

describe("barbell rounding", () => {
  const bb = ex({ load_type: "barbell" });
  it("rounds to nearest 5 lb total (2.5 microplates → 5 lb steps)", () => {
    expect(roundToEquipment(133, bb, settings)).toMatchObject({ weight: 135, display: "135 lb" });
    expect(roundToEquipment(137, bb, settings)).toMatchObject({ weight: 135 });
    expect(roundToEquipment(138, bb, settings)).toMatchObject({ weight: 140 });
  });
  it("ties round down (safer)", () => {
    // 137.5 is exactly between 135 and 140 → 135
    expect(roundToEquipment(137.5, bb, settings).weight).toBe(135);
  });
  it("never goes below the empty bar", () => {
    expect(roundToEquipment(20, bb, settings).weight).toBe(45);
  });
  it("uses 10 lb steps when no microplates configured", () => {
    const noMicro: UserSettings = { ...settings, plate_inventory: [45, 35, 25, 10, 5] };
    // increment = 2 * 5 = 10 → from 45: 45,55,65,... ; 63 → nearest is 65
    expect(roundToEquipment(63, bb, noMicro).weight).toBe(65);
  });
});

describe("dumbbell rounding", () => {
  it("rounds to nearest available DB and labels each-hand for bilateral", () => {
    const db = ex({ load_type: "dumbbell", unilateral: false });
    expect(roundToEquipment(38, db, settings)).toMatchObject({
      weight: 40,
      display: "40 lb dumbbells (each hand)",
    });
  });
  it("labels a single dumbbell for unilateral movements", () => {
    const db = ex({ load_type: "dumbbell", unilateral: true });
    expect(roundToEquipment(33, db, settings)).toMatchObject({
      weight: 35,
      display: "one 35 lb dumbbell",
    });
  });
  it("ties round down to the lighter dumbbell", () => {
    const db = ex({ load_type: "dumbbell" });
    // 37.5 between 35 and 40 → 35
    expect(roundToEquipment(37.5, db, settings).weight).toBe(35);
  });
});

describe("kettlebell rounding", () => {
  it("rounds to nearest available KB and labels it", () => {
    const kb = ex({ load_type: "kettlebell" });
    expect(roundToEquipment(50, kb, settings)).toMatchObject({
      weight: 53,
      display: "one 53 lb kettlebell",
    });
  });
});

describe("bodyweight rounding", () => {
  const bw = ex({ load_type: "bodyweight" });
  it("recommends added load when target exceeds bodyweight", () => {
    // bodyweight 185, target total 212 → +27 → rounds to +25
    expect(roundToEquipment(212, bw, settings)).toMatchObject({ weight: 25, display: "+25 lb" });
  });
  it("recommends assistance when target is below bodyweight", () => {
    const r = roundToEquipment(160, bw, settings); // 160-185 = -25
    expect(r.weight).toBe(-25);
    expect(r.display).toContain("assistance");
  });
  it("says bodyweight when target ≈ bodyweight", () => {
    expect(roundToEquipment(186, bw, settings)).toMatchObject({ weight: 0, display: "bodyweight" });
  });
});
