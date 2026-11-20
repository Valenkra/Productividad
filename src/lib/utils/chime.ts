/** Tono corto al terminar una fase. Silencioso si el navegador no tiene Web Audio. */
export function playChime(): void {
  const AudioCtx =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext);
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.setValueAtTime(880, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => void ctx.close();
    osc.start(t);
    osc.stop(t + 0.65);
  } catch {
    // Sin audio (p. ej. bloqueado por el navegador): no es crítico.
  }
}
