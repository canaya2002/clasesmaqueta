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
