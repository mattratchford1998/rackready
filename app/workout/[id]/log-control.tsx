"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logSetAction } from "../../actions";

function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="h-10 w-10 shrink-0 rounded-xl border border-zinc-700 text-xl font-bold text-zinc-200"
        aria-label="decrease"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 text-center text-lg font-semibold text-white"
      />
      <button
        type="button"
        onClick={() => onChange(value + step)}
        className="h-10 w-10 shrink-0 rounded-xl border border-zinc-700 text-xl font-bold text-zinc-200"
        aria-label="increase"
      >
        +
      </button>
    </div>
  );
}

export default function LogControl({
  sessionId,
  prescribedId,
  prefillWeight,
  prefillReps,
  weightStep,
  weightHint,
  setNumber,
}: {
  sessionId: string;
  prescribedId: string;
  prefillWeight: number;
  prefillReps: number;
  weightStep: number;
  weightHint: string;
  setNumber: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState(prefillWeight);
  const [reps, setReps] = useState(prefillReps);
  const [rir, setRir] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-200"
      >
        Log set {setNumber}
      </button>
    );
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await logSetAction(sessionId, prescribedId, weight, reps, rir);
      setOpen(false);
      setRir(0);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-zinc-700 bg-zinc-950/60 p-3">
      <div>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          Weight ({weightHint})
        </span>
        <div className="mt-1">
          <Stepper value={weight} onChange={setWeight} step={weightStep} />
        </div>
      </div>
      <div>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Reps done</span>
        <div className="mt-1">
          <Stepper value={reps} onChange={setReps} step={1} min={1} />
        </div>
      </div>
      <div>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          Could you have done more? How many?
        </span>
        <div className="mt-1">
          <Stepper value={rir} onChange={setRir} step={1} min={0} />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-[2] rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save set"}
        </button>
      </div>
    </div>
  );
}
