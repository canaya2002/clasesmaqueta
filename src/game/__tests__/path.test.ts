import { describe, expect, it } from 'vitest';
import { pathStates, type PathUnitInput } from '../path';

const UNITS: readonly PathUnitInput[] = [
  { unitId: 'u1', lessonIds: ['a1', 'a2', 'a3'], prerequisites: [] },
  { unitId: 'u2', lessonIds: ['b1', 'b2'], prerequisites: ['u1'] },
  { unitId: 'u3', lessonIds: ['c1'], prerequisites: ['u1', 'u2'] },
];

describe('el camino', () => {
  it('sin historia, solo la primera lección está abierta', () => {
    const r = pathStates(UNITS, new Set(), new Set());
    expect(r.lessonState.get('a1')).toBe('current');
    expect(r.lessonState.get('a2')).toBe('locked');
    expect(r.lessonState.get('b1')).toBe('locked');
    expect(r.currentLessonId).toBe('a1');
  });

  it('hay exactamente UN nodo actual en todo el catálogo', () => {
    // Marcar la primera disponible de cada unidad desbloqueada da varias banderas a la vez y ninguna dice
    // a dónde ir; el botón grande del HUD necesita un destino, no cinco.
    const r = pathStates(UNITS, new Set(['a1', 'a2', 'a3']), new Set(['u1']));
    const currents = [...r.lessonState.values()].filter((s) => s === 'current');
    expect(currents).toHaveLength(1);
    expect(r.currentLessonId).toBe('b1');
  });

  it('entre unidades manda el grafo, no el orden', () => {
    // u3 exige u1 Y u2. Con u1 completa y u2 a medias sigue cerrada, aunque esté "después".
    const r = pathStates(UNITS, new Set(['a1', 'a2', 'a3', 'b1']), new Set(['u1']));
    expect(r.unitUnlocked.has('u2')).toBe(true);
    expect(r.unitUnlocked.has('u3')).toBe(false);
    expect(r.lessonState.get('c1')).toBe('locked');
  });

  it('una lección superada fuera de orden no abre las anteriores', () => {
    // Puede pasar con un test-out o con contenido reordenado desde el Studio: la lección 3 aparece hecha
    // y la 2 no. La 2 sigue siendo la actual; la 3 se queda como hecha.
    const r = pathStates(UNITS, new Set(['a1', 'a3']), new Set());
    expect(r.lessonState.get('a2')).toBe('current');
    expect(r.lessonState.get('a3')).toBe('done');
  });

  it('con todo completo no hay nodo actual', () => {
    const r = pathStates(UNITS, new Set(['a1', 'a2', 'a3', 'b1', 'b2', 'c1']), new Set(['u1', 'u2', 'u3']));
    expect(r.currentLessonId).toBeNull();
  });
});
