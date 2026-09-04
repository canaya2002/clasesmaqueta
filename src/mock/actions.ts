'use client';

/**
 * Las acciones del alumno que MUTAN el ledger.
 *
 * Están juntas y aparte de la UI por una razón concreta: cada una tiene que comprobar su precondición
 * ANTES de escribir, y esa comprobación no puede vivir en el componente. Un botón deshabilitado es una
 * cortesía, no una garantía: con el teclado, con el DOM abierto o con dos pestañas, se llega igual.
 */

import { appendEvent, getFold } from './ledger';
import { refillAll, grantUnlimited, snapshot } from './hearts';
import { isQuestComplete, type QuestDef } from '@/game/quests';
import { shopItems } from '@/game/shop';
import type { EconomyConfig } from '@/content/engine/economy';
import type { ShopItemId } from '@/game/types';
import type { LessonResult } from '@/content/engine/grade';
import type { LessonId, UnitId } from '@/content/engine/primitives';

export type ActionResult = { readonly ok: true } | { readonly ok: false; readonly reason: string };

const OK: ActionResult = { ok: true };

/** Cobra una misión. Idempotente por `questId`, que ya lleva el día dentro. */
export function claimQuest(econ: EconomyConfig, quest: QuestDef): ActionResult {
  const f = getFold(econ);
  if (!isQuestComplete(quest, f.today)) return { ok: false, reason: 'Todavía no la has completado' };

  appendEvent({ t: 'quest-claimed', questId: quest.id, gemsGranted: quest.gems });
  return OK;
}

export function isQuestClaimed(econ: EconomyConfig, questId: string): boolean {
  // Se pregunta al ledger, no a un conjunto en memoria: dos pestañas abiertas comparten almacenamiento y
  // no comparten estado de React.
  return getFold(econ).claimedQuests.has(questId);
}

/**
 * Registrar una lección terminada. Es el único camino por el que jugar mueve los números.
 *
 * Durante dos fases el `onFinish` del reproductor fue `void result`: la lección se calificaba, el resumen
 * enseñaba el XP ganado, y no se escribía nada. El HUD seguía mostrando la historia sembrada, así que la
 * demo se veía bien y el bucle central del producto —jugar y que suba— no existía.
 *
 * OTORGAR y CELEBRAR son dos pasos, en este orden. Aquí se otorga: el hecho queda consumado en el ledger
 * antes de que nadie decida qué cinemática enseñar. Al revés, una recompensa que se descarta por el tope
 * de cinemáticas encadenadas se pierde de verdad.
 */
export function recordLesson(
  econ: EconomyConfig,
  input: {
    readonly lessonId: LessonId;
    readonly unitId: UnitId;
    readonly difficulty: 1 | 2 | 3 | 4 | 5;
    readonly result: LessonResult;
    readonly countsForProgress: boolean;
  },
): { readonly leveledUpTo: number | null } {
  const before = getFold(econ).basis.level;

  appendEvent({
    t: 'lesson-complete',
    lessonId: input.lessonId,
    unitId: input.unitId,
    difficulty: input.difficulty,
    xpUnitsMilli: input.result.xpUnitsMilli,
    accuracyMilli: Math.round(input.result.accuracy * 1000),
    weightTotal: input.result.weightTotal,
    perfect: input.result.perfect,
    firstClear: !getFold(econ).clearedLessons.has(input.lessonId),
    paceBonusEarned: input.result.paceBonusEarned,
    maxCombo: input.result.maxCombo,
    elapsedMs: input.result.elapsedMs,
    // Las gemas se CONGELAN con el precio vigente: retunear la economía no reescribe un saldo.
    gemsGranted: input.result.perfect ? econ.gemsPerfectLesson : 0,
    countsForProgress: input.countsForProgress,
  });

  // La subida de nivel se detecta como TRANSICIÓN medida con la MISMA economía a los dos lados. Comparar
  // contra un nivel guardado antes falla en cuanto el admin mueve la curva de XP en el Studio: el nivel
  // se re-deriva sin que haya entrado ningún evento y la cinemática se dispararía sola.
  const after = getFold(econ).basis.level;
  return { leveledUpTo: after > before ? after : null };
}

export function buyItem(econ: EconomyConfig, item: ShopItemId): ActionResult {
  const f = getFold(econ);
  const hearts = snapshot(econ);
  const offer = shopItems(econ, f.basis, hearts.current >= hearts.max, hearts.unlimited).find(
    (i) => i.id === item,
  );
  if (offer === undefined) return { ok: false, reason: 'Ese artículo ya no existe' };
  if (offer.blocked !== null) return { ok: false, reason: offer.blocked };

  // El evento se escribe con el precio VIGENTE y ahí se congela. Bajar el precio en el Studio abarata las
  // compras siguientes y no reembolsa las hechas.
  appendEvent({ t: 'shop-purchase', item, pricePaid: offer.price });

  if (item === 'heart-refill') refillAll(econ);
  if (item === 'unlimited-hearts') grantUnlimited(econ, 24);
  return OK;
}
