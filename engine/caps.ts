// PRD §4.7.2 — sane increment caps so the math can't overshoot after one easy day.

export interface ProgressionCaps {
  maxIncrease: number; // most we'll add vs last working weight
  maxDecrease: number; // most we'll drop vs last working weight
}

// Lower-body squat/hinge/deadlift patterns tolerate bigger jumps than
// upper-body pulls/presses. Defaults from PRD §4.7.2; tune per movement.
const LOWER_BODY = new Set([
  "deadlift",
  "romanian_deadlift",
  "single_leg_rdl",
  "back_squat",
  "front_squat",
  "goblet_squat",
  "lunge",
  "bulgarian_split_squat",
  "step_up",
  "hip_thrust",
  "glute_bridge",
  "good_morning",
  "kettlebell_swing",
]);

const UPPER_CAPS: ProgressionCaps = { maxIncrease: 5, maxDecrease: 10 };
const LOWER_CAPS: ProgressionCaps = { maxIncrease: 10, maxDecrease: 20 };

export function defaultCapsFor(canonicalId: string): ProgressionCaps {
  return LOWER_BODY.has(canonicalId) ? LOWER_CAPS : UPPER_CAPS;
}

/**
 * Clamp a raw recommendation so it can't jump more than the caps allow
 * relative to the last working weight. With no prior weight, returns raw.
 */
export function applyProgressionCaps(
  raw: number,
  lastWeight: number | null,
  caps: ProgressionCaps
): number {
  if (lastWeight === null) return raw;
  const ceiling = lastWeight + caps.maxIncrease;
  const floor = lastWeight - caps.maxDecrease;
  return Math.min(ceiling, Math.max(floor, raw));
}
