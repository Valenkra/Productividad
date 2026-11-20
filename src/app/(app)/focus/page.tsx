import { Suspense } from "react";
import { FocusPanel } from "@/features/focus-tracking/focus-panel";

export default function FocusPage() {
  // FocusPanel lee ?task= con useSearchParams: necesita un límite de Suspense.
  return (
    <Suspense fallback={<p role="status">Cargando sesión…</p>}>
      <FocusPanel />
    </Suspense>
  );
}
