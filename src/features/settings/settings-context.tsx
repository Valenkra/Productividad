"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useApi } from "@/lib/utils/use-api";
import type { UserSettings } from "./schema";

const SETTINGS_URL = "/api/settings";

export interface SettingsValue {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  /** Reemplaza la copia local (p. ej. con la respuesta de un PATCH). */
  setSettings: (settings: UserSettings) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

function useSettingsSource(url: string | null): SettingsValue {
  const api = useApi<UserSettings>(url);
  const [override, setOverride] = useState<UserSettings | null>(null);
  const settings = override ?? api.data;
  return useMemo(
    () => ({
      settings,
      loading: api.loading && !override,
      error: api.error,
      setSettings: setOverride,
    }),
    [settings, api.loading, api.error, override],
  );
}

/** Ajustes del usuario cargados UNA vez para toda la app interior (gate, Foco, Tareas…). */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const value = useSettingsSource(SETTINGS_URL);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Ajustes compartidos. Fuera de un `SettingsProvider`, los pide por su cuenta. */
export function useSettings(): SettingsValue {
  const shared = useContext(SettingsContext);
  const own = useSettingsSource(shared ? null : SETTINGS_URL);
  return shared ?? own;
}
