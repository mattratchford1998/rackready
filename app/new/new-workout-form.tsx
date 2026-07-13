"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Exercise } from "@/lib/types";
import { createWorkout } from "../actions";
import type { PrescribedItem } from "@/lib/db";

interface Row {
  exercise_id: string;
  sets: number;
  reps: number;
  rpe: number | null; // null = 1RM test day
}

const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

// Decode any browser-renderable image (including iPhone HEIC, which Safari can
// draw) and re-encode to a downscaled JPEG. Fixes unsupported formats and keeps
// the base64 payload small enough for the serverless request-size limit.
async function toDownscaledJpegBase64(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("Couldn't read that image — try a JPEG or PNG."));
      im.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't process that image.");
    ctx.drawImage(img, 0, 0, w, h);
    const base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
    if (!base64) throw new Error("Couldn't process that image.");
    return base64;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function NewWorkoutForm({
  exercises,
  today,
}: {
  exercises: Exercise[];
  today: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<Row[]>([
    { exercise_id: exercises[0]?.id ?? "", sets: 3, reps: 5, rpe: 8 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);

  const known = new Set(exercises.map((e) => e.id));

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    setError(null);
    setScanNote(null);
    setScanning(true);
    try {
      // Re-encode to a downscaled JPEG in the browser: handles iPhone HEIC and
      // keeps the upload well under serverless request-size limits.
      const base64 = await toDownscaledJpegBase64(file);

      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not read that photo.");

      const scanned: Row[] = [];
      const skipped: string[] = [];
      for (const block of data.blocks ?? []) {
        for (const ex of block.exercises ?? []) {
          if (ex.canonical && known.has(ex.canonical)) {
            scanned.push({
              exercise_id: ex.canonical,
              sets: ex.sets || 3,
              reps: ex.reps || 5,
              rpe: ex.rpe ?? 8,
            });
          } else {
            skipped.push(ex.raw);
          }
        }
      }
      for (const u of data.unparsed ?? []) skipped.push(u);

      if (scanned.length === 0) {
        setError("Couldn't match any exercises from that photo — enter them by hand below.");
      } else {
        setRows(scanned);
        if (data.detectedDate) setDate(data.detectedDate);
      }
      if (skipped.length > 0) {
        setScanNote(`Skipped (add manually): ${skipped.join(", ")}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that photo.");
    } finally {
      setScanning(false);
    }
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const used = new Set(rows.map((r) => r.exercise_id));
    const next = exercises.find((e) => !used.has(e.id)) ?? exercises[0];
    setRows((rs) => [
      ...rs,
      { exercise_id: next?.id ?? "", sets: 3, reps: next?.default_reps ?? 5, rpe: 8 },
    ]);
  }

  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, j) => j !== i));
  }

  async function submit() {
    setError(null);
    const items: PrescribedItem[] = rows
      .filter((r) => r.exercise_id)
      .map((r) => ({
        exercise_id: r.exercise_id,
        sets: r.sets,
        reps: r.reps,
        rpe: r.rpe,
      }));
    if (items.length === 0) {
      setError("Add at least one exercise.");
      return;
    }
    setSaving(true);
    try {
      const id = await createWorkout(date, items);
      router.push(`/workout/${id}`);
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "Something went wrong saving the workout.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-4 pb-32">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-zinc-400 text-sm">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-white">New workout</h1>
          <span className="w-10" />
        </div>

        <label className="block w-full">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            disabled={scanning}
            className="hidden"
          />
          <span
            className={`flex w-full items-center justify-center rounded-2xl border border-zinc-700 py-4 text-base font-semibold ${
              scanning ? "text-zinc-500" : "text-zinc-100"
            }`}
          >
            {scanning ? "Reading the board…" : "📷 Snap the board"}
          </span>
        </label>

        {scanNote && <p className="text-xs text-amber-400">{scanNote}</p>}

        <label className="block">
          <span className="text-xs font-medium text-zinc-400">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-white"
          />
        </label>

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3 space-y-3"
            >
              <div className="flex items-center gap-2">
                <select
                  value={row.exercise_id}
                  onChange={(e) => update(i, { exercise_id: e.target.value })}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-white"
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.display_name}
                    </option>
                  ))}
                </select>
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(i)}
                    className="rounded-xl px-3 py-3 text-zinc-500 hover:text-red-400"
                    aria-label="Remove exercise"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Sets
                  </span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={row.sets}
                    onChange={(e) => update(i, { sets: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-center text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Reps
                  </span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={row.reps}
                    onChange={(e) => update(i, { reps: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-center text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                    RPE
                  </span>
                  <select
                    value={row.rpe === null ? "max" : String(row.rpe)}
                    onChange={(e) =>
                      update(i, {
                        rpe: e.target.value === "max" ? null : Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-2 text-center text-white"
                  >
                    {RPE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    <option value="max">1RM</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          className="w-full rounded-2xl border border-dashed border-zinc-700 py-3 text-sm font-medium text-zinc-400"
        >
          + Add exercise
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/90 p-4 backdrop-blur">
        <div className="mx-auto w-full max-w-sm">
          <button
            onClick={submit}
            disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : "Get my weights →"}
          </button>
        </div>
      </div>
    </main>
  );
}
