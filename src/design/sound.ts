/**
 * SENDA — vocabulario de sonido.
 *
 * Los ocho identificadores de la especificación viven AQUÍ, no en el contrato de dinámicas: el motor de
 * plugins importa este tipo en vez de redefinirlo. Una versión anterior del diseño declaró la unión con
 * cinco miembros, y los tres que faltaban (`levelUp`, `chestOpen`, `streakFire`) eran justamente los de
 * las tres cinemáticas de pantalla completa, o sea los que se oyen en la demo.
 *
 * Cero archivos de audio: todo se sintetiza con osciladores y envolventes.
 */

export type SfxId =
  | 'correct'
  | 'wrong'
  | 'combo'
  | 'levelUp'
  | 'chestOpen'
  | 'tap'
  | 'whoosh'
  | 'streakFire';

/**
 * El combo sube por una PENTATÓNICA MAYOR DE RE, no por semitonos.
 *
 * D5 E5 G5 A5 B5 D6 E6 G6. El default (`freq * 2^(combo/12)`) es una cromática ascendente: barata de
 * escribir, desagradable a partir del quinto acierto y —lo que importa— DISONANTE contra el cue de acierto
 * que todavía está sonando. La decisión no es "que suba de tono", es que el combo esté armónicamente ligado
 * al sonido de correcto.
 */
export const COMBO_SCALE: readonly number[] = [
  587.33, 659.25, 783.99, 880.0, 987.77, 1174.66, 1318.51, 1567.98,
];

/** A partir de aquí el tono se mantiene y solo sube la ganancia y se abre el filtro: modo "en llamas". */
export const COMBO_BLAZE_AT = 5;
export const COMBO_CEILING = 8;

export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface Envelope {
  readonly attack: number;
  readonly decay: number;
  readonly sustain: number;
  readonly release: number;
}

export interface ToneLayer {
  readonly wave: Waveform;
  readonly freq: number;
  /** Destino del glide, si el tono se desliza. */
  readonly toFreq: number | null;
  readonly gain: number;
  readonly delay: number;
  readonly detuneCents: number;
}

export interface NoiseLayer {
  readonly gain: number;
  readonly delay: number;
  readonly filter: 'lowpass' | 'highpass' | 'bandpass';
  readonly freq: number;
  readonly toFreq: number | null;
  readonly q: number;
}

export interface SfxSpec {
  readonly id: SfxId;
  readonly durationMs: number;
  readonly env: Envelope;
  readonly tones: readonly ToneLayer[];
  readonly noise: readonly NoiseLayer[];
  readonly filter: { readonly kind: 'lowpass' | 'highpass'; readonly freq: number } | null;
  /** Voces que consume. El techo del bus es 8. */
  readonly cost: number;
  /** 3 = nunca se descarta (feedback pedagógico y cinemáticas). 1 = adorno. */
  readonly priority: 1 | 2 | 3;
  /** Ventana mínima entre dos disparos del mismo id, en ms. */
  readonly throttleMs: number;
}

const tone = (
  wave: Waveform,
  freq: number,
  gain: number,
  opts?: { readonly toFreq?: number; readonly delay?: number; readonly detuneCents?: number },
): ToneLayer => ({
  wave,
  freq,
  toFreq: opts?.toFreq ?? null,
  gain,
  delay: opts?.delay ?? 0,
  detuneCents: opts?.detuneCents ?? 0,
});

export const SFX: Readonly<Record<SfxId, SfxSpec>> = {
  /** Tercera mayor de Re, cálida y corta. Es el sonido que el alumno va a oír 2,100 veces. */
  correct: {
    id: 'correct',
    durationMs: 200,
    env: { attack: 0.004, decay: 0.07, sustain: 0.25, release: 0.11 },
    tones: [
      tone('triangle', 587.33, 0.5),
      tone('triangle', 739.99, 0.34, { delay: 0.018 }),
      tone('sine', 1174.66, 0.12, { delay: 0.03 }),
    ],
    noise: [],
    filter: { kind: 'lowpass', freq: 5200 },
    cost: 3,
    priority: 3,
    throttleMs: 60,
  },
  /** Descenso corto con filtro cerrado. No es un buzzer: es un "no" seco, sin agresión. */
  wrong: {
    id: 'wrong',
    durationMs: 280,
    env: { attack: 0.006, decay: 0.1, sustain: 0.3, release: 0.16 },
    tones: [
      tone('sawtooth', 220, 0.34, { toFreq: 164.81 }),
      tone('sine', 110, 0.2, { toFreq: 82.4 }),
    ],
    noise: [],
    filter: { kind: 'lowpass', freq: 1400 },
    cost: 2,
    priority: 3,
    throttleMs: 90,
  },
  /** El tono real lo pone COMBO_SCALE en tiempo de disparo; aquí vive el timbre. */
  combo: {
    id: 'combo',
    durationMs: 150,
    env: { attack: 0.003, decay: 0.05, sustain: 0.2, release: 0.09 },
    tones: [tone('square', 587.33, 0.16), tone('sine', 1174.66, 0.1, { delay: 0.012 })],
    noise: [],
    filter: { kind: 'highpass', freq: 400 },
    cost: 2,
    priority: 2,
    throttleMs: 70,
  },
  /** Arpegio de cuatro notas sobre la misma pentatónica: la subida de nivel suena a la familia del combo. */
  levelUp: {
    id: 'levelUp',
    durationMs: 900,
    env: { attack: 0.005, decay: 0.14, sustain: 0.4, release: 0.3 },
    tones: [
      tone('triangle', 587.33, 0.4),
      tone('triangle', 739.99, 0.4, { delay: 0.09 }),
      tone('triangle', 880.0, 0.4, { delay: 0.18 }),
      tone('triangle', 1174.66, 0.46, { delay: 0.27 }),
      tone('sine', 293.66, 0.22, { delay: 0.27 }),
    ],
    noise: [],
    filter: { kind: 'lowpass', freq: 6500 },
    cost: 4,
    priority: 3,
    throttleMs: 1500,
  },
  /** Barrido ascendente con ruido: la tapa que cede. */
  chestOpen: {
    id: 'chestOpen',
    durationMs: 620,
    env: { attack: 0.01, decay: 0.12, sustain: 0.45, release: 0.24 },
    tones: [tone('sine', 200, 0.3, { toFreq: 900 }), tone('triangle', 400, 0.18, { toFreq: 1800, delay: 0.05 })],
    noise: [{ gain: 0.2, delay: 0, filter: 'bandpass', freq: 900, toFreq: 3200, q: 1.1 }],
    filter: null,
    cost: 3,
    priority: 3,
    throttleMs: 300,
  },
  /** 40ms. Se dispara cientos de veces por sesión, así que es lo más barato del bus. */
  tap: {
    id: 'tap',
    durationMs: 45,
    env: { attack: 0.002, decay: 0.02, sustain: 0.1, release: 0.02 },
    tones: [tone('sine', 660, 0.16)],
    noise: [],
    filter: null,
    cost: 1,
    priority: 1,
    throttleMs: 45,
  },
  /** Solo ruido filtrado en movimiento: transición, no nota. */
  whoosh: {
    id: 'whoosh',
    durationMs: 240,
    env: { attack: 0.02, decay: 0.06, sustain: 0.5, release: 0.14 },
    tones: [],
    noise: [{ gain: 0.22, delay: 0, filter: 'bandpass', freq: 400, toFreq: 2000, q: 0.9 }],
    filter: null,
    cost: 1,
    priority: 1,
    throttleMs: 80,
  },
  /** Crepitación: ruido de banda estrecha con un tono grave debajo. */
  streakFire: {
    id: 'streakFire',
    durationMs: 700,
    env: { attack: 0.03, decay: 0.1, sustain: 0.55, release: 0.28 },
    tones: [tone('sine', 90, 0.16, { toFreq: 70 })],
    noise: [{ gain: 0.18, delay: 0, filter: 'bandpass', freq: 1600, toFreq: 700, q: 2.2 }],
    filter: null,
    cost: 2,
    priority: 2,
    throttleMs: 400,
  },
};

/** Techo de voces simultáneas. Al desbordar se roba la más antigua de prioridad menor que 3. */
export const MAX_VOICES = 8;
