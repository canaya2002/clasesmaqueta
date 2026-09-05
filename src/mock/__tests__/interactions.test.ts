/**
 * ¿Los controles del producto HACEN algo con los datos reales de la demo?
 *
 * Un botón visible que nunca se puede pulsar con éxito es indistinguible de uno roto, y esa clase de fallo
 * no la caza ninguna prueba de lógica: pasa por afirmar la regla en vez de ejercitarla con el estado que
 * el usuario va a tener de verdad.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_USER_ORDINAL, bootClient, resetClientBoot } from '../boot-client';
import { getFold, resetLedgerForTests } from '../ledger';
import { buyItem, claimQuest } from '../actions';
import { resetHeartsForTests, snapshot } from '../hearts';
import { resetWorld } from '../db';
import { resetDemo } from '../persist';
import { getEconomy, resetEconomyForTests } from '../economy-store';
import { isQuestComplete, questsFor } from '@/game/quests';
import { shopItems } from '@/game/shop';

beforeEach(() => {
  resetDemo();
  resetWorld();
  resetClientBoot();
  resetLedgerForTests();
  resetHeartsForTests(null);
  resetEconomyForTests();
  bootClient();
});

describe('misiones', () => {
  it('el usuario de la demo puede cobrar al menos una misión el primer día', () => {
    // Si ninguna fuera cobrable con la historia sembrada, los tres botones "Cobrar" de la pantalla serían
    // decorativos y el sistema de misiones no se podría enseñar.
    const econ = getEconomy();
    const fold = getFold(econ);
    const quests = questsFor(DEMO_USER_ORDINAL, fold.todayEpochDay, econ);
    const completable = quests.filter((q) => isQuestComplete(q, fold.today));

    expect(quests).toHaveLength(3);
    expect(completable.length).toBeGreaterThan(0);
  });

  it('cobrar suma gemas y no se puede cobrar dos veces', () => {
    const econ = getEconomy();
    const fold = getFold(econ);
    const quest = questsFor(DEMO_USER_ORDINAL, fold.todayEpochDay, econ).find((q) =>
      isQuestComplete(q, fold.today),
    );
    expect(quest).toBeDefined();
    if (quest === undefined) return;

    const antes = getFold(econ).basis.gems;
    expect(claimQuest(econ, quest).ok).toBe(true);
    expect(getFold(econ).basis.gems).toBe(antes + quest.gems);
    expect(getFold(econ).claimedQuests.has(quest.id)).toBe(true);
  });

  it('una misión sin completar se niega y DICE por qué', () => {
    const econ = getEconomy();
    const fold = getFold(econ);
    const pendiente = questsFor(DEMO_USER_ORDINAL, fold.todayEpochDay, econ).find(
      (q) => !isQuestComplete(q, fold.today),
    );
    if (pendiente === undefined) return;
    const r = claimQuest(econ, pendiente);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.length).toBeGreaterThan(8);
  });
});

describe('tienda', () => {
  it('el usuario de la demo puede comprar algo: tiene gemas de sobra', () => {
    const econ = getEconomy();
    const basis = getFold(econ).basis;
    const hearts = snapshot(econ);
    const comprables = shopItems(econ, basis, hearts.current >= hearts.max, hearts.unlimited).filter(
      (i) => i.blocked === null,
    );
    expect(basis.gems).toBeGreaterThan(0);
    expect(comprables.length).toBeGreaterThan(0);
  });

  it('comprar descuenta las gemas y aplica el efecto', () => {
    const econ = getEconomy();
    const antes = getFold(econ).basis.gems;
    const r = buyItem(econ, 'streak-freeze');
    expect(r.ok).toBe(true);
    expect(getFold(econ).basis.gems).toBe(antes - econ.priceStreakFreeze);
    expect(getFold(econ).basis.freezesOwned).toBe(1);
  });

  it('sin gemas suficientes se niega y dice cuántas faltan', () => {
    const econ = { ...getEconomy(), priceUnlimitedHearts: 999_999 };
    const r = buyItem(econ, 'unlimited-hearts');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/faltan/);
  });
});
