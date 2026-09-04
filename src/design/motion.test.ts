import { describe, expect, it } from 'vitest';
import { CATALOG } from './motion';

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
