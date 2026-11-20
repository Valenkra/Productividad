import { MAX_STAGE, STAGE_NAMES } from "@/features/garden/growth";

/** Camino de 6 etapas: completadas en acento, la actual destacada, el resto en `line`. */
export function StagePath({ stage }: { stage: number }) {
  return (
    <ol
      aria-label="Etapas de la planta"
      className="relative mt-2 flex items-center justify-between px-1"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line"
      />
      <span
        aria-hidden="true"
        className="absolute left-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `calc((100% - 1.5rem) * ${stage / MAX_STAGE})` }}
      />
      {STAGE_NAMES.map((name, i) => {
        const state = i < stage ? "completada" : i === stage ? "actual" : "pendiente";
        return (
          <li
            key={name}
            aria-label={`${name} (${state})`}
            aria-current={i === stage ? "step" : undefined}
            className="relative grid size-[30px] place-items-center"
          >
            {state === "actual" ? (
              <span className="grid size-[30px] place-items-center rounded-full border-[3px] border-accent bg-white">
                <span className="size-3 rounded-full bg-accent" />
              </span>
            ) : (
              <span
                className={`size-[22px] rounded-full ${
                  state === "completada"
                    ? "border-[1.5px] border-ink bg-accent"
                    : "bg-line"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
