import { Dialog } from "@/components/ui/dialog";
import { btnPrimary, focusRing } from "@/components/ui/styles";

/** «¿Rendirte ahora?»: seguir reanuda; terminar cierra la sesión como abandonada. */
export function GiveUpDialog({
  stageName,
  onKeepGoing,
  onGiveUp,
}: {
  stageName: string;
  onKeepGoing: () => void;
  onGiveUp: () => void;
}) {
  return (
    <Dialog titleId="give-up-title">
      <h2 id="give-up-title" className="text-2xl font-semibold">
        ¿Rendirte ahora?
      </h2>
      <p className="mt-2 text-muted">
        {`Tu ${stageName.toLowerCase()} no llegará a florecer y no irá al jardín. Lo que estudiaste sigue contando para ti.`}
      </p>
      <button type="button" className={`${btnPrimary} mt-5 w-full`} onClick={onKeepGoing}>
        Seguir estudiando
      </button>
      <button
        type="button"
        className={`mt-3 min-h-11 w-full rounded-full font-semibold text-muted hover:text-foreground ${focusRing}`}
        onClick={onGiveUp}
      >
        Sí, terminar
      </button>
    </Dialog>
  );
}
