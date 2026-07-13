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
        </div>

        <div className="space-y-3">
          <Link
            href="/new"
            className="inline-block px-4 py-2 text-base font-bold text-zinc-950"
            style={{ backgroundColor: "#8dfc82", borderRadius: "0px" }}
          >
            Enter today&apos;s workout
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
          <Link href="/maxes" className="hover:text-zinc-300">
            Maxes
          </Link>
          <Link href="/settings" className="hover:text-zinc-300">
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
