import Link from "next/link";
import { getAllHistory, getUserSettings } from "@/lib/db";
import { computeE1RM } from "@/engine/e1rm";
import type { ExerciseHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function loadLabel(h: ExerciseHistory, weight: number): string {
  const lt = h.exercise.load_type;
  if (lt === "bodyweight") {
    return weight > 0 ? `+${weight}` : weight < 0 ? `${-weight} assist` : "BW";
  }
  return String(weight);
}

export default async function HistoryPage() {
  const [history, settings] = await Promise.all([getAllHistory(), getUserSettings()]);

  return (
    <main className="min-h-screen bg-zinc-950 p-4 pb-12">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400">
            ← Home
          </Link>
          <h1 className="text-lg font-bold text-white">History</h1>
          <span className="w-10" />
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No logged sets yet. Log a few workouts and your progress shows up here.
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((h) => {
              const e1rmInput =
                h.exercise.load_type === "bodyweight"
                  ? h.sets.map((s) => ({ ...s, weight: s.weight + settings.bodyweight }))
                  : h.sets;
              const e1rm = computeE1RM(e1rmInput);
              return (
                <div key={h.exercise.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-base font-bold text-white">{h.exercise.display_name}</h2>
                    {e1rm !== null && (
                      <span className="text-xs text-zinc-500">est. 1RM ~{Math.round(e1rm)} lb</span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1">
                    {h.sets.slice(0, 6).map((s, i) => (
                      <li key={i} className="flex justify-between text-xs text-zinc-400">
                        <span className="text-zinc-600">{prettyDate(s.date)}</span>
                        <span>
                          {loadLabel(h, s.weight)} × {s.reps}
                          <span className="text-zinc-600">
                            {" · "}
                            {s.reps_in_reserve === 0 ? "to failure" : `${s.reps_in_reserve} left`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {h.sets.length > 6 && (
                    <p className="mt-1 text-[11px] text-zinc-600">+{h.sets.length - 6} more</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
