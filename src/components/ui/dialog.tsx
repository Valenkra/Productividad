/** Diálogo modal centrado (blanco, borde de tinta). Se cierra solo con sus propios botones. */
export function Dialog({
  titleId,
  children,
}: {
  /** id del título dentro de `children` (aria-labelledby). */
  titleId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-overlay px-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-[30px] border-[1.5px] border-ink bg-white p-6 text-center shadow-[0_4px_0_var(--ink)]"
      >
        {children}
      </div>
    </div>
  );
}
