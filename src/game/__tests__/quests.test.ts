import { describe, expect, it } from 'vitest';
import { QUESTS_PER_DAY, isQuestComplete, questProgress, questsFor } from '../quests';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import type { TodayStats } from '../types';

const EMPTY: TodayStats = { xp: 0, lessons: 0, perfect: 0, maxCombo: 0, weightedScoreMilli: 0, weightTotal: 0 };

describe('misiones diarias', () => {
  it('son tres, de plantillas distintas, y deterministas', () => {
    const a = questsFor(688, 20_500, DEFAULT_ECONOMY);
    const b = questsFor(688, 20_500, DEFAULT_ECONOMY);
    expect(a).toHaveLength(QUESTS_PER_DAY);
    expect(a).toEqual(b);
    expect(new Set(a.map((q) => q.kind)).size).toBe(QUESTS_PER_DAY);
  });

  it('cambian de un día a otro', () => {
    // Sembrar con `todayIndex()` —que vale 119 todos los días— daría las mismas tres eternamente.
    const hoy = questsFor(688, 20_500, DEFAULT_ECONOMY);
    const manana = questsFor(688, 20_501, DEFAULT_ECONOMY);
    expect(hoy.map((q) => q.id)).not.toEqual(manana.map((q) => q.id));
  });

  it('el id lleva el día dentro, así que dos días nunca colisionan', () => {
    const ids = new Set<string>();
    for (let d = 20_400; d < 20_500; d += 1) {
      for (const q of questsFor(688, d, DEFAULT_ECONOMY)) ids.add(q.id);
    }
    expect(ids.size).toBe(100 * QUESTS_PER_DAY);
  });

  it('dos personas distintas no reciben las mismas misiones el mismo día', () => {
    const a = questsFor(100, 20_500, DEFAULT_ECONOMY);
    const b = questsFor(900, 20_500, DEFAULT_ECONOMY);
    expect(a.map((q) => q.id + String(q.target))).not.toEqual(b.map((q) => q.id + String(q.target)));
  });

  it('el premio se deriva de la economía, así que el Studio lo mueve', () => {
    const base = questsFor(688, 20_500, DEFAULT_ECONOMY);
    const rico = questsFor(688, 20_500, { ...DEFAULT_ECONOMY, gemsPerQuest: DEFAULT_ECONOMY.gemsPerQuest * 4 });
    expect(rico[0]?.gems ?? 0).toBeGreaterThan(base[0]?.gems ?? 0);
  });

  it('sin nada hecho hoy, ninguna está completa y el progreso es cero', () => {
    for (const q of questsFor(688, 20_500, DEFAULT_ECONOMY)) {
      expect(questProgress(q, EMPTY)).toBe(0);
      expect(isQuestComplete(q, EMPTY)).toBe(false);
    }
  });

  it('la precisión sin datos no es 0%: es que todavía no hay dato', () => {
    // Enseñar 0% al abrir la app por la mañana le dice al alumno que va fatal antes de empezar.
    const quest = { id: 'q', kind: 'accuracy' as const, target: 85, gems: 10, label: '', unit: '%' };
    expect(questProgress(quest, EMPTY)).toBe(0);
    expect(questProgress(quest, { ...EMPTY, weightedScoreMilli: 9000, weightTotal: 10 })).toBe(85);
  });

  it('el progreso nunca pasa del objetivo', () => {
    const quest = { id: 'q', kind: 'xp' as const, target: 40, gems: 10, label: '', unit: 'XP' };
    expect(questProgress(quest, { ...EMPTY, xp: 500 })).toBe(40);
  });
});
