export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">
        Esta sección todavía no está implementada ({phase}).
      </p>
    </section>
  );
}
