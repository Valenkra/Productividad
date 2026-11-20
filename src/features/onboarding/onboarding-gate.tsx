"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSettings } from "@/features/settings/settings-context";

/**
 * Lleva a /onboarding a quien todavía no vio la introducción. No muestra la app hasta
 * saberlo (evita que Foco parpadee antes de redirigir). Si los ajustes fallan, no estorba.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { settings, loading } = useSettings();
  const pending = settings !== null && !settings.onboardingDone;

  useEffect(() => {
    if (pending) router.replace("/onboarding");
  }, [pending, router]);

  if (loading) return <p role="status">Cargando…</p>;
  if (pending) return null;
  return <>{children}</>;
}
