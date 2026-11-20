import type { Metadata } from "next";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Bienvenida · Focus Garden" };

export default function OnboardingPage() {
  return (
    <div className="app-theme min-h-screen">
      <OnboardingFlow />
    </div>
  );
}
