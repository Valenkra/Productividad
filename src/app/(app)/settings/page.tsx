import { InstallHelp } from "@/features/pwa/install-help";
import { SettingsForm } from "@/features/settings/settings-form";

export default function Page() {
  return (
    <>
      <SettingsForm />
      <InstallHelp />
    </>
  );
}
