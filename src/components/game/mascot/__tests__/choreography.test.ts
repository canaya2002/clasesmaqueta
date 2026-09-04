import { describe, expect, it } from 'vitest';
import { CHOREO, ORIGIN, POSE_STILL, PUPIL_MAX_UNITS } from '../choreography';
import { LAYER_IDS, type MascotState } from '../types';

const STATES: readonly MascotState[] = [
  'idle', 'think', 'correct', 'wrong', 'cheer', 'celebrate', 'sleep', 'encourage', 'surprise',
];

describe('el rig de Cuati', () => {
  it('los nueve estados tienen coreografía completa', () => {
    for (const state of STATES) {
      const c = CHOREO[state];
      expect(c, state).toBeDefined();
      for (const layer of LAYER_IDS) expect(c.layers[layer], `${state}.${layer}`).toBeDefined();
    }
    expect(Object.keys(CHOREO).sort()).toEqual([...STATES].sort());
  });

  it('cada capa tiene origen de transformación', () => {
    // Sin origen, `rotate` gira alrededor del centro de la caja y la cola sale del cuerpo.
    for (const layer of LAYER_IDS) expect(ORIGIN[layer], layer).toMatch(/px .*px/);
  });

  it('solo respiran los estados que deben', () => {
    // `idle` y `sleep` son los únicos con loop. Un gesto en bucle —un salto de acierto eterno— convierte
    // la reacción en decoración y agota la atención.
    const ambient = STATES.filter((s) => CHOREO[s].ambient);
    expect([...ambient].sort()).toEqual(['idle', 'sleep']);
  });

  it('celebrate es MAYOR que cheer', () => {
    // La escala de recompensa se aplana desde arriba: si cerrar una lección usa la animación grande,
    // subir de nivel deja de sentirse como algo.
    const amplitude = (s: MascotState): number =>
      LAYER_IDS.reduce((n, l) => {
        const k = CHOREO[s].layers[l];
        return n + Math.abs(k.rotate) + Math.abs(k.x) + Math.abs(k.y);
      }, 0);
    expect(amplitude('celebrate')).toBeGreaterThan(amplitude('cheer'));
  });

  it('la pose de movimiento reducido no está en reposo absoluto', () => {
    // Un rig congelado a cero lee como muerto: el 60% de la señal de "está vivo" vive en la respiración
    // que se acaba de apagar, así que la pose alterna tiene que compensarla.
    const moved = LAYER_IDS.filter((l) => {
      const k = POSE_STILL.layers[l];
      return k.rotate !== 0 || k.x !== 0 || k.y !== 0;
    });
    expect(moved.length).toBeGreaterThan(0);
    expect(POSE_STILL.ambient).toBe(false);
  });

  it('ningún estado deja las pupilas fuera de los ojos', () => {
    // El seguimiento del puntero SUMA sobre la pose, así que una pose que ya esté fuera del disco saca la
    // mirada de la cara en cuanto el ratón se mueve. Se compara contra la constante del rig, no contra un
    // literal repetido: si mañana el disco cambia, esta prueba cambia con él.
    for (const state of STATES) {
      const p = CHOREO[state].layers.pupils;
      expect(Math.hypot(p.x, p.y), state).toBeLessThanOrEqual(PUPIL_MAX_UNITS);
    }
  });
});
