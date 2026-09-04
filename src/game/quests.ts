/**
 * Las misiones diarias. Deterministas por (usuario, día ABSOLUTO), sin persistir nada.
 *
 * La semilla es el día absoluto y no `todayIndex()`, que devuelve 119 todos los días de la vida de la
 * demo: sembrar con él daría LAS MISMAS tres misiones eternamente, con los mismos ids, y el evento de
 * cobro no podría distinguir el de hoy del de hace un mes. Y como el `questId` incorpora el día, la tupla
 * de deduplicación es única sin campo extra.
 *
 * El progreso NO se persiste: se deriva de lo hecho hoy. Un contador guardado se desincroniza en cuanto
 * cambia el día a media sesión, y entonces hay una misión al 60% que ya no corresponde a nada.
 */

import { mix32, u01 } from '@/lib/rng';
import type { EconomyConfig } from '@/content/engine/economy';
import type { TodayStats } from './types';

const NS_QUEST = 0x5e11f001;

export type QuestKind = 'xp' | 'lessons' | 'perfect' | 'combo' | 'accuracy';

export interface QuestDef {
  readonly id: string;
  readonly kind: QuestKind;
  readonly target: number;
  readonly gems: number;
  readonly label: string;
  readonly unit: string;
}

interface Template {
  readonly kind: QuestKind;
  readonly targets: readonly number[];
  readonly label: (n: number) => string;
  readonly unit: string;
}

/**
 * Tres dificultades por plantilla, no una.
 *
 * Una misión fija —"gana 50 XP"— es trivial para quien hace tres lecciones al día e inalcanzable para
 * quien hace una. La variación diaria es lo que la mantiene viva sin necesidad de personalizarla.
 */
const TEMPLATES: readonly Template[] = [
  { kind: 'xp', targets: [40, 60, 90], label: (n) => `Gana ${String(n)} XP`, unit: 'XP' },
  { kind: 'lessons', targets: [2, 3, 4], label: (n) => `Completa ${String(n)} lecciones`, unit: 'lecciones' },
  { kind: 'perfect', targets: [1, 1, 2], label: (n) => `Termina ${String(n)} ${n === 1 ? 'lección perfecta' : 'lecciones perfectas'}`, unit: 'perfectas' },
  { kind: 'combo', targets: [8, 12, 16], label: (n) => `Encadena ${String(n)} aciertos seguidos`, unit: 'aciertos' },
  { kind: 'accuracy', targets: [80, 85, 90], label: (n) => `Termina el día con ${String(n)}% de precisión`, unit: '%' },
];

export const QUESTS_PER_DAY = 3;

/** Las misiones de un día. Siempre tres, siempre de plantillas distintas. */
export function questsFor(ordinal: number, epochDay: number, econ: EconomyConfig): readonly QuestDef[] {
  const pool = TEMPLATES.map((t, i) => ({ t, k: u01(mix32(NS_QUEST, ordinal + epochDay * 31, i)) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, QUESTS_PER_DAY);

  return pool.map(({ t }, slot) => {
    const roll = u01(mix32(NS_QUEST, ordinal + epochDay * 97, slot + 11));
    const tier = Math.min(t.targets.length - 1, Math.floor(roll * t.targets.length));
    const target = t.targets[tier] ?? t.targets[0] ?? 1;
    return {
      // El día va DENTRO del id: dos misiones de días distintos nunca colisionan, así que el evento de
      // cobro no necesita llevar la fecha aparte para deduplicar.
      id: `qst_${String(epochDay)}_${String(slot)}`,
      kind: t.kind,
      target,
      // Las misiones más duras pagan más, pero el rango lo fija la economía del Studio.
      gems: Math.max(1, Math.round(econ.gemsPerQuest * (0.7 + tier * 0.3))),
      label: t.label(target),
      unit: t.unit,
    };
  });
}

/** Cuánto lleva hecho, en las unidades de la misión. Nunca por encima del objetivo. */
export function questProgress(quest: QuestDef, today: TodayStats): number {
  switch (quest.kind) {
    case 'xp':
      return Math.min(today.xp, quest.target);
    case 'lessons':
      return Math.min(today.lessons, quest.target);
    case 'perfect':
      return Math.min(today.perfect, quest.target);
    case 'combo':
      return Math.min(today.maxCombo, quest.target);
    case 'accuracy':
      // Sin nada contestado hoy la precisión no es 0%: es que todavía no hay dato. Enseñar 0% al abrir la
      // app por la mañana es decirle al alumno que va fatal antes de que empiece.
      return today.weightTotal === 0
        ? 0
        : Math.min(Math.round(today.weightedScoreMilli / today.weightTotal / 10), quest.target);
  }
}

export function isQuestComplete(quest: QuestDef, today: TodayStats): boolean {
  return questProgress(quest, today) >= quest.target;
}
