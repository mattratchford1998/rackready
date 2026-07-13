"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Exercise } from "@/lib/types";
import { saveMaxes } from "../actions";
import type { OneRepMaxEntry } from "@/lib/db";

export default function MaxesForm({
  barbell,
  dumbbell,
  initial,
}: {
  barbell: Exercise[];
  dumbbell: Exercise[];
  initial: Record<string, number>;
}) {
  const router = useRouter();
  const all = [...barbell, ...dumbbell];
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(all.map((e) => [e.id, initial[e.id] != null ? String(initial[e.id]) : ""]))
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  function set(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
    setStatus("idle");
  }

  async function save() {
    setError(null);
    const entries: OneRepMaxEntry[] = all.map((e) => {
      const raw = values[e.id]?.trim();
      const n = raw ? Number(raw) : NaN;
      return { exercise_id: e.id, weight: Number.isFinite(n) && n > 0 ? n : null };
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

  const Row = ({ ex, unit }: { ex: Exercise; unit: string }) => (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
      <span className="text-sm text-zinc-200">{ex.display_name}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          value={values[ex.id] ?? ""}
          onChange={(e) => set(ex.id, e.target.value)}
          placeholder="—"
          className="h-10 w-24 rounded-lg border border-zinc-700 bg-zinc-950 text-center text-white"
        />
        <span className="w-10 text-[11px] text-zinc-600">{unit}</span>
      </span>
    </label>
  );

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
          Know a 1-rep max? Enter it and recommendations start right away — no calibration
          session needed. Leave blank any you don&apos;t know. You can update these anytime.
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
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Dumbbell — per hand
            </h2>
            {dumbbell.map((ex) => (
              <Row key={ex.id} ex={ex} unit="lb/hand" />
            ))}
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
