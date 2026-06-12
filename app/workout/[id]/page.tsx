import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSessionDetail,
  getUserSettings,
  getHistoryForExercise,
} from "@/lib/db";
import { recommendWeight, type RecommendResult } from "@/engine/recommend";

export const dynamic = "force-dynamic";

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
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
              name={p.exercise.display_name}
              prescription={`${p.sets} × ${p.reps}${p.rpe === null ? " · 1RM" : ` @ RPE ${p.rpe}`}`}
              rec={rec}
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
  name,
  prescription,
  rec,
}: {
  name: string;
  prescription: string;
  rec: RecommendResult;
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
    </div>
  );
}
