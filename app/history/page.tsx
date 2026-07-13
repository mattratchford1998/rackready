import Link from "next/link";
import { getAllHistory, getUserSettings } from "@/lib/db";
import HistoryBrowser from "./history-browser";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [history, settings] = await Promise.all([getAllHistory(), getUserSettings()]);

  return (
    <main className="min-h-screen bg-zinc-950 p-4 pb-12">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400">
            ← Home
          </Link>
          <h1 className="text-lg font-bold text-white">History</h1>
          <span className="w-10" />
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No logged sets yet. Log a few workouts and each movement&apos;s history shows up here.
          </p>
        ) : (
          <HistoryBrowser history={history} bodyweight={settings.bodyweight} />
        )}
      </div>
    </main>
  );
}
