"use client";

import { useSyncExternalStore } from "react";
import { detectPlatform, type Platform } from "./platform";

const noopSubscribe = () => () => {};

/** Snapshot primitivo ("plataforma|standalone") para que React lo compare sin bucles. */
function snapshot(): string {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return `${detectPlatform(navigator.userAgent, navigator.maxTouchPoints)}|${standalone}`;
}

const STEPS: Record<Platform, string[]> = {
  ios: [
    "Abrí esta página en Safari.",
    "Tocá el botón Compartir.",
    "Elegí «Agregar a inicio».",
  ],
  android: [
    "Abrí esta página en Chrome.",
    "Tocá el menú (⋮).",
    "Elegí «Instalar app» o «Agregar a la pantalla principal».",
  ],
  other: ["Usá el ícono de instalar en la barra de direcciones de tu navegador."],
};

export function InstallHelp() {
  const value = useSyncExternalStore(noopSubscribe, snapshot, () => "other|true");
  const [platform, standalone] = value.split("|") as [Platform, string];
  if (standalone === "true") return null;

  return (
    <section aria-labelledby="install-title" className="mt-8 max-w-md">
      <h2 id="install-title" className="text-lg font-semibold">
        Instalar la app
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
        {STEPS[platform].map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {platform === "ios" && (
        <p className="mt-3 text-sm text-muted">
          En iPhone la app debe permanecer abierta en primer plano para acreditar tiempo: no
          cuenta con la pantalla bloqueada.
        </p>
      )}
    </section>
  );
}
