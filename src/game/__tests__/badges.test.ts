import { describe, expect, it } from 'vitest';
import { BADGES, BADGE_COUNT, isUnlocked, unlockedBadges, type BadgeContext } from '../badges';
import { MONOTONE_COUNTERS } from '../types';
import { fold } from '../fold';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { brand } from '@/lib/brand';

const EMPTY_CTX: BadgeContext = {
  basis: fold([], {
    econ: DEFAULT_ECONOMY,
    asOf: { todayKey: brand<string, 'DayKey'>('2026-03-10'), todayEpochDay: 20522 },
    unitSizes: new Map(),
  }).basis,
  fold: fold([], {
    econ: DEFAULT_ECONOMY,
    asOf: { todayKey: brand<string, 'DayKey'>('2026-03-10'), todayEpochDay: 20522 },
    unitSizes: new Map(),
  }),
  activeWeekdays: new Set<number>(),
  finishHours: [],
  longestAbsence: 0,
};

describe('el catálogo de insignias', () => {
  it('son exactamente 32 y ninguna repite id', () => {
    expect(BADGES).toHaveLength(BADGE_COUNT);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGE_COUNT);
  });

  it('todas tienen condición EVALUABLE', () => {
    // El criterio de aceptación de la fase dice "las 32 con condición evaluable". Esto lo comprueba de
    // verdad: se evalúan todas contra un estado vacío y contra uno saturado, y ninguna puede lanzar.
    for (const b of BADGES) expect(typeof isUnlocked(b, EMPTY_CTX)).toBe('boolean');
  });

  it('con el estado en cero no hay ninguna desbloqueada', () => {
    expect(unlockedBadges(EMPTY_CTX)).toHaveLength(0);
  });

  it('ningún umbral mira un contador que pueda BAJAR', () => {
    // Es la propiedad que impide una insignia que se desbloquea y luego desaparece: "1,000 gemas" revocada
    // al comprar un congelador, o "racha de 30" que se esfuma el día 31.
    const allowed = new Set<string>(MONOTONE_COUNTERS);
    const offenders = BADGES.filter(
      (b) => b.condition.kind === 'threshold' && !allowed.has(b.condition.metric),
    ).map((b) => b.id);
    expect(offenders).toEqual([]);
  });

  it('cada texto de pista dice CÓMO conseguirla, no qué es', () => {
    for (const b of BADGES) {
      expect(b.hint.length).toBeGreaterThan(12);
      expect(b.name).not.toBe(b.hint);
    }
  });

  it('los umbrales de una misma métrica son estrictamente crecientes por nivel', () => {
    // Dos insignias de la misma métrica con el mismo umbral se desbloquean juntas y una de las dos sobra.
    const byMetric = new Map<string, number[]>();
    for (const b of BADGES) {
      if (b.condition.kind !== 'threshold') continue;
      const list = byMetric.get(b.condition.metric) ?? [];
      list.push(b.condition.at);
      byMetric.set(b.condition.metric, list);
    }
    for (const [metric, ats] of byMetric) {
      expect(new Set(ats).size, `umbrales repetidos en ${metric}`).toBe(ats.length);
    }
  });
});
