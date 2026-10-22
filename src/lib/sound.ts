// Tiny synthesized sound effects — no audio files to fetch or license,
// works fully offline. Only ever fired from a user-gesture handler
// (tapping "Сделано", claiming a reward, …), so browsers allow it.
//
// Several selectable "themes" (Settings → Звук) reuse the same event
// shapes (complete/badge/reward/…) with a different instrument + note
// palette each, so switching themes changes every celebratory sound in
// the app at once. "alarm" is the one deliberately unpleasant exception,
// played when someone's about to refuse a task — themes still vary its
// pitch so it isn't identical everywhere, but it's dissonant on purpose.

export type SoundName = "complete" | "badge" | "reward" | "tap" | "created" | "preview" | "alarm" | "urgentAlarm";
export type SoundTheme = "punk" | "synthwave" | "arcade" | "lofi" | "meow" | "glass";

export const DEFAULT_SOUND_THEME: SoundTheme = "punk";

export const SOUND_THEMES: { id: SoundTheme; label: string; emoji: string }[] = [
  { id: "punk", label: "Панк-гитара", emoji: "🎸" },
  { id: "synthwave", label: "Синтвейв", emoji: "🌆" },
  { id: "arcade", label: "Аркада", emoji: "👾" },
  { id: "lofi", label: "Лоу-фай", emoji: "📻" },
  { id: "meow", label: "Мяу", emoji: "🐈‍⬛" },
  { id: "glass", label: "Хрусталь", emoji: "💎" },
];

/** Phones that picked one of the old themes (xylophone, 8-bit, …) fall back to the default. */
export function normalizeSoundTheme(theme: string | undefined | null): SoundTheme {
  return SOUND_THEMES.some((t) => t.id === theme) ? (theme as SoundTheme) : DEFAULT_SOUND_THEME;
}

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface VoiceOpts {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  detune?: number; // cents
  glide?: number[]; // pitch multipliers spread evenly across the note
  filter?: { type: BiquadFilterType; freq: number; q?: number; sweepTo?: number };
  distort?: number;
}

const curves = new Map<number, Float32Array>();
function distortionCurve(amount: number): Float32Array {
  let curve = curves.get(amount);
  if (!curve) {
    curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / curve.length - 1;
      curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }
    curves.set(amount, curve);
  }
  return curve;
}

// One synthesized note: oscillator → (distortion) → (filter) → envelope.
function voice(audioCtx: AudioContext, freq: number, startAt: number, duration: number, opts: VoiceOpts = {}) {
  const osc = audioCtx.createOscillator();
  osc.type = opts.type ?? "triangle";
  osc.frequency.setValueAtTime(freq, startAt);
  if (opts.detune) osc.detune.value = opts.detune;
  if (opts.glide?.length) {
    opts.glide.forEach((m, i) => {
      osc.frequency.linearRampToValueAtTime(freq * m, startAt + (duration * (i + 1)) / opts.glide!.length);
    });
  }

  let node: AudioNode = osc;
  if (opts.distort) {
    const shaper = audioCtx.createWaveShaper();
    shaper.curve = distortionCurve(opts.distort) as Float32Array<ArrayBuffer>;
    node = node.connect(shaper);
  }
  if (opts.filter) {
    const filter = audioCtx.createBiquadFilter();
    filter.type = opts.filter.type;
    filter.frequency.setValueAtTime(opts.filter.freq, startAt);
    if (opts.filter.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.filter.sweepTo, startAt + duration);
    filter.Q.value = opts.filter.q ?? 1;
    node = node.connect(filter);
  }

  const env = audioCtx.createGain();
  const peak = opts.gain ?? 0.15;
  const attack = opts.attack ?? 0.01;
  env.gain.setValueAtTime(0, startAt);
  env.gain.linearRampToValueAtTime(peak, startAt + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  node.connect(env).connect(audioCtx.destination);

  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

interface ThemeConfig {
  // Five ascending notes each theme draws its runs from.
  scale: [number, number, number, number, number];
  // Seconds between notes in a run (a meow needs more room than a blip).
  step: number;
  // How this theme plays one note.
  note: (audioCtx: AudioContext, freq: number, at: number, dur: number, gain: number) => void;
}

const THEME_CONFIG: Record<SoundTheme, ThemeConfig> = {
  // Distorted power chord: root + fifth + octave through an amp-like clip.
  punk: {
    scale: [164.81, 196, 220, 246.94, 329.63],
    step: 0.12,
    note: (a, f, at, dur, g) => {
      [1, 1.5, 2].forEach((m) =>
        voice(a, f * m, at, dur, { type: "sawtooth", gain: g * 0.35, distort: 60, filter: { type: "lowpass", freq: 2600, q: 0.7 } }),
      );
    },
  },
  // Two detuned saws with a filter opening up — an 80s synth pad.
  synthwave: {
    scale: [261.63, 329.63, 392, 493.88, 523.25],
    step: 0.1,
    note: (a, f, at, dur, g) => {
      [-14, 14].forEach((d) =>
        voice(a, f, at, dur * 1.4, { type: "sawtooth", gain: g * 0.45, detune: d, attack: 0.04, filter: { type: "lowpass", freq: 500, q: 6, sweepTo: 3200 } }),
      );
    },
  },
  // Square-wave blip that jumps up a fifth — the classic coin pickup.
  arcade: {
    scale: [523.25, 659.25, 783.99, 1046.5, 1318.5],
    step: 0.07,
    note: (a, f, at, dur, g) => voice(a, f, at, dur * 0.8, { type: "square", gain: g * 0.55, glide: [1.5, 1.5] }),
  },
  // Soft electric-piano: sine plus a quiet octave, warm low-pass.
  lofi: {
    scale: [349.23, 440, 523.25, 659.25, 698.46],
    step: 0.11,
    note: (a, f, at, dur, g) => {
      voice(a, f, at, dur * 1.6, { type: "sine", gain: g, attack: 0.015, filter: { type: "lowpass", freq: 1400 } });
      voice(a, f * 2, at, dur, { type: "triangle", gain: g * 0.18, detune: 7, filter: { type: "lowpass", freq: 1400 } });
    },
  },
  // A little synthesized "мяу": nasal saw through a vowel-ish band-pass,
  // pitch rising then falling.
  meow: {
    scale: [520, 580, 650, 730, 820],
    step: 0.24,
    note: (a, f, at, dur, g) =>
      voice(a, f * 0.75, at, Math.max(dur, 0.32), { type: "sawtooth", gain: g * 0.9, attack: 0.03, glide: [1.35, 1.25, 0.95], filter: { type: "bandpass", freq: 1300, q: 3.5, sweepTo: 900 } }),
  },
  // Crystal clink: sine with inharmonic partials that die off fast.
  glass: {
    scale: [1046.5, 1174.66, 1318.5, 1567.98, 2093],
    step: 0.08,
    note: (a, f, at, dur, g) => {
      voice(a, f, at, dur * 1.8, { type: "sine", gain: g * 0.7, attack: 0.002 });
      voice(a, f * 2.76, at, dur * 0.7, { type: "sine", gain: g * 0.25, attack: 0.002 });
      voice(a, f * 5.4, at, dur * 0.35, { type: "sine", gain: g * 0.12, attack: 0.002 });
    },
  },
};

function buildRecipes(cfg: ThemeConfig): Record<SoundName, (audioCtx: AudioContext) => void> {
  const [n1, n2, n3, n4, n5] = cfg.scale;
  const run = (audioCtx: AudioContext, notes: number[], dur: number, gain: number, offset = 0) => {
    const now = audioCtx.currentTime + offset;
    notes.forEach((f, i) => cfg.note(audioCtx, f, now + i * cfg.step, dur, gain));
  };
  return {
    tap: (a) => cfg.note(a, n1, a.currentTime, 0.07, 0.08),
    created: (a) => run(a, [n2, n4], 0.16, 0.12),
    complete: (a) => run(a, [n1, n2, n3], 0.24, 0.16),
    badge: (a) => run(a, [n1, n2, n3, n4], 0.28, 0.13),
    reward: (a) => {
      run(a, [n1, n2, n3, n4, n5], 0.32, 0.15);
      [n3, n5].forEach((f) => cfg.note(a, f, a.currentTime + cfg.step * 5 + 0.05, 0.6, 0.11));
    },
    preview: (a) => {
      run(a, [n1, n2, n3, n4, n5], 0.3, 0.13);
      cfg.note(a, n5 * 1.2, a.currentTime + cfg.step * 5 + 0.08, 0.5, 0.12);
    },
    // A clashing minor-second dyad, low and buzzy, repeated twice — meant
    // to feel like a warning, not a celebration.
    alarm: (a) => {
      const now = a.currentTime;
      const low = n1 * 0.45 < 80 ? n1 : n1 * 0.45;
      [0, 0.32].forEach((offset) => {
        voice(a, low, now + offset, 0.26, { type: "sawtooth", gain: 0.17 });
        voice(a, low * 1.06, now + offset, 0.26, { type: "sawtooth", gain: 0.14 });
      });
    },
    // A real alarm-clock buzzer: harsh square wave alternating two pitches
    // fast, always this loud and this annoying regardless of the chosen
    // theme — the "do it now" screen replays this on a loop for as long
    // as it stays open, by design, not just once.
    urgentAlarm: (a) => {
      const now = a.currentTime;
      for (let i = 0; i < 4; i++) {
        voice(a, i % 2 === 0 ? 1046.5 : 783.99, now + i * 0.14, 0.13, { type: "square", gain: 0.22 });
      }
    },
  };
}

const RECIPES: Record<SoundTheme, Record<SoundName, (audioCtx: AudioContext) => void>> = Object.fromEntries(
  (Object.keys(THEME_CONFIG) as SoundTheme[]).map((theme) => [theme, buildRecipes(THEME_CONFIG[theme])]),
) as Record<SoundTheme, Record<SoundName, (audioCtx: AudioContext) => void>>;

export function playSound(name: SoundName, enabled: boolean, theme: SoundTheme = DEFAULT_SOUND_THEME) {
  if (!enabled) return;
  const audioCtx = getContext();
  if (!audioCtx) return;
  const run = () => {
    try {
      RECIPES[normalizeSoundTheme(theme)][name](audioCtx);
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
