"use client";

import { useState } from "react";
import type { ExerciseHistory } from "@/lib/db";
import type { HistorySet } from "@/lib/types";
import { epley } from "@/engine/e1rm";

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Group sets (already newest-first) into one entry per workout date.
function byDay(sets: HistorySet[]): { date: string; sets: HistorySet[]; seed: boolean }[] {
  const days: { date: string; sets: HistorySet[]; seed: boolean }[] = [];
  for (const s of sets) {
    let day = days.find((d) => d.date === s.date && d.seed === !!s.seed);
    if (!day) {
      day = { date: s.date, sets: [], seed: !!s.seed };
      days.push(day);
    }
    day.sets.push(s);
  }
  return days;
}

export default function HistoryBrowser({
  history,
  bodyweight,
}: {
  history: ExerciseHistory[];
  bodyweight: number;
}) {
  const [sel, setSel] = useState(history[0]?.exercise.id ?? "");
  const current = history.find((h) => h.exercise.id === sel) ?? history[0];
  const isBodyweight = current.exercise.load_type === "bodyweight";

  const loadLabel = (w: number): string => {
    if (isBodyweight) return w > 0 ? `+${w} lb` : w < 0 ? `${-w} lb assist` : "bodyweight";
    if (current.exercise.load_type === "dumbbell") return `${w} lb/hand`;
    if (current.exercise.load_type === "kettlebell") return `${w} lb KB`;
    return `${w} lb`;
  };

  // Best single-set e1RM for a workout day (bodyweight adds bodyweight).
  const dayE1RM = (sets: HistorySet[]): number =>
    Math.max(
      ...sets.map((s) => epley((isBodyweight ? s.weight + bodyweight : s.weight), s.reps + s.reps_in_reserve))
    );

  const days = byDay(current.sets);

  return (
    <div className="space-y-4">
      <select
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-base font-semibold text-white"
      >
        {history.map((h) => (
          <option key={h.exercise.id} value={h.exercise.id}>
            {h.exercise.display_name}
          </option>
        ))}
      </select>

      <div className="space-y-2">
        {days.map((day, i) => (
          <div
            key={`${day.date}-${i}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-zinc-200">
                {day.seed ? "Starting baseline" : prettyDate(day.date)}
              </span>
              <span className="text-xs text-zinc-500">est. 1RM ~{Math.round(dayE1RM(day.sets))} lb</span>
            </div>
            <ul className="mt-1.5 space-y-0.5">
              {day.sets.map((s, j) => (
                <li key={j} className="flex justify-between text-sm text-zinc-400">
                  <span>
                    {loadLabel(s.weight)} × {s.reps}
                  </span>
                  <span className="text-zinc-600">
                    {s.seed
                      ? `${s.reps}-rep max`
                      : s.reps_in_reserve === 0
                      ? "to failure"
                      : `${s.reps_in_reserve} left`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
