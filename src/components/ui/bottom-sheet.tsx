"use client";

import { useEffect } from "react";

/**
 * Hoja inferior modal: overlay que cierra al tocar fuera y cierre con Escape.
 * `className` ajusta el contenedor (alto máximo, separación, padding superior).
 */
export function BottomSheet({
  label,
  onClose,
  overlayTestId,
  className = "",
  children,
}: {
  label: string;
  onClose: () => void;
  overlayTestId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div
        data-testid={overlayTestId}
        className="absolute inset-0 bg-overlay"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`app-theme relative flex w-full max-w-md flex-col overflow-y-auto rounded-t-[32px] px-5 pb-[34px] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
