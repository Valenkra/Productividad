import { AppNav } from "@/components/layout/app-nav";
import { OnboardingGate } from "@/features/onboarding/onboarding-gate";
import { SettingsProvider } from "@/features/settings/settings-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-theme isolate min-h-screen">
      <main className="mx-auto min-h-screen max-w-md px-5 pb-32 pt-6">
        <SettingsProvider>
          <OnboardingGate>{children}</OnboardingGate>
        </SettingsProvider>
      </main>
      <AppNav />
    </div>
  );
}
