import { describe, expect, it } from 'vitest';
import { MIN_STREAK_TO_CREDIT, placementResult } from '../placement';

const probe = (unitIndex: number, correct: boolean) => ({ unitIndex, correct });

describe('el test de nivel', () => {
  it('fallar la primera no acredita nada', () => {
    const r = placementResult([probe(0, false), probe(3, true), probe(6, true)], 26);
    expect(r.startUnitIndex).toBe(0);
    expect(r.reason).toBe('sin-credito');
  });

  it('un solo acierto no acredita: con cuatro opciones, adivinar una es el 25%', () => {
    const r = placementResult([probe(0, true), probe(3, false)], 26);
    expect(r.creditedUnits).toBe(0);
    expect(MIN_STREAK_TO_CREDIT).toBe(2);
  });

  it('solo cuenta la corrida INICIAL de aciertos', () => {
    // Acertar la unidad 9 después de fallar la 3 no demuestra dominio de las intermedias: significa que
    // esa pregunta era fácil o que se adivinó.
    const r = placementResult([probe(0, true), probe(3, false), probe(6, true), probe(9, true)], 26);
    expect(r.creditedUnits).toBe(0);
  });

  it('dos aciertos seguidos acreditan hasta la unidad probada, incluida', () => {
    const r = placementResult([probe(0, true), probe(3, true), probe(6, false)], 26);
    expect(r.creditedUnits).toBe(4);
    expect(r.startUnitIndex).toBe(4);
    expect(r.reason).toBe('credito-parcial');
  });

  it('nunca acredita más de la mitad del curso', () => {
    // Un test de cinco preguntas no puede certificar veintiséis unidades de cumplimiento.
    const r = placementResult([probe(0, true), probe(6, true), probe(12, true), probe(20, true)], 26);
    expect(r.creditedUnits).toBe(13);
    expect(r.reason).toBe('tope-alcanzado');
  });

  it('nunca coloca fuera del catálogo', () => {
    const r = placementResult([probe(0, true), probe(1, true)], 2);
    expect(r.startUnitIndex).toBeLessThan(2);
  });

  it('sin respuestas, empieza por el principio', () => {
    expect(placementResult([], 26).startUnitIndex).toBe(0);
  });
});
