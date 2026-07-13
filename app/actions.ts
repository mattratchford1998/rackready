"use server";

import { revalidatePath } from "next/cache";
import {
  createSession,
  logSet,
  updateUserSettings,
  saveOneRepMaxes,
  type PrescribedItem,
  type OneRepMaxEntry,
} from "@/lib/db";
import type { UserSettings } from "@/lib/types";

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

export async function saveSettings(settings: UserSettings): Promise<void> {
  await updateUserSettings(settings);
  revalidatePath("/settings");
  revalidatePath("/", "layout"); // recommendations depend on equipment
}

export async function saveMaxes(entries: OneRepMaxEntry[]): Promise<void> {
  await saveOneRepMaxes(entries);
  revalidatePath("/maxes");
  revalidatePath("/", "layout"); // seeds recommendations
}
