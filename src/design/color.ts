/**
 * Matemática de color de SENDA. Cero dependencias, a propósito.
 *
 * Por qué no `chroma-js` ni `culori`: la función objetivo de este archivo NO es "oscurecer un color", es
 * "encontrar la luminosidad que alcanza un contraste dado". `darken()` opera con un paso fijo y no garantiza
 * contraste; el algoritmo correcto es una búsqueda binaria sobre L, y no existe en ninguna librería como tal.
 *
 * Por qué OKLCH y no HSL: en HSL bajar la L de un amarillo saturado lo vuelve verde oliva, y el paso -700
 * perdería el matiz del cliente en el white-label. OKLCH conserva el tono.
 *
 * Matrices de Björn Ottosson (https://bottosson.github.io/posts/oklab/).
 */

export interface Rgb {
  readonly r: number; // 0..255, entero
  readonly g: number;
  readonly b: number;
}

export interface LinearRgb {
  readonly r: number; // 0..1, lineal
  readonly g: number;
  readonly b: number;
}

export interface Oklch {
  readonly l: number; // 0..1
  readonly c: number; // 0..~0.4
  readonly h: number; // grados, 0..360
}

/* ------------------------------------------------------------------ sRGB */

export function parseHex(hex: string): Rgb {
  const clean = hex.trim().replace(/^#/, '');
  const full =
    clean.length === 3
      ? `${clean[0] ?? '0'}${clean[0] ?? '0'}${clean[1] ?? '0'}${clean[1] ?? '0'}${clean[2] ?? '0'}${clean[2] ?? '0'}`
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Hex inválido: ${hex}`);
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

export function toHex(rgb: Rgb): string {
  const part = (n: number): string =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`.toUpperCase();
}

/** Transferencia sRGB inversa: gamma -> lineal. */
function srgbToLinearChannel(c255: number): number {
  const c = c255 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Transferencia sRGB: lineal -> gamma. */
function linearToSrgbChannel(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return v * 255;
}

export function srgbToLinear(rgb: Rgb): LinearRgb {
  return {
    r: srgbToLinearChannel(rgb.r),
    g: srgbToLinearChannel(rgb.g),
    b: srgbToLinearChannel(rgb.b),
  };
}

export function linearToSrgb(lin: LinearRgb): Rgb {
  return {
    r: linearToSrgbChannel(lin.r),
    g: linearToSrgbChannel(lin.g),
    b: linearToSrgbChannel(lin.b),
  };
}

/* ---------------------------------------------------------------- OKLab */

function linearToOklab(lin: LinearRgb): { readonly l: number; readonly a: number; readonly b: number } {
  const lms0 = 0.4122214708 * lin.r + 0.5363325363 * lin.g + 0.0514459929 * lin.b;
  const lms1 = 0.2119034982 * lin.r + 0.6806995451 * lin.g + 0.1073969566 * lin.b;
  const lms2 = 0.0883024619 * lin.r + 0.2817188376 * lin.g + 0.6299787005 * lin.b;
  const l_ = Math.cbrt(lms0);
  const m_ = Math.cbrt(lms1);
  const s_ = Math.cbrt(lms2);
  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToLinear(lab: { readonly l: number; readonly a: number; readonly b: number }): LinearRgb {
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

const DEG = 180 / Math.PI;

export function hexToOklch(hex: string): Oklch {
  const lab = linearToOklab(srgbToLinear(parseHex(hex)));
  const h = Math.atan2(lab.b, lab.a) * DEG;
  return { l: lab.l, c: Math.hypot(lab.a, lab.b), h: h < 0 ? h + 360 : h };
}

function oklchToLinear(lch: Oklch): LinearRgb {
  const rad = lch.h / DEG;
  return oklabToLinear({ l: lch.l, a: Math.cos(rad) * lch.c, b: Math.sin(rad) * lch.c });
}

function inGamut(lin: LinearRgb): boolean {
  const eps = 1e-6;
  return (
    lin.r >= -eps && lin.r <= 1 + eps && lin.g >= -eps && lin.g <= 1 + eps && lin.b >= -eps && lin.b <= 1 + eps
  );
}

/**
 * Recorta al gamut sRGB por búsqueda binaria sobre el CROMA, conservando L y H.
 * Recortar por canal (clamp) desplazaría el tono; bajar el croma no.
 */
export function clampToSrgbGamut(lch: Oklch): Oklch {
  if (inGamut(oklchToLinear(lch))) return lch;
  let lo = 0;
  let hi = lch.c;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear({ ...lch, c: mid }))) lo = mid;
    else hi = mid;
    if (hi - lo < 0.0005) break;
  }
  return { ...lch, c: lo };
}

export function oklchToHex(lch: Oklch): string {
  const clamped = clampToSrgbGamut(lch);
  const lin = oklchToLinear(clamped);
  return toHex(
    linearToSrgb({
      r: Math.max(0, Math.min(1, lin.r)),
      g: Math.max(0, Math.min(1, lin.g)),
      b: Math.max(0, Math.min(1, lin.b)),
    }),
  );
}

/* ------------------------------------------------------------ Contraste */

/** Luminancia relativa de WCAG 2.1 §Relative luminance. */
export function relativeLuminance(hex: string): number {
  const lin = srgbToLinear(parseHex(hex));
  return 0.2126 * lin.r + 0.7152 * lin.g + 0.0722 * lin.b;
}

/** Razón de contraste de WCAG 2.1. Devuelve un valor en [1, 21]. */
export function contrast(a: string, b: string): number {
  const ya = relativeLuminance(a);
  const yb = relativeLuminance(b);
  const hi = Math.max(ya, yb);
  const lo = Math.min(ya, yb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Redondea hacia abajo a 2 decimales: nunca queremos reportar 4.4996 como 4.50. */
export function contrastFloor2(a: string, b: string): number {
  return Math.floor(contrast(a, b) * 100) / 100;
}

/**
 * Elige el color de texto sobre un relleno.
 * NO es `luminancia > 0.5`: es cuál de los dos candidatos gana en contraste medido.
 */
export function pickOnColor(
  fill: string,
  light: string,
  dark: string,
): { readonly hex: string; readonly ratio: number; readonly which: 'light' | 'dark' } {
  const cl = contrast(fill, light);
  const cd = contrast(fill, dark);
  return cl >= cd
    ? { hex: light, ratio: cl, which: 'light' }
    : { hex: dark, ratio: cd, which: 'dark' };
}

/* --------------------------------------------------- Búsqueda sobre L */

export type LightnessPreference = 'lightest' | 'darkest';

/**
 * Encuentra la L extrema que satisface un predicado monótono, conservando H y C.
 *
 * Asume monotonicidad del predicado en L, que es cierta para todos los objetivos de contraste que usamos
 * (el contraste contra blanco crece al bajar L; contra un papel oscuro, crece al subirla).
 * Devuelve `null` si el predicado no se satisface en ningún punto del rango.
 */
export function solveLightness(opts: {
  readonly hue: number;
  readonly chroma: number;
  readonly satisfies: (hex: string) => boolean;
  readonly prefer: LightnessPreference;
}): string | null {
  const at = (l: number): string => oklchToHex({ l, c: opts.chroma, h: opts.hue });

  // Barrido grueso para localizar la frontera sin asumir dónde está.
  const STEPS = 200;
  let firstOk = -1;
  let lastOk = -1;
  for (let i = 0; i <= STEPS; i += 1) {
    if (opts.satisfies(at(i / STEPS))) {
      if (firstOk < 0) firstOk = i;
      lastOk = i;
    }
  }
  if (firstOk < 0) return null;

  // Refinamiento binario sobre la frontera del lado que interesa.
  if (opts.prefer === 'lightest') {
    let ok = lastOk / STEPS;
    let bad = Math.min(1, (lastOk + 1) / STEPS);
    if (lastOk === STEPS) return at(ok);
    for (let i = 0; i < 20; i += 1) {
      const mid = (ok + bad) / 2;
      if (opts.satisfies(at(mid))) ok = mid;
      else bad = mid;
    }
    return at(ok);
  }

  let ok = firstOk / STEPS;
  let bad = Math.max(0, (firstOk - 1) / STEPS);
  if (firstOk === 0) return at(ok);
  for (let i = 0; i < 20; i += 1) {
    const mid = (ok + bad) / 2;
    if (opts.satisfies(at(mid))) ok = mid;
    else bad = mid;
  }
  return at(ok);
}
