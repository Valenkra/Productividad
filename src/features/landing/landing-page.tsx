import Link from "next/link";
import { PlantIllustration } from "@/features/garden/plant-illustration";
import { STAGE_NAMES, STAGE_THRESHOLDS } from "@/features/garden/growth";
import { MiniFocusDemo } from "./mini-focus-demo";

const pill =
  "inline-flex min-h-12 items-center justify-center rounded-full px-7 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-strong";
const cta = `${pill} bg-leaf-strong text-white shadow-[0_12px_30px_-12px_rgba(58,95,55,0.8)] hover:bg-leaf`;

const STEPS = [
  {
    title: "Elegí qué estudiar",
    text: "Armá tu lista de tareas con prioridad y fecha límite. Sin complicaciones: lo justo para empezar.",
  },
  {
    title: "Enfocate con Pomodoro",
    text: "25 minutos de foco y 5 de descanso (podés cambiarlos). Un descanso largo cada cuatro bloques.",
  },
  {
    title: "Mirá crecer tu planta",
    text: "Cada minuto de foco válido suma crecimiento. Tu progreso se guarda, bloque a bloque.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="hero-glow min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Focus Garden, inicio"
        >
          <PlantIllustration stage={5} size={34} />
          <span className="font-display text-xl font-semibold tracking-tight">
            Focus Garden
          </span>
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface/80 px-5 text-sm font-medium hover:bg-surface"
        >
          Entrar
        </Link>
      </header>

      <main>
        <section
          data-section="hero"
          className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-x-16 lg:pt-12"
        >
          <div className="text-center lg:col-start-1 lg:row-start-1 lg:self-end lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf-strong">
              Pomodoro + jardín
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Estudiá en calma. Mirá crecer tu planta.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-lg text-muted lg:mx-0">
              Cada minuto de foco real hace crecer una planta. Probalo acá mismo, sin
              cuenta.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 lg:col-start-1 lg:row-start-2 lg:items-start lg:self-start">
            <Link href="/login" className={cta}>
              Crear mi cuenta gratis
            </Link>
            <p className="text-sm text-muted">
              Guardá tu planta, tus tareas y tu historial.
            </p>
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <MiniFocusDemo />
          </div>
        </section>

        <section aria-labelledby="how-title" className="bg-surface/70 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2
              id="how-title"
              className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Así funciona
            </h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-3xl border border-border bg-background p-6"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 place-items-center rounded-full bg-leaf-strong font-display text-lg font-semibold text-white"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="stages-title" className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2
              id="stages-title"
              className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Tu planta crece con vos
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted">
              De semilla a flor: {STAGE_THRESHOLDS[STAGE_THRESHOLDS.length - 1]} minutos
              de foco real para verla florecer.
            </p>
            <ol className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {STAGE_NAMES.map((name, i) => (
                <li
                  key={name}
                  className="flex flex-col items-center rounded-3xl border border-border bg-surface p-4 text-center"
                >
                  <PlantIllustration stage={i} size={84} />
                  <span className="mt-2 font-display text-lg font-semibold">{name}</span>
                  <span className="text-sm text-muted">
                    {i === 0 ? "Al empezar" : `${STAGE_THRESHOLDS[i]} min`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="trust-title" className="bg-surface/70 py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-2 md:items-center">
            <div>
              <h2
                id="trust-title"
                className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Sin trampas, sin presión
              </h2>
              <p className="mt-4 text-muted">
                El tiempo cuenta solo con la app abierta, visible y en primer plano.
              </p>
              <p className="mt-3 text-muted">
                Focus Garden no mide tu atención: te da un espacio de concentración y te
                acompaña, no te vigila.
              </p>
            </div>
            <ul className="grid gap-3">
              {[
                "Descansar un día no rompe tu racha.",
                "Tareas, historial y meta diaria en un solo lugar.",
                "Pensada para móvil y escritorio.",
              ].map((text) => (
                <li
                  key={text}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1 h-3 w-3 shrink-0 rounded-full bg-leaf"
                  />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="final-title" className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-[2rem] bg-leaf-strong px-6 py-12 text-center text-white">
            <h2
              id="final-title"
              className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Tu jardín empieza hoy
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">
              Un bloque de foco es suficiente para plantar la primera semilla.
            </p>
            <Link
              href="/login"
              className={`${pill} mt-6 bg-background text-leaf-strong hover:bg-white`}
            >
              Crear mi cuenta gratis
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-center text-sm text-muted sm:px-6">
        Focus Garden · Hecho para estudiar con calma.
      </footer>
    </div>
  );
}
