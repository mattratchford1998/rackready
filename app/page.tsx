export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            RackReady
          </h1>
          <p className="mt-2 text-zinc-400 text-sm">
            Tell me what to grab. I&apos;ll remember why.
          </p>
        </div>

        {/* Phase 0 placeholder — replaced in Phase 2 */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 space-y-4">
          <p className="text-zinc-300 text-sm leading-relaxed">
            Phase 0 scaffold is live.
          </p>
          <p className="text-zinc-500 text-xs">
            Phase 1 → engine · Phase 2 → manual entry · Phase 3 → logging
          </p>
        </div>

        <button
          disabled
          className="w-full rounded-2xl bg-blue-600 py-5 text-lg font-bold text-white opacity-40 cursor-not-allowed"
        >
          📷 Snap today&apos;s workout
        </button>
      </div>
    </main>
  );
}
