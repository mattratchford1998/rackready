import { getExercises } from "@/lib/db";
import NewWorkoutForm from "./new-workout-form";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage() {
  const exercises = await getExercises();
  const today = new Date().toISOString().slice(0, 10);
  return <NewWorkoutForm exercises={exercises} today={today} />;
}
