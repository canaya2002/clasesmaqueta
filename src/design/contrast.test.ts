import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrast, contrastFloor2, relativeLuminance } from './color.ts';
import {
  CONTRAST_CONTRACTS,
  FACE_SHADOW_PAIRS,
  FOCUS_RING_MIN,
  SHADOW_BAND,
  SHADOW_BAND_DARK,
  type Theme,
} from './contracts.ts';
import { deriveBrand } from './ramp.ts';
import { SURFACE, WHITE_LABEL_PROBES } from './palette.config.ts';

/**
 * El test lee `tokens.generated.css` en vez de importar constantes de TypeScript, a propósito:
 * verifica los valores que REALMENTE se envían al navegador. Si alguien edita el CSS generado a mano
 * (que el encabezado prohíbe) o si el generador cambia, esto lo caza.
 */
function readTokens(): { readonly light: ReadonlyMap<string, string>; readonly dark: ReadonlyMap<string, string> } {
  // `import.meta.url` bajo vitest no es un file:// URL, así que se resuelve desde la raíz del proyecto.
  const path = resolvePath(process.cwd(), 'src/design/tokens.generated.css');
  const raw = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  const block = (startPattern: RegExp): string => {
    const m = startPattern.exec(raw);
    if (m === null) return '';
    const from = m.index + m[0].length;
    const end = raw.indexOf('}', from);
    return end < 0 ? raw.slice(from) : raw.slice(from, end);
  };

  const parse = (body: string): Map<string, string> => {
    const out = new Map<string, string>();
    for (const decl of body.split(';')) {
      const m = /^\s*--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*$/.exec(decl);
      if (m !== null && m[1] !== undefined && m[2] !== undefined) out.set(m[1], m[2].toUpperCase());
    }
    return out;
  };

  const light = parse(block(/:root\s*\{/));
  const darkOnly = parse(block(/:root\[data-theme="dark"\]\s*\{/));
  const dark = new Map(light);
  for (const [k, v] of darkOnly) dark.set(k, v);
  return { light, dark };
}

const TOKENS = readTokens();

function resolve(ref: string, theme: Theme): string {
  if (ref.startsWith('#')) return ref.toUpperCase();
  const table = theme === 'light' ? TOKENS.light : TOKENS.dark;
  const hit = table.get(ref);
  if (hit !== undefined) return hit;
  throw new Error(`Token no encontrado en tokens.generated.css (${theme}): --${ref}`);
}

describe('tokens.generated.css se pudo leer', () => {
  it('declara los 7 escalones de las 7 familias más las superficies', () => {
    // 7 familias x 6 escalones + 7 sombras = 49, más 7 superficies de tema claro.
    expect(TOKENS.light.size).toBeGreaterThanOrEqual(56);
    expect(TOKENS.dark.get('paper')).toBe(SURFACE.dark.paper.toUpperCase());
    expect(TOKENS.light.get('paper')).toBe(SURFACE.light.paper.toUpperCase());
  });
});

describe('contratos de contraste (WCAG 2.1)', () => {
  for (const c of CONTRAST_CONTRACTS) {
    for (const theme of c.themes) {
      it(`${c.label} [${theme}]: ${c.fg} sobre ${c.bg} >= ${c.min}:1`, () => {
        const fg = resolve(c.fg, theme);
        const bg = resolve(c.bg, theme);
        const ratio = contrastFloor2(fg, bg);
        expect(
          ratio,
          `${c.fg} (${fg}) sobre ${c.bg} (${bg}) da ${ratio}:1, se exige ${c.min}:1`,
        ).toBeGreaterThanOrEqual(c.min);
      });
    }
  }
});

describe('la sombra sólida lee como profundidad, no como borde pegado', () => {
  for (const p of FACE_SHADOW_PAIRS) {
    it(`${p.variant}: separación cara/sombra dentro de [${SHADOW_BAND.min}, ${SHADOW_BAND.max}]`, () => {
      const sep = contrast(resolve(p.face, 'light'), resolve(p.shadow, 'light'));
      expect(sep).toBeGreaterThanOrEqual(SHADOW_BAND.min);
      expect(sep).toBeLessThanOrEqual(SHADOW_BAND.max);
    });

    it(`${p.variant}: la sombra es MÁS OSCURA que su cara`, () => {
      // `contrast()` es simétrico: sin esta aserción, el blanco satisface la separación mínima.
      // Es exactamente el bug que el generador tuvo antes de restringir la dirección.
      const face = resolve(p.face, 'light');
      const shadow = resolve(p.shadow, 'light');
      expect(relativeLuminance(shadow)).toBeLessThan(relativeLuminance(face));
    });

    it(`${p.variant}: en oscuro la separación sube a [${SHADOW_BAND_DARK.min}, ${SHADOW_BAND_DARK.max}]`, () => {
      const sep = contrast(resolve(p.face, 'dark'), resolve(p.shadow, 'dark'));
      expect(sep).toBeGreaterThanOrEqual(SHADOW_BAND_DARK.min);
      expect(sep).toBeLessThanOrEqual(SHADOW_BAND_DARK.max);
    });
  }
});

describe('el anillo de foco compuesto cumple 1.4.11 sobre cualquier superficie', () => {
  const inner = () => resolve('lime-500', 'light');
  const outer = () => resolve('ink-900', 'light');

  it('el núcleo lima por sí solo NO cumple sobre papel: por eso existe el casing', () => {
    expect(contrast(inner(), SURFACE.light.paper)).toBeLessThan(FOCUS_RING_MIN);
    expect(contrast(inner(), SURFACE.light.canvas)).toBeLessThan(FOCUS_RING_MIN);
  });

  it('para toda superficie posible, al menos uno de los dos tonos supera 3:1', () => {
    // Barrido exhaustivo del eje de luminancia: 1001 grises. El peor caso está en el cruce de las dos
    // curvas y es el número que hace del anillo un teorema en vez de una esperanza.
    let worst = Number.POSITIVE_INFINITY;
    let worstAt = 0;
    for (let i = 0; i <= 1000; i += 1) {
      const y = i / 1000;
      const ch = y <= 0.0031308 ? 12.92 * y : 1.055 * Math.pow(y, 1 / 2.4) - 0.055;
      const v = Math.max(0, Math.min(255, Math.round(ch * 255)));
      const surface = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
      const best = Math.max(contrast(inner(), surface), contrast(outer(), surface));
      if (best < worst) {
        worst = best;
        worstAt = y;
      }
    }
    expect(worst, `peor caso ${worst.toFixed(2)}:1 en Y≈${worstAt.toFixed(4)}`).toBeGreaterThanOrEqual(
      FOCUS_RING_MIN,
    );
  });

  it('el anillo no se deriva del color de marca en ningún caso', () => {
    // Si el anillo heredara la marca, heredaría también su fallo de contraste. Se comprueba con el
    // color de cliente más hostil del set: un amarillo puro.
    const brand = deriveBrand('#FFD400');
    expect(brand.ramp['600']).not.toBe(resolve('lime-500', 'light'));
    expect(contrast(resolve('lime-500', 'light'), resolve('ink-900', 'light'))).toBeGreaterThan(10);
  });
});

describe('white-label: cualquier hex de cliente produce una marca accesible', () => {
  for (const probe of WHITE_LABEL_PROBES) {
    it(`${probe}: el rótulo alcanza 4.5:1 y el CTA oscuro 3:1`, () => {
      const d = deriveBrand(probe);
      expect(d.onBrandRatio, `rótulo sobre ${d.ramp['600']}`).toBeGreaterThanOrEqual(4.5);
      expect(d.darkCtaRatio, `CTA oscuro paso -${d.darkCtaStep}`).toBeGreaterThanOrEqual(3);
    });

    it(`${probe}: la rampa derivada sostiene texto sobre papel en el -700`, () => {
      const d = deriveBrand(probe);
      expect(contrast(d.ramp['700'], SURFACE.light.paper)).toBeGreaterThanOrEqual(4.5);
    });

    it(`${probe}: la profundidad del botón queda resuelta (sombra en banda, o canto)`, () => {
      const d = deriveBrand(probe);
      if (d.shadow.strategy === 'darker') {
        expect(d.shadow.separation).toBeGreaterThanOrEqual(SHADOW_BAND.min);
        expect(d.shadow.separation).toBeLessThanOrEqual(SHADOW_BAND.max);
        expect(relativeLuminance(d.shadow.hex)).toBeLessThan(relativeLuminance(d.ramp['600']));
      } else {
        // Cara casi negra: no existe color más oscuro con la separación mínima. El botón comunica la
        // profundidad con un canto superior CLARO, y por eso el canto tiene que ser más claro que la cara.
        expect(relativeLuminance(d.shadow.hex)).toBeGreaterThan(relativeLuminance(d.ramp['600']));
        expect(d.shadow.separation).toBeGreaterThanOrEqual(1.4);
      }
    });
  }

  it('el color del cliente se CONSERVA salvo que ninguno de los dos rótulos pase', () => {
    // La decisión de producto: el hex del cliente es el dato inmutable y la variable libre es el texto.
    // Los pickers de marca hacen lo contrario y destruyen la marca del cliente.
    for (const probe of WHITE_LABEL_PROBES) {
      expect(deriveBrand(probe).seedPreserved, `${probe} debería conservarse`).toBe(true);
    }
  });

  it('un color de la BANDA MUERTA sí se ajusta, y lo reporta', () => {
    // La banda muerta es el rango de luminancia donde NI el blanco NI la tinta alcanzan 4.5:1:
    //   contra blanco < 4.5  →  Y > 0.1833
    //   contra tinta  < 4.5  →  Y < 0.2066
    // El hueco es real y estrecho. Se construye un gris dentro de él en vez de adivinar un hex:
    // #808080 (Y=0.2159) queda FUERA y sí sostiene tinta a 4.66:1, así que no servía como caso.
    const y = 0.195;
    const ch = 1.055 * Math.pow(y, 1 / 2.4) - 0.055;
    const v = Math.round(ch * 255);
    const deadBandGray = `#${v.toString(16).padStart(2, '0').repeat(3)}`;

    expect(contrast(deadBandGray, SURFACE.light.paper)).toBeLessThan(4.5);
    expect(contrast(deadBandGray, SURFACE.light.ink900)).toBeLessThan(4.5);

    const d = deriveBrand(deadBandGray);
    expect(d.onBrandRatio).toBeGreaterThanOrEqual(4.5);
    expect(d.seedPreserved).toBe(false);
    expect(Math.abs(d.adjustedDeltaL)).toBeGreaterThan(0);
  });
});
