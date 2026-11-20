"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { UserSettings } from "@/features/settings/schema";
import { useApi } from "@/lib/utils/use-api";

/** Lleva a /onboarding a quien todavía no vio la introducción. Si los ajustes fallan, no estorba. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data } = useApi<UserSettings>("/api/settings");
  const pending = data !== null && !data.onboardingDone;

  useEffect(() => {
    if (pending) router.replace("/onboarding");
  }, [pending, router]);

  return <>{children}</>;
}
