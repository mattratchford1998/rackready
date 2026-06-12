"use server";

import { revalidatePath } from "next/cache";
import { createSession, logSet, type PrescribedItem } from "@/lib/db";

export async function createWorkout(date: string, items: PrescribedItem[]): Promise<string> {
  return createSession(date, items);
}

export async function logSetAction(
  sessionId: string,
  prescribedId: string,
  weight: number,
  reps: number,
  reps_in_reserve: number
): Promise<void> {
  await logSet(prescribedId, weight, reps, reps_in_reserve);
  revalidatePath(`/workout/${sessionId}`);
}
