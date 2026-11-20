import { AppNav } from "@/components/layout/app-nav";
import { OnboardingGate } from "@/features/onboarding/onboarding-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-theme isolate min-h-screen">
      <main className="mx-auto min-h-screen max-w-md px-5 pb-32 pt-6">
        <OnboardingGate>{children}</OnboardingGate>
      </main>
      <AppNav />
    </div>
  );
}
