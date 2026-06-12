import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSessionDetail,
  getUserSettings,
  getHistoryForExercise,
  type LoggedSetRow,
} from "@/lib/db";
import type { Exercise, UserSettings } from "@/lib/types";
import { recommendWeight, type RecommendResult } from "@/engine/recommend";
import LogControl from "./log-control";

export const dynamic = "force-dynamic";

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function weightHint(ex: Exercise): string {
  switch (ex.load_type) {
    case "dumbbell":
      return ex.unilateral ? "lb, one DB" : "lb each hand";
    case "kettlebell":
      return "lb, one KB";
    case "bodyweight":
      return "lb added";
    default:
      return "lb";
  }
}

function prefillWeight(rec: RecommendResult, ex: Exercise, s: UserSettings): number {
  if (rec.kind === "recommendation") return rec.weight;
  if (rec.kind === "max_test") return Math.round(rec.e1rm);
  switch (ex.load_type) {
    case "dumbbell":
      return s.available_dumbbells[0] ?? 0;
    case "kettlebell":
      return s.available_kettlebells[0] ?? 0;
    case "bodyweight":
      return 0;
    default:
      return s.barbell_weight;
  }
}

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, settings] = await Promise.all([
    getSessionDetail(id),
    getUserSettings(),
  ]);
  if (!detail) notFound();

  const cards = await Promise.all(
    detail.prescriptions.map(async (p) => {
      const history = await getHistoryForExercise(p.exercise.id);
      const rec = recommendWeight({
        exercise: p.exercise,
        prescribedReps: p.reps,
        prescribedRpe: p.rpe,
        history,
        settings,
      });
      return { p, rec };
    })
  );

  return (
    <main className="min-h-screen bg-zinc-950 p-4 pb-12">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-zinc-400 text-sm">
            ← Home
          </Link>
          <h1 className="text-lg font-bold text-white">{prettyDate(detail.date)}</h1>
          <span className="w-10" />
        </div>

        <div className="space-y-3">
          {cards.map(({ p, rec }) => (
            <Card
              key={p.id}
              sessionId={detail.id}
              prescribedId={p.id}
              name={p.exercise.display_name}
              prescription={`${p.sets} × ${p.reps}${p.rpe === null ? " · 1RM" : ` @ RPE ${p.rpe}`}`}
              rec={rec}
              logged={p.logged}
              prefillW={prefillWeight(rec, p.exercise, settings)}
              prefillReps={p.reps}
              hint={weightHint(p.exercise)}
            />
          ))}
        </div>

        <Link
          href="/new"
          className="block w-full rounded-2xl border border-zinc-800 py-3 text-center text-sm font-medium text-zinc-400"
        >
          + New workout
        </Link>
      </div>
    </main>
  );
}

function Card({
  sessionId,
  prescribedId,
  name,
  prescription,
  rec,
  logged,
  prefillW,
  prefillReps,
  hint,
}: {
  sessionId: string;
  prescribedId: string;
  name: string;
  prescription: string;
  rec: RecommendResult;
  logged: LoggedSetRow[];
  prefillW: number;
  prefillReps: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold text-white">{name}</h2>
        <span className="text-xs text-zinc-500">{prescription}</span>
      </div>

      {rec.kind === "no_history" ? (
        <div className="mt-3">
          <p className="text-2xl font-black text-zinc-400">First time</p>
          <p className="mt-1 text-sm text-zinc-500">
            Pick a weight you can hit for these reps, then log it — I&apos;ll learn from here.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-3xl font-black text-blue-400">{rec.display}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{rec.rationale}</p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-zinc-600">
            est. 1RM ~{Math.round(rec.e1rm)} lb
          </p>
        </div>
      )}

      {logged.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-zinc-800 pt-3">
          {logged.map((l) => (
            <li key={l.id} className="text-xs text-zinc-400">
              <span className="text-zinc-600">Set {l.set_number}</span> · {l.weight}×{l.reps}
              {" · "}
              {l.reps_in_reserve === 0 ? "to failure" : `${l.reps_in_reserve} in reserve`}
            </li>
          ))}
        </ul>
      )}

      <LogControl
        sessionId={sessionId}
        prescribedId={prescribedId}
        prefillWeight={prefillW}
        prefillReps={prefillReps}
        weightStep={5}
        weightHint={hint}
        setNumber={logged.length + 1}
      />
    </div>
  );
}
