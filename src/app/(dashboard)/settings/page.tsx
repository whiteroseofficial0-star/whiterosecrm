import { SettingsPage } from "@/components/settings/settings-page";
import { requirePageAccess } from "@/lib/access";

export default async function SettingsPageWrapper() {
  await requirePageAccess("/settings");
  return <SettingsPage />;
}
