// Tiny synthesized sound effects — no audio files to fetch or license,
// works fully offline. Only ever fired from a user-gesture handler
// (tapping "Сделано", claiming a reward, …), so browsers allow it, and
// only ever positive/celebratory sounds — see docs/ARCHITECTURE.md
// "Sound" for why refusals stay silent.

type SoundName = "complete" | "badge" | "reward" | "tap" | "created" | "preview";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  audioCtx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number } = {},
) {
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = opts.type ?? "triangle";
  osc.frequency.value = freq;

  const peak = opts.gain ?? 0.18;
  gainNode.gain.setValueAtTime(0, startAt);
  gainNode.gain.linearRampToValueAtTime(peak, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gainNode).connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

const RECIPES: Record<SoundName, (audioCtx: AudioContext) => void> = {
  tap: (audioCtx) => tone(audioCtx, 880, audioCtx.currentTime, 0.06, { gain: 0.08 }),
  complete: (audioCtx) => {
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => tone(audioCtx, f, now + i * 0.08, 0.22));
  },
  badge: (audioCtx) => {
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(audioCtx, f, now + i * 0.09, 0.28, { type: "square", gain: 0.1 }),
    );
  },
  reward: (audioCtx) => {
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone(audioCtx, f, now + i * 0.07, 0.35, { gain: 0.16 }),
    );
    [783.99, 1046.5].forEach((f) => tone(audioCtx, f, now + 0.42, 0.6, { type: "sine", gain: 0.12 }));
  },
  created: (audioCtx) => {
    const now = audioCtx.currentTime;
    [660, 990].forEach((f, i) => tone(audioCtx, f, now + i * 0.06, 0.15, { type: "square", gain: 0.09 }));
  },
  // A cheerful little "ta-da" xylophone run — used by the Settings preview
  // button so you can hear what the celebratory sounds are like on demand.
  preview: (audioCtx) => {
    const now = audioCtx.currentTime;
    [440, 554.37, 659.25, 880, 1108.73].forEach((f, i) =>
      tone(audioCtx, f, now + i * 0.09, 0.3, { type: "square", gain: 0.12 }),
    );
    tone(audioCtx, 1318.5, now + 0.55, 0.5, { type: "sine", gain: 0.14 });
  },
};

export function playSound(name: SoundName, enabled: boolean) {
  if (!enabled) return;
  const audioCtx = getContext();
  if (!audioCtx) return;
  try {
    RECIPES[name](audioCtx);
  } catch {
    // Audio is a nice-to-have; never let it break the app.
  }
}
