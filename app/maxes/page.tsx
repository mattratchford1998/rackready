import { getExercises, getOneRepMaxes } from "@/lib/db";
import type { Exercise } from "@/lib/types";
import MaxesForm from "./maxes-form";

export const dynamic = "force-dynamic";

// The compound lifts, barbell then dumbbell (per-hand) variant.
const BARBELL = ["deadlift", "back_squat", "romanian_deadlift", "push_press", "bench_press", "bent_over_row"];
const DUMBBELL = ["db_deadlift", "db_squat", "db_romanian_deadlift", "db_push_press", "db_bench_press", "db_bent_over_row"];

export default async function MaxesPage() {
  const exercises = await getExercises();
  let initial: Record<string, number> = {};
  try {
    initial = await getOneRepMaxes();
  } catch {
    // one_rep_max table not created yet (migration 003 not run) — show empty.
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((e): e is Exercise => !!e);

  return <MaxesForm barbell={pick(BARBELL)} dumbbell={pick(DUMBBELL)} initial={initial} />;
}
