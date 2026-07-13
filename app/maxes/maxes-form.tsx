"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Exercise } from "@/lib/types";
import { saveMaxes } from "../actions";
import type { Baseline, BaselineEntry } from "@/lib/db";
import { epley } from "@/engine/e1rm";

export default function MaxesForm({
  barbell,
  dumbbell,
  initial,
}: {
  barbell: Exercise[];
  dumbbell: Exercise[];
  initial: Record<string, Baseline>;
}) {
  const router = useRouter();
  const all = [...barbell, ...dumbbell];

  const [weights, setWeights] = useState<Record<string, string>>(
    Object.fromEntries(all.map((e) => [e.id, initial[e.id] ? String(initial[e.id].weight) : ""]))
  );
  const [reps, setReps] = useState<Record<string, string>>(
    Object.fromEntries(all.map((e) => [e.id, initial[e.id] ? String(initial[e.id].reps) : "1"]))
  );
  const [dbOpen, setDbOpen] = useState(dumbbell.some((e) => initial[e.id]));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  function setWeight(id: string, v: string) {
    setWeights((p) => ({ ...p, [id]: v }));
    setStatus("idle");
  }
  function setRep(id: string, v: string) {
    setReps((p) => ({ ...p, [id]: v }));
    setStatus("idle");
  }

  async function save() {
    setError(null);
    const entries: BaselineEntry[] = all.map((e) => {
      const w = Number(weights[e.id]?.trim());
      const r = Number(reps[e.id]?.trim()) || 1;
      return { exercise_id: e.id, weight: Number.isFinite(w) && w > 0 ? w : null, reps: r };
    });
    setSaving(true);
    try {
      await saveMaxes(entries);
      setStatus("saved");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const Row = ({ ex, unit }: { ex: Exercise; unit: string }) => {
    const w = Number(weights[ex.id]);
    const r = Number(reps[ex.id]);
    const est = w > 0 && r > 0 ? Math.round(epley(w, r)) : null;
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-zinc-200">{ex.display_name}</span>
          <span className="text-[11px] text-zinc-500">
            {est !== null ? `≈ ${est} lb est. 1RM` : " "}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={weights[ex.id] ?? ""}
            onChange={(e) => setWeight(ex.id, e.target.value)}
            placeholder="—"
            className="no-spinner h-10 w-20 rounded-lg border border-zinc-700 bg-zinc-950 text-center text-white"
            aria-label={`${ex.display_name} weight`}
          />
          <span className="text-[11px] text-zinc-600">{unit}</span>
          <span className="text-zinc-600">×</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={15}
            value={reps[ex.id] ?? ""}
            onChange={(e) => setRep(ex.id, e.target.value)}
            className="no-spinner h-10 w-16 rounded-lg border border-zinc-700 bg-zinc-950 text-center text-white"
            aria-label={`${ex.display_name} reps`}
          />
          <span className="text-[11px] text-zinc-600">reps</span>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-950 p-4 pb-24">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400">
            ← Home
          </Link>
          <h1 className="text-lg font-bold text-white">Your maxes</h1>
          <span className="w-10" />
        </div>

        <p className="text-sm text-zinc-500">
          Enter a best set you know for any lift — the weight and how many reps you hit it for
          (a 3-rep max, a 5-rep max, whatever you know). We estimate your 1RM from it and start
          recommending right away. Leave blank any you don&apos;t know; update anytime.
        </p>

        {barbell.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Barbell</h2>
            {barbell.map((ex) => (
              <Row key={ex.id} ex={ex} unit="lb" />
            ))}
          </section>
        )}

        {dumbbell.length > 0 ? (
          <section className="space-y-2">
            <button
              type="button"
              onClick={() => setDbOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Dumbbell — per hand
              </span>
              <span className="text-zinc-500">{dbOpen ? "▲" : "▼"}</span>
            </button>
            {dbOpen && dumbbell.map((ex) => <Row key={ex.id} ex={ex} unit="lb/hand" />)}
          </section>
        ) : (
          <p className="text-xs text-amber-400">
            Dumbbell versions aren&apos;t in the database yet — run migration 003, then reload.
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/90 p-4 backdrop-blur">
        <div className="mx-auto w-full max-w-sm">
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : status === "saved" ? "Saved ✓" : "Save maxes"}
          </button>
        </div>
      </div>
    </main>
  );
}
