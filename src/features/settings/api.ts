import { apiFetch } from "@/lib/http/client";
import type { UserSettings } from "./schema";

export const patchSettings = (patch: Partial<UserSettings>) =>
  apiFetch<UserSettings>("/api/settings", { method: "PATCH", body: patch });
