// Tiny synthesized sound effects — no audio files to fetch or license,
// works fully offline. Only ever fired from a user-gesture handler
// (tapping "Сделано", claiming a reward, …), so browsers allow it.
//
// Several selectable "themes" (Settings → Звук) reuse the same event
// shapes (complete/badge/reward/…) with a different waveform + note
// palette each, so switching themes changes every celebratory sound in
// the app at once. "alarm" is the one deliberately unpleasant exception,
// played when someone's about to refuse a task — themes still vary its
// pitch so it isn't identical everywhere, but it's dissonant on purpose.

export type SoundName = "complete" | "badge" | "reward" | "tap" | "created" | "preview" | "alarm" | "urgentAlarm";
export type SoundTheme = "xylophone" | "chiptune" | "bells" | "drums" | "space";

export const SOUND_THEMES: { id: SoundTheme; label: string; emoji: string }[] = [
  { id: "xylophone", label: "Ксилофон", emoji: "🎶" },
  { id: "chiptune", label: "8-бит", emoji: "🕹️" },
  { id: "bells", label: "Колокольчики", emoji: "🔔" },
  { id: "drums", label: "Барабаны", emoji: "🥁" },
  { id: "space", label: "Космос", emoji: "🚀" },
];

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

interface ThemeConfig {
  type: OscillatorType;
  // Five ascending notes each theme draws its runs from.
  scale: [number, number, number, number, number];
  gain: number;
}

const THEME_CONFIG: Record<SoundTheme, ThemeConfig> = {
  xylophone: { type: "triangle", scale: [523.25, 659.25, 783.99, 1046.5, 1318.5], gain: 0.16 },
  chiptune: { type: "square", scale: [440, 523.25, 659.25, 880, 1046.5], gain: 0.1 },
  bells: { type: "sine", scale: [659.25, 830.61, 987.77, 1318.5, 1568], gain: 0.14 },
  drums: { type: "sawtooth", scale: [130.81, 164.81, 196, 246.94, 329.63], gain: 0.2 },
  space: { type: "sine", scale: [392, 493.88, 587.33, 739.99, 987.77], gain: 0.13 },
};

function buildRecipes(cfg: ThemeConfig): Record<SoundName, (audioCtx: AudioContext) => void> {
  const [n1, n2, n3, n4, n5] = cfg.scale;
  return {
    tap: (audioCtx) => tone(audioCtx, n1, audioCtx.currentTime, 0.06, { type: cfg.type, gain: cfg.gain * 0.5 }),
    created: (audioCtx) => {
      const now = audioCtx.currentTime;
      [n2, n4].forEach((f, i) => tone(audioCtx, f, now + i * 0.06, 0.15, { type: cfg.type, gain: cfg.gain * 0.6 }));
    },
    complete: (audioCtx) => {
      const now = audioCtx.currentTime;
      [n1, n2, n3].forEach((f, i) => tone(audioCtx, f, now + i * 0.08, 0.22, { type: cfg.type, gain: cfg.gain }));
    },
    badge: (audioCtx) => {
      const now = audioCtx.currentTime;
      [n1, n2, n3, n4].forEach((f, i) => tone(audioCtx, f, now + i * 0.09, 0.28, { type: cfg.type, gain: cfg.gain * 0.7 }));
    },
    reward: (audioCtx) => {
      const now = audioCtx.currentTime;
      cfg.scale.forEach((f, i) => tone(audioCtx, f, now + i * 0.07, 0.35, { type: cfg.type, gain: cfg.gain }));
      [n3, n5].forEach((f) => tone(audioCtx, f, now + 0.42, 0.6, { type: "sine", gain: cfg.gain * 0.75 }));
    },
    preview: (audioCtx) => {
      const now = audioCtx.currentTime;
      cfg.scale.forEach((f, i) => tone(audioCtx, f, now + i * 0.09, 0.3, { type: cfg.type, gain: cfg.gain * 0.75 }));
      tone(audioCtx, n5 * 1.2, now + 0.55, 0.5, { type: "sine", gain: cfg.gain * 0.85 });
    },
    // A clashing minor-second dyad, low and buzzy, repeated twice — meant
    // to feel like a warning, not a celebration.
    alarm: (audioCtx) => {
      const now = audioCtx.currentTime;
      const low = n1 * 0.45;
      [0, 0.32].forEach((offset) => {
        tone(audioCtx, low, now + offset, 0.26, { type: "sawtooth", gain: cfg.gain * 1.1 });
        tone(audioCtx, low * 1.06, now + offset, 0.26, { type: "sawtooth", gain: cfg.gain * 0.9 });
      });
    },
    // A real alarm-clock buzzer: harsh square wave alternating two pitches
    // fast, always this loud and this annoying regardless of the chosen
    // theme — the "do it now" screen replays this on a loop for as long
    // as it stays open, by design, not just once.
    urgentAlarm: (audioCtx) => {
      const now = audioCtx.currentTime;
      const high = 1046.5;
      const low = 783.99;
      for (let i = 0; i < 4; i++) {
        tone(audioCtx, i % 2 === 0 ? high : low, now + i * 0.14, 0.13, { type: "square", gain: 0.22 });
      }
    },
  };
}

const RECIPES: Record<SoundTheme, Record<SoundName, (audioCtx: AudioContext) => void>> = Object.fromEntries(
  (Object.keys(THEME_CONFIG) as SoundTheme[]).map((theme) => [theme, buildRecipes(THEME_CONFIG[theme])]),
) as Record<SoundTheme, Record<SoundName, (audioCtx: AudioContext) => void>>;

export function playSound(name: SoundName, enabled: boolean, theme: SoundTheme = "xylophone") {
  if (!enabled) return;
  const audioCtx = getContext();
  if (!audioCtx) return;
  const run = () => {
    try {
      (RECIPES[theme] ?? RECIPES.xylophone)[name](audioCtx);
    } catch {
      // Audio is a nice-to-have; never let it break the app.
    }
  };
  // On iOS specifically, a context that's still suspended schedules
  // tones against a clock that isn't actually advancing — they get
  // silently dropped rather than played late. Two call sites (the
  // reminder screen's auto-playing alarms) create/touch the context
  // outside a tap, which is exactly what leaves it suspended; waiting
  // for resume() to actually finish before scheduling anything fixes
  // those without changing anything for the normal already-unlocked
  // case, where resume() on a running context resolves immediately.
  if (audioCtx.state === "suspended") {
    audioCtx.resume().then(run, () => {});
  } else {
    run();
  }
}
