"use server";

import { createSession, type PrescribedItem } from "@/lib/db";

export async function createWorkout(date: string, items: PrescribedItem[]): Promise<string> {
  return createSession(date, items);
}
