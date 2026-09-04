/**
 * Derivación de rampas de color por objetivo de contraste.
 *
 * Este archivo es el que produce la paleta que se envía (vía `scripts/emit-tokens.mts`) Y el que resuelve
 * el color arbitrario que un cliente elige en /studio/branding. Es deliberadamente el MISMO código:
 * el white-label no es una ruta paralela que haya que verificar aparte, es la misma función con otra semilla.
 */

import { contrast, hexToOklch, oklchToHex, relativeLuminance, solveLightness } from './color.ts';
import {
  CHROMA_SCALE,
  DARK_FILL_MAX_CONTRAST,
  SURFACE,
  type FamilyConfig,
  type StepName,
} from './palette.config.ts';

export const STEPS: readonly StepName[] = ['300', '400', '500', '600', '700', '800'];

export type Ramp = Readonly<Record<StepName, string>>;

export interface StepResolution {
  readonly step: StepName;
  readonly hex: string;
  readonly source: 'pinned' | 'solved' | 'fallback';
  /** El número que el escalón promete, ya medido sobre el hex resultante. */
  readonly measured: number;
  readonly against: string;
}

interface Objective {
  readonly satisfies: (hex: string, faceHex: string) => boolean;
  readonly prefer: 'lightest' | 'darkest';
  readonly report: (hex: string, faceHex: string) => { readonly measured: number; readonly against: string };
}

const L = SURFACE.light;
const D = SURFACE.dark;

const OBJECTIVES: Readonly<Record<StepName, Objective>> = {
  // El tinte más colorido que aún sostiene texto tinta a 14:1.
  //
  // El umbral es 14 y no 7 por una razón medida: con 7:1 este objetivo y el de -400 son numéricamente
  // CASI EL MISMO, porque `ink-900` y el lienzo oscuro son los dos casi negros. Los dos escalones caían
  // en la misma luminancia y la rampa tenía dos pasos indistinguibles. Un tinte de verdad (el fondo de
  // un panel de acierto) vive cerca del blanco, y ahí es donde 14:1 lo pone.
  '300': {
    satisfies: (hex) => contrast(L.ink900, hex) >= 14,
    prefer: 'darkest',
    report: (hex) => ({ measured: contrast(L.ink900, hex), against: 'ink-900 encima' }),
  },
  // Texto sobre papel oscuro, con margen sobre AA.
  //
  // 7:1 y no 4.5:1 porque en OLED el texto fino a 4.5:1 es incómodo de leer, y porque el mínimo exacto
  // deja al escalón sin margen para el remapeo de tema.
  '400': {
    satisfies: (hex) => contrast(hex, D.paper) >= 7,
    prefer: 'darkest',
    report: (hex) => ({ measured: contrast(hex, D.paper), against: 'papel oscuro' }),
  },
  // Sin contrato. Solo se resuelve si la familia no fija su -500.
  '500': {
    satisfies: () => true,
    prefer: 'lightest',
    report: (hex) => ({ measured: contrast(hex, L.paper), against: 'papel (informativo)' }),
  },
  // El relleno MÁS CLARO que todavía acepta texto blanco.
  '600': {
    satisfies: (hex) => contrast(hex, L.paper) >= 4.5,
    prefer: 'lightest',
    report: (hex) => ({ measured: contrast(hex, L.paper), against: 'papel / texto blanco' }),
  },
  // Texto sobre papel claro, con margen sobre el mínimo de AA.
  '700': {
    satisfies: (hex) => contrast(hex, L.paper) >= 5.5,
    prefer: 'lightest',
    report: (hex) => ({ measured: contrast(hex, L.paper), against: 'papel' }),
  },
  // El escalón más oscuro: texto sobre tinte, y el extremo de la rampa.
  //
  // La sombra sólida NO vive aquí (ver `solveShadow`). Un intento anterior la puso en -800 y reveló por qué
  // no cabe: la sombra es una RELACIÓN con la cara del botón, y cada variante usa una cara distinta
  // (primary la -600, success la -500 de lima). Como escalón fijo de la familia, `-800` acababa siendo el
  // más oscuro para brand y un tono medio para lima, y encima rompía el orden de la rampa.
  '800': {
    satisfies: (hex) => contrast(hex, L.paper) >= 9,
    prefer: 'lightest',
    report: (hex) => ({ measured: contrast(hex, L.paper), against: 'papel' }),
  },
};

/** Resuelve una familia completa: respeta los escalones fijados y deriva el resto. */
export function resolveFamily(family: FamilyConfig): readonly StepResolution[] {
  const seedHex =
    family.seed.kind === 'hex'
      ? family.seed.hex
      : oklchToHex({ l: family.seed.l, c: family.seed.c, h: family.seed.h });
  const seed = hexToOklch(seedHex);

  const faceHex = family.pinned[family.faceStep] ?? seedHex;
  const out: StepResolution[] = [];

  for (const step of STEPS) {
    const pinned = family.pinned[step];
    const objective = OBJECTIVES[step];

    if (pinned !== undefined) {
      const r = objective.report(pinned, faceHex);
      out.push({ step, hex: pinned, source: 'pinned', measured: r.measured, against: r.against });
      continue;
    }

    // El -500 sin fijar se coloca en el punto medio de L entre -400 y -600.
    //
    // No tiene contrato de contraste, así que no hay objetivo que resolver; lo que sí debe cumplir es
    // quedar ORDENADO entre sus vecinos. Derivarlo con una ΔL adivinada sobre la cara lo hacía colisionar
    // con -400 en los tonos violetas.
    if (step === '500') {
      const prev = out.find((r) => r.step === '400');
      const nextObjective = OBJECTIVES['600'];
      const sixHex =
        family.pinned['600'] ??
        solveLightness({
          hue: seed.h,
          chroma: seed.c * CHROMA_SCALE['600'],
          satisfies: (h) => nextObjective.satisfies(h, faceHex),
          prefer: nextObjective.prefer,
        }) ??
        faceHex;
      const lHi = prev !== undefined ? hexToOklch(prev.hex).l : hexToOklch(faceHex).l + 0.1;
      const lLo = hexToOklch(sixHex).l;
      const hex = oklchToHex({ l: (lHi + lLo) / 2, c: seed.c, h: seed.h });
      const r = objective.report(hex, faceHex);
      out.push({ step, hex, source: 'solved', measured: r.measured, against: r.against });
      continue;
    }

    const solved = solveLightness({
      hue: seed.h,
      chroma: seed.c * CHROMA_SCALE[step],
      satisfies: (hex) => objective.satisfies(hex, faceHex),
      prefer: objective.prefer,
    });

    // Si el tono no admite el objetivo en ningún punto (pasa con amarillos muy saturados), se baja el
    // croma antes que rendirse: perder saturación es preferible a perder el contraste prometido.
    const hex =
      solved ??
      solveLightness({
        hue: seed.h,
        chroma: seed.c * CHROMA_SCALE[step] * 0.5,
        satisfies: (h) => objective.satisfies(h, faceHex),
        prefer: objective.prefer,
      }) ??
      (objective.prefer === 'lightest' ? L.ink900 : L.paper);

    const r = objective.report(hex, faceHex);
    out.push({
      step,
      hex,
      source: solved === null ? 'fallback' : 'solved',
      measured: r.measured,
      against: r.against,
    });
  }

  return out;
}

export function rampOf(family: FamilyConfig): Ramp {
  const resolved = resolveFamily(family);
  const partial: Partial<Record<StepName, string>> = {};
  for (const r of resolved) partial[r.step] = r.hex;
  return {
    '300': partial['300'] ?? L.paper,
    '400': partial['400'] ?? L.paper,
    '500': partial['500'] ?? L.paper,
    '600': partial['600'] ?? L.paper,
    '700': partial['700'] ?? L.paper,
    '800': partial['800'] ?? L.ink900,
  };
}

/**
 * La sombra sólida de una cara.
 *
 * `contrast()` es simétrico, así que "separación >= 1.9" la satisface también el blanco: sin la restricción
 * de dirección, el solver elegía #FFFFFF como sombra de un violeta oscuro. La sombra tiene que ser MÁS
 * OSCURA que su cara, y de las que cumplen la separación mínima queremos la más clara: la que cae dentro
 * de la banda [1.9, 2.7] y no más allá.
 *
 * En tema oscuro la separación objetivo sube (2.6 en vez de 1.9): mantener el valor claro daría una banda
 * más clara que el lienzo, que lee como halo y no como profundidad.
 *
 * Cuando la cara ya es casi negra —el caso del cliente que elige #111111 en /studio/branding— NO EXISTE
 * ningún color más oscuro con la separación mínima: haría falta una luminancia negativa. En vez de devolver
 * una sombra inservible en silencio, se declara `strategy: 'edge'` y el botón comunica la profundidad con
 * un canto superior claro, que es exactamente el recurso que ya usa el tema oscuro. El white-label degrada
 * en vez de producir un canto invisible.
 */
export type ShadowStrategy = 'darker' | 'edge';

export interface ShadowSolution {
  readonly hex: string;
  readonly separation: number;
  readonly strategy: ShadowStrategy;
}

export function solveShadow(faceHex: string, minSeparation: number): ShadowSolution {
  const face = hexToOklch(faceHex);
  const faceY = relativeLuminance(faceHex);
  const hex = solveLightness({
    hue: face.h,
    chroma: face.c * 1.05,
    satisfies: (candidate) =>
      relativeLuminance(candidate) < faceY && contrast(faceHex, candidate) >= minSeparation,
    prefer: 'lightest',
  });
  if (hex === null) {
    // Canto superior claro en vez de sombra inferior oscura.
    const edge = oklchToHex({ l: Math.min(1, face.l + 0.18), c: face.c * 0.9, h: face.h });
    return { hex: edge, separation: contrast(faceHex, edge), strategy: 'edge' };
  }
  return { hex, separation: contrast(faceHex, hex), strategy: 'darker' };
}

/**
 * Remapeo del relleno extenso en tema oscuro.
 *
 * `--lime-500` sobre el lienzo oscuro da 14.23:1 y deslumbra durante los transforms en OLED. Esto NO es
 * una elección de gusto: es el escalón más claro cuyo contraste contra el lienzo oscuro no pasa del umbral.
 * Devuelve `null` cuando la familia no deslumbra y no necesita override.
 */
export function darkFillOverride(fillHex: string): string | null {
  if (contrast(fillHex, D.canvas) <= DARK_FILL_MAX_CONTRAST) return null;
  const seed = hexToOklch(fillHex);
  return solveLightness({
    hue: seed.h,
    chroma: seed.c,
    satisfies: (hex) => contrast(hex, D.canvas) <= DARK_FILL_MAX_CONTRAST,
    prefer: 'lightest',
  });
}

/* ----------------------------------------------------------- White-label */

export interface BrandDerivation {
  readonly ramp: Ramp;
  /** Color del rótulo sobre `--bg-primary`, elegido por contraste medido, nunca por luminancia > 0.5. */
  readonly onBrand: string;
  readonly onBrandRatio: number;
  /** Relleno del CTA en tema oscuro: el primer escalón que alcanza 3:1 contra el papel oscuro. */
  readonly darkCtaStep: StepName;
  readonly darkCtaRatio: number;
  /** Cuánto hubo que mover el hex del cliente para cumplir AA. 0 = se conservó tal cual. */
  readonly adjustedDeltaL: number;
  readonly seedPreserved: boolean;
  /** Cómo comunica profundidad el botón con esta marca. `edge` cuando la cara ya es casi negra. */
  readonly shadow: ShadowSolution;
}

/**
 * Deriva la marca completa desde un hex arbitrario.
 *
 * La decisión de diseño que importa: **el color del cliente es el dato inmutable y la variable libre es el
 * TEXTO.** Los pickers de marca hacen lo contrario —fuerzan blanco y oscurecen el color hasta que pase—,
 * lo que destruye la marca del cliente. Aquí el hex se conserva siempre que sostenga *algún* texto a 4.5:1,
 * y solo si ninguno de los dos candidatos pasa se mueve la luminosidad.
 */
export function deriveBrand(seedHex: string): BrandDerivation {
  const seed = hexToOklch(seedHex);
  const white = L.paper;
  const ink = L.ink900;

  const holdsWhite = contrast(seedHex, white) >= 4.5;
  const holdsInk = contrast(seedHex, ink) >= 4.5;

  let faceHex = seedHex;
  let deltaL = 0;
  if (!holdsWhite && !holdsInk) {
    // Ninguno pasa: se empuja L hacia el lado más cercano en pasos de 0.02, máximo 20 veces.
    const towardDark = contrast(seedHex, white) >= contrast(seedHex, ink);
    for (let i = 1; i <= 20; i += 1) {
      const dl = towardDark ? -0.02 * i : 0.02 * i;
      const candidate = oklchToHex({ l: Math.max(0, Math.min(1, seed.l + dl)), c: seed.c, h: seed.h });
      if (contrast(candidate, white) >= 4.5 || contrast(candidate, ink) >= 4.5) {
        faceHex = candidate;
        deltaL = dl;
        break;
      }
    }
  }

  const family: FamilyConfig = {
    name: 'brand',
    pinned: { '600': faceHex },
    seed: { kind: 'hex', hex: faceHex },
    faceStep: '600',
    note: 'derivada en runtime',
  };
  const ramp = rampOf(family);

  const cWhite = contrast(faceHex, white);
  const cInk = contrast(faceHex, ink);
  const onBrand = cWhite >= cInk ? white : ink;
  const onBrandRatio = Math.max(cWhite, cInk);

  // El CTA oscuro no es el mismo escalón que el claro cuando el color del cliente es oscuro:
  // se busca el primer escalón que alcanza 3:1 contra el papel oscuro Y sostiene su propio texto.
  const order: readonly StepName[] = ['600', '500', '400', '300'];
  let darkCtaStep: StepName = '600';
  let darkCtaRatio = contrast(ramp['600'], D.paper);
  for (const step of order) {
    const hex = ramp[step];
    const vsPaper = contrast(hex, D.paper);
    const holds = Math.max(contrast(hex, white), contrast(hex, ink)) >= 4.5;
    if (vsPaper >= 3 && holds) {
      darkCtaStep = step;
      darkCtaRatio = vsPaper;
      break;
    }
  }

  return {
    ramp,
    onBrand,
    onBrandRatio,
    darkCtaStep,
    darkCtaRatio,
    adjustedDeltaL: deltaL,
    seedPreserved: deltaL === 0,
    shadow: solveShadow(ramp['600'], 1.9),
  };
}
