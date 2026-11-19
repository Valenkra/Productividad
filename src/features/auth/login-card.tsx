import Link from "next/link";
import { PlantIllustration } from "@/features/garden/plant-illustration";

const pill =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-strong";

/**
 * Pantalla de acceso. El inicio de sesión con Google llega con Supabase Auth (Fase 2); hasta
 * entonces el botón está deshabilitado y se explica sin disimular.
 */
export function LoginCard() {
  return (
    <main className="hero-glow grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm rounded-[2rem] border border-border bg-surface p-8 text-center shadow-[0_24px_60px_-24px_rgba(58,95,55,0.45)]">
        <div className="flex justify-center">
          <PlantIllustration stage={1} size={96} />
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
          Entrá a tu jardín
        </h1>
        <p className="mt-2 text-sm text-muted">
          Con una cuenta, tu planta y tu historial te siguen a cualquier dispositivo.
        </p>

        <button
          type="button"
          disabled
          className={`${pill} mt-6 border border-border bg-background text-muted disabled:cursor-not-allowed`}
        >
          Continuar con Google
        </button>
        <p className="mt-2 text-xs text-muted">
          El inicio de sesión se activa en la próxima etapa del proyecto.
        </p>

        <div className="my-6 h-px bg-border" />

        <Link
          href="/dashboard"
          className={`${pill} bg-leaf-strong text-white hover:bg-leaf`}
        >
          Probar la app sin cuenta
        </Link>
        <p className="mt-2 text-xs text-muted">
          En esta versión de prueba tu progreso no se guarda de forma permanente.
        </p>

        <Link href="/" className="mt-6 inline-block text-sm text-leaf-strong underline">
          Volver a la portada
        </Link>
      </div>
    </main>
  );
}
