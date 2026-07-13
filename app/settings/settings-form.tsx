"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserSettings } from "@/lib/types";
import { saveSettings } from "../actions";

// Number list <-> comma text, tolerant of spaces and trailing commas.
const listToText = (xs: number[]) => xs.join(", ");
const textToList = (t: string) =>
  t
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

export default function SettingsForm({ initial }: { initial: UserSettings }) {
  const router = useRouter();
  const [bodyweight, setBodyweight] = useState(String(initial.bodyweight));
  const [barbell, setBarbell] = useState(String(initial.barbell_weight));
  const [dumbbells, setDumbbells] = useState(listToText(initial.available_dumbbells));
  const [kettlebells, setKettlebells] = useState(listToText(initial.available_kettlebells));
  const [plates, setPlates] = useState(listToText(initial.plate_inventory));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const settings: UserSettings = {
      bodyweight: Number(bodyweight),
      barbell_weight: Number(barbell),
      available_dumbbells: textToList(dumbbells),
      available_kettlebells: textToList(kettlebells),
      plate_inventory: textToList(plates),
    };
    if (!Number.isFinite(settings.bodyweight) || settings.bodyweight <= 0) {
      setError("Enter a valid bodyweight.");
      return;
    }
    setSaving(true);
    try {
      await saveSettings(settings);
      setStatus("saved");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const field = "mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-white";

  return (
    <main className="min-h-screen bg-zinc-950 p-4 pb-24">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400">
            ← Home
          </Link>
          <h1 className="text-lg font-bold text-white">Settings</h1>
          <span className="w-10" />
        </div>

        <p className="text-sm text-zinc-500">
          Your equipment. Recommendations round to what you actually have.
        </p>

        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Bodyweight (lb)</span>
          <input
            type="number"
            inputMode="decimal"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
            className={field}
          />
          <span className="mt-1 block text-[11px] text-zinc-600">
            Used for pull-ups, dips, and other bodyweight moves.
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Barbell weight (lb)</span>
          <input
            type="number"
            inputMode="decimal"
            value={barbell}
            onChange={(e) => setBarbell(e.target.value)}
            className={field}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Dumbbells available (lb)</span>
          <input
            value={dumbbells}
            onChange={(e) => setDumbbells(e.target.value)}
            className={field}
            placeholder="5, 10, 15, 20, …"
          />
          <span className="mt-1 block text-[11px] text-zinc-600">Comma-separated, per hand.</span>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Kettlebells available (lb)</span>
          <input
            value={kettlebells}
            onChange={(e) => setKettlebells(e.target.value)}
            className={field}
            placeholder="18, 26, 35, …"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Plates on hand (lb, per plate)</span>
          <input
            value={plates}
            onChange={(e) => setPlates(e.target.value)}
            className={field}
            placeholder="45, 35, 25, 10, 5, 2.5"
          />
          <span className="mt-1 block text-[11px] text-zinc-600">
            Smallest plate sets how finely barbell weights round.
          </span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/90 p-4 backdrop-blur">
        <div className="mx-auto w-full max-w-sm">
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : status === "saved" ? "Saved ✓ — Save again" : "Save settings"}
          </button>
        </div>
      </div>
    </main>
  );
}
