import Link from "next/link";
import { getTodaySession } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const today = new Date().toISOString().slice(0, 10);
  let todaySession: { id: string } | null = null;
  try {
    todaySession = await getTodaySession(today);
  } catch {
    // DB not reachable yet — still render the page.
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white">RackReady</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Tell me what to grab. I&apos;ll remember why.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/new"
            className="block w-full rounded-2xl bg-blue-600 py-5 text-lg font-bold text-white"
          >
            + Enter today&apos;s workout
          </Link>

          {todaySession && (
            <Link
              href={`/workout/${todaySession.id}`}
              className="block w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-4 text-base font-medium text-zinc-200"
            >
              View today&apos;s weights →
            </Link>
          )}
        </div>

        <div className="flex justify-center gap-6 pt-2 text-sm text-zinc-500">
          <Link href="/history" className="hover:text-zinc-300">
            History
          </Link>
          <Link href="/settings" className="hover:text-zinc-300">
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
