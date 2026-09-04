import { describe, expect, it } from 'vitest';
import { CATALOG, VARIANT_NAMES, resolveVariant } from './motion';
import type { VariantSpec } from './motion';

describe('el catálogo respeta los límites del motor de animación', () => {
  /**
   * `motion` LANZA —no degrada— si una transición de muelle recibe más de dos fotogramas. El síntoma es una
   * excepción sin capturar en el frameloop y una animación que no ocurre; en producción se ve como un
   * elemento que no se mueve, sin nada en consola que lo explique. Esta prueba lo convierte en un fallo de
   * compilación práctica.
   */
  it('ninguna variante combina un muelle con tres o más fotogramas', () => {
    const offenders: string[] = [];

    for (const [name, spec] of Object.entries(CATALOG)) {
      for (const [stateName, state] of Object.entries(spec.full)) {
        if (state === null || typeof state !== 'object') continue;
        const entries: Record<string, unknown> = { ...state };
        const transition = entries['transition'];
        if (transition === null || typeof transition !== 'object') continue;
        const t: Record<string, unknown> = { ...transition };
        // Un muelle es explícito (`type: 'spring'`) o implícito (lleva `stiffness`/`damping`).
        const isSpring = t['type'] === 'spring' || 'stiffness' in t || 'damping' in t;
        if (!isSpring) continue;

        for (const [prop, value] of Object.entries(entries)) {
          if (prop === 'transition') continue;
          if (Array.isArray(value) && value.length > 2) {
            offenders.push(`${name}.${stateName}.${prop} (${String(value.length)} fotogramas)`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('el degradado por movimiento reducido', () => {
  /**
   * El invariante va en DOS direcciones, y esa es la corrección.
   *
   * `degradeState` conservaba solo `opacity`, así que toda variante definida con transformaciones se
   * degradaba a un objetivo VACÍO y sus dos estados quedaban idénticos. Para `feedbackCorrect`, cuyo
   * estado cerrado es `y: '110%'`, eso significa que **el panel de feedback se queda siempre visible**;
   * para `drawerRight`, que el cajón nunca se esconde; para `sectionFill`, que la sección nace llena.
   * Con movimiento reducido, "no animar" no puede convertirse en "no colocar".
   *
   * Pero colapsar tampoco es siempre un error: para un pulso de énfasis, que los dos estados queden
   * iguales ES la degradación correcta. Por eso el canal decide, y por eso se afirman las dos mitades: si
   * mañana alguien "arregla" el degradado conservando geometría en todas partes, `prefers-reduced-motion`
   * dejaría de quitar el énfasis y este test lo diría.
   */
  const GEOMETRY = ['x', 'y', 'scale', 'scaleX', 'scaleY'] as const;

  function shapes(name: (typeof VARIANT_NAMES)[number], only: 'all' | 'geometry'): readonly string[] {
    const degraded = resolveVariant(name, true);
    return Object.keys(degraded).map((state) => {
      const target: Record<string, unknown> = { ...degraded[state] };
      delete target['transition'];
      if (only === 'geometry') {
        const geo: Record<string, unknown> = {};
        for (const k of GEOMETRY) if (k in target) geo[k] = target[k];
        return JSON.stringify(geo);
      }
      return JSON.stringify(target);
    });
  }

  it('los canales que COLOCAN conservan estados distinguibles', () => {
    const offenders: string[] = [];
    for (const name of VARIANT_NAMES) {
      const channel = CATALOG[name].channel;
      if (channel !== 'entrance' && channel !== 'continuity') continue;
      const s = shapes(name, 'all');
      if (s.length >= 2 && new Set(s).size < s.length) offenders.push(`${name} (${channel})`);
    }
    expect(offenders).toEqual([]);
  });

  it('los canales que solo ENFATIZAN pierden el MOVIMIENTO, no la visibilidad', () => {
    // El matiz que hizo falta afinar: `pairSolved` atenúa a opacidad 0.25 y `stampIn` aparece con opacidad,
    // y las dos son `emphasis`. Esa diferencia de opacidad es INFORMACIÓN —el par está resuelto, el sello
    // está puesto— y tiene que sobrevivir. Lo que la preferencia quita es el desplazamiento y la escala.
    const stillMoving: string[] = [];
    for (const name of VARIANT_NAMES) {
      const spec: VariantSpec = CATALOG[name];
      if (spec.channel !== 'emphasis' && spec.channel !== 'ambient') continue;
      // Las que declaran un degradado a mano se saltan: su autor ya decidió qué conservar.
      if (spec.reduced !== undefined) continue;
      const s = shapes(name, 'geometry');
      if (s.length >= 2 && new Set(s).size > 1) stillMoving.push(`${name} (${spec.channel})`);
    }
    expect(stillMoving).toEqual([]);
  });
});
