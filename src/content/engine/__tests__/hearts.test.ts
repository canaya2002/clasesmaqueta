import { describe, expect, it } from 'vitest';
import {
  MAX_OFFLINE_MS,
  elapsedFor,
  initialHearts,
  msUntilNextHeart,
  reduceHearts,
  type ClockSample,
  type HeartsConfig,
  type HeartsRecord,
} from '../hearts';
import { resolveHearts, type HeartsInput } from '../runtime';

const CFG: HeartsConfig = { maxHearts: 5, refillMs: 1_800_000, maxUntrustedGrant: 1 };
const T0 = 1_700_000_000_000;

const S0: ClockSample = { realMs: T0, monoMs: 10_000, monoEpochId: 'e1' };

function sample(over: Partial<ClockSample>): ClockSample {
  return { ...S0, ...over };
}

function rec(over: Partial<HeartsRecord>): HeartsRecord {
  return { ...initialHearts(S0, CFG), ...over };
}

describe('acumulación de corazones', () => {
  it('otorga un corazón por intervalo y CONSERVA el residuo', () => {
    const start = rec({ hearts: 0 });
    const s = sample({ realMs: T0 + 5_400_001, monoMs: 10_000 + 5_400_001 });
    const next = reduceHearts(start, { type: 'tick' }, s, CFG);

    expect(next.hearts).toBe(3);
    // 5_400_001 - 3 * 1_800_000 = 1 ms de residuo, no 0.
    expect(s.realMs - next.lastAccrualRealMs).toBe(1);
  });

  it('no otorga de más ni deja el sello atrás al llegar al máximo', () => {
    const start = rec({ hearts: 4 });
    const s = sample({ realMs: T0 + 10 * 1_800_000, monoMs: 10_000 + 10 * 1_800_000 });
    const next = reduceHearts(start, { type: 'tick' }, s, CFG);

    expect(next.hearts).toBe(5);
    // Con el contador lleno el sello se re-ancla: si no, la siguiente pérdida heredaría horas de banco.
    expect(next.lastAccrualRealMs).toBe(s.realMs);
    expect(next.untrustedGranted).toBe(0);
  });
});

describe('resistencia al reloj del sistema', () => {
  it('adelantar el reloj de pared 24 h NO regala corazones si la época monótona coincide', () => {
    const start = rec({ hearts: 0 });
    // Una hora de reloj monótono real, 24 h de reloj de pared movido a mano.
    const s = sample({ realMs: T0 + 86_400_000, monoMs: 10_000 + 3_600_000, monoEpochId: 'e1' });
    const next = reduceHearts(start, { type: 'tick' }, s, CFG);

    // 2 corazones: los que corresponden a la hora REAL transcurrida, no los 5 del reloj manipulado.
    expect(next.hearts).toBe(2);
  });

  it('mover el reloj hacia atrás no resta ni corrompe el sello', () => {
    const start = rec({ hearts: 2 });
    const s = sample({ realMs: T0 - 3_600_000, monoMs: 10_000 + 1000 });
    const next = reduceHearts(start, { type: 'tick' }, s, CFG);

    expect(next.hearts).toBe(2);
    expect(elapsedFor(next, s).ms).toBe(0);
  });

  it('sin señal monótona (recarga de página) el otorgamiento está TOPADO', () => {
    const start = rec({ hearts: 0, monoEpochId: 'e1' });
    // Época distinta: el documento se recargó. Aquí solo queda el reloj de pared.
    const s = sample({ realMs: T0 + 86_400_000, monoMs: 42, monoEpochId: 'e2' });
    const next = reduceHearts(start, { type: 'tick' }, s, CFG);

    // 24 h serían 48 recargas; el tope las deja en una. Adelantar el reloj y pulsar F5 cuesta una
    // recarga por corazón en vez de rellenar la barra.
    expect(next.hearts).toBe(1);
    expect(next.untrustedGranted).toBe(1);

    // Y el segundo intento por la misma vía ya no da nada.
    const again = reduceHearts(next, { type: 'tick' }, sample({ realMs: T0 + 172_800_000, monoMs: 43, monoEpochId: 'e3' }), CFG);
    expect(again.hearts).toBe(1);
  });

  it('el tiempo acreditable de una sola vez está topado a 24 h', () => {
    const start = rec({ hearts: 0, lastAccrualRealMs: T0 - 30 * 86_400_000, monoEpochId: 'x' });
    const s = sample({ monoEpochId: 'y' });
    expect(elapsedFor(start, s).ms).toBe(MAX_OFFLINE_MS);
  });
});

describe('orden de acumulación y consumo', () => {
  it('en el empate exacto acumula ANTES de consumir', () => {
    const start = rec({ hearts: 0 });
    const s = sample({ realMs: T0 + 1_800_000, monoMs: 10_000 + 1_800_000 });
    const next = reduceHearts(start, { type: 'spend' }, s, CFG);

    // Vence la recarga en el mismo instante en que falla: le queda 0, no -1, y sobre todo el resultado
    // no depende de qué evento se despachó primero.
    expect(next.hearts).toBe(0);
    expect(next.lastAccrualRealMs).toBe(s.realMs);
  });

  it('gastar desde lleno arranca el contador en ese instante', () => {
    const start = rec({ hearts: 5, lastAccrualRealMs: T0 - 10_000_000 });
    const next = reduceHearts(start, { type: 'spend' }, S0, CFG);
    expect(next.hearts).toBe(4);
    expect(msUntilNextHeart(next, S0, CFG)).toBe(CFG.refillMs);
  });

  it('el potenciador ilimitado no deja gastar y caduca contra el reloj de PARED', () => {
    const granted = reduceHearts(rec({ hearts: 3 }), { type: 'grantUnlimited', hours: 24 }, S0, CFG);
    expect(reduceHearts(granted, { type: 'spend' }, S0, CFG).hearts).toBe(3);

    const after = sample({ realMs: T0 + 25 * 3_600_000, monoMs: 10_000 + 25 * 3_600_000 });
    expect(reduceHearts(granted, { type: 'spend' }, after, CFG).hearts).toBe(4);
  });
});

describe('resolveHearts: una rama por interruptor', () => {
  const base: HeartsInput = {
    heartsSystemEnabled: true,
    maxHearts: 5,
    hostAllowsHearts: true,
    practiceOverride: false,
    unlimited: false,
    lessonHeartsEnabled: true,
    dynamicConsumesHearts: true,
  };

  it('config apagada esconde el contador', () => {
    expect(resolveHearts({ ...base, maxHearts: 0 })).toEqual({
      hud: 'hidden',
      consumes: false,
      reason: 'config-off',
      practiceBadge: false,
    });
  });

  it('el anfitrión manda por encima de todo lo demás', () => {
    expect(resolveHearts({ ...base, hostAllowsHearts: false, unlimited: true }).reason).toBe('host-off');
  });

  it('el modo práctica gana al potenciador', () => {
    const r = resolveHearts({ ...base, practiceOverride: true, unlimited: true });
    expect(r.reason).toBe('practice-override');
    expect(r.practiceBadge).toBe(true);
    expect(r.consumes).toBe(false);
  });

  it('el potenciador ENSEÑA el infinito en vez de esconder', () => {
    expect(resolveHearts({ ...base, unlimited: true })).toMatchObject({ hud: 'infinite', consumes: false });
  });

  it('la lección sin corazones esconde el contador', () => {
    expect(resolveHearts({ ...base, lessonHeartsEnabled: false })).toMatchObject({
      hud: 'hidden',
      reason: 'lesson-off',
    });
  });

  it('una dinámica que no castiga SIGUE mostrando el contador', () => {
    // La distinción que importa: el alumno tiene vidas en juego, este ejercicio no se las quita, y
    // esconderle el contador aquí lo dejaría sin saber cuántas le quedan.
    expect(resolveHearts({ ...base, dynamicConsumesHearts: false })).toMatchObject({
      hud: 'counter',
      consumes: false,
      reason: 'dynamic-off',
    });
  });

  it('el caso normal consume y muestra', () => {
    expect(resolveHearts(base)).toMatchObject({ hud: 'counter', consumes: true, reason: 'none' });
  });
});
