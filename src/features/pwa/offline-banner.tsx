"use client";

import { useOnline } from "@/lib/utils/use-online";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-20 bg-leaf-strong px-4 py-2 text-center text-sm text-white"
    >
      Sin conexión: no se acredita tiempo de foco hasta que vuelvas a conectarte.
    </div>
  );
}
