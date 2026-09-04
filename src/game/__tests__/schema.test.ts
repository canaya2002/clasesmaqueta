import { describe, expect, it } from 'vitest';
import { ledgerEventSchema } from '../schema';

/** El evento válido mínimo, del que salen todas las variaciones. */
const OK = {
  t: 'lesson-complete',
  seq: 0,
  atRealMs: 1_700_000_000_000,
  dayKey: '2026-03-10',
  lessonId: 'lsn_00000001',
  unitId: 'unt_00000001',
  difficulty: 3,
  xpUnitsMilli: 10_000,
  accuracyMilli: 900,
  weightTotal: 10,
  perfect: false,
  firstClear: true,
  paceBonusEarned: false,
  maxCombo: 5,
  elapsedMs: 120_000,
  gemsGranted: 0,
  countsForProgress: true,
};

describe('el ledger se PARSEA, no se castea', () => {
  it('acepta un evento bien formado y marca la clave de día', () => {
    const r = ledgerEventSchema.safeParse(OK);
    expect(r.success).toBe(true);
  });

  it('rechaza un número que llegaría como NaN al HUD', () => {
    // El caso real: en una maqueta cuyo argumento es que el estado se puede inspeccionar, alguien edita
    // localStorage en vivo. Un `xpUnitsMilli` no numérico produce un XP `NaN` que se propaga a todo el
    // HUD, al nivel y al anillo de progreso sin lanzar en ningún sitio.
    expect(ledgerEventSchema.safeParse({ ...OK, xpUnitsMilli: 'mucho' }).success).toBe(false);
    expect(ledgerEventSchema.safeParse({ ...OK, xpUnitsMilli: Number.NaN }).success).toBe(false);
    expect(ledgerEventSchema.safeParse({ ...OK, elapsedMs: Number.POSITIVE_INFINITY }).success).toBe(false);
  });

  it('rechaza una precisión fuera de rango', () => {
    expect(ledgerEventSchema.safeParse({ ...OK, accuracyMilli: 1001 }).success).toBe(false);
    expect(ledgerEventSchema.safeParse({ ...OK, accuracyMilli: -1 }).success).toBe(false);
  });

  it('rechaza una clave de día que no es una fecha', () => {
    expect(ledgerEventSchema.safeParse({ ...OK, dayKey: '10-03-2026' }).success).toBe(false);
  });

  it('la unión discriminada no deja mezclar campos de dos variantes', () => {
    // Con un `Omit` no distributivo sobre la unión, `{ t: 'chest-opened', pricePaid: 5 }` compilaría.
    expect(
      ledgerEventSchema.safeParse({ t: 'chest-opened', seq: 1, atRealMs: 1, dayKey: '2026-03-10', tier: 2 })
        .success,
    ).toBe(false);
  });
});
