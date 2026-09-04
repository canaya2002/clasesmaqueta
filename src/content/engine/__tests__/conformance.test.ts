import { describe, expect, it } from 'vitest';
import '../../dynamics/index';
import { CONFORMANCE_CHECK_COUNT, checkDynamic } from '../conformance';
import { listDynamics } from '../registry';

const dynamics = listDynamics();

describe('arnés de conformidad', () => {
  it('hay al menos una dinámica registrada', () => {
    expect(dynamics.length).toBeGreaterThan(0);
  });

  // `describe.each` sobre el registro VIVO: el costo marginal de la dinámica 15 es cero, y ninguna puede
  // romperse en silencio para un tipo concreto.
  for (const dynamic of dynamics) {
    describe(dynamic.type, () => {
      const result = checkDynamic(dynamic);
      for (const c of result.checks) {
        it(`${c.id} · ${c.name}`, () => {
          expect(c.passed, c.detail).toBe(true);
        });
      }
      it('pasa las 16 comprobaciones', () => {
        expect(result.checks).toHaveLength(CONFORMANCE_CHECK_COUNT);
        expect(result.failed).toBe(0);
      });
    });
  }
});
