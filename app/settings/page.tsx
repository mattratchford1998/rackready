import { getUserSettings } from "@/lib/db";
import SettingsForm from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getUserSettings();
  return <SettingsForm initial={settings} />;
}
