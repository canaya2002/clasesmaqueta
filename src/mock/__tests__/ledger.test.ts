/**
 * El ledger sembrado. La primera pantalla de la demo sale de aquí.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_USER_ORDINAL, bootClient, resetClientBoot } from '../boot-client';
import { getBasis, resetLedgerForTests } from '../ledger';
import { seedLedgerFor, unitSizesOf } from '../ledger-seed';
import { userHeatmap } from '../activity';
import { resetWorld } from '../db';
import { resetDemo } from '../persist';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';

beforeEach(() => {
  resetDemo();
  resetWorld();
  resetClientBoot();
  resetLedgerForTests();
});

describe('la siembra', () => {
  it('el usuario de la demo abre con historia, no con una pantalla vacía', () => {
    bootClient();
    const b = getBasis(DEFAULT_ECONOMY);

    expect(b.lessonsCompleted).toBeGreaterThan(20);
    expect(b.totalMilliXp).toBeGreaterThan(0);
    expect(b.level).toBeGreaterThan(1);
    expect(b.activeDays).toBeGreaterThan(10);
    expect(b.longestStreak).toBeGreaterThan(2);
  });

  it('las lecciones caen SOLO en los días que el modelo de actividad marcó activos', () => {
    // Es la propiedad que impide que el agregado del Studio y el detalle del alumno discrepen: los dos
    // salen del mismo bitset. Si el ledger tuviera días propios, el heatmap del perfil y el DAU del
    // dashboard contarían historias distintas sobre la misma persona.
    const { world } = bootClient();
    const heat = userHeatmap(world.activity, DEMO_USER_ORDINAL);
    const activeDays = heat.reduce<number>((n, bit) => n + (bit === 0 ? 0 : 1), 0);

    const b = getBasis(DEFAULT_ECONOMY);
    expect(b.activeDays).toBeLessThanOrEqual(activeDays);
    expect(b.activeDays).toBeGreaterThan(activeDays * 0.9);
  });

  it('el avance va EN ORDEN de catálogo', () => {
    // Nadie completa la lección 40 antes que la 12, y el camino dibujaría un absurdo si lo hiciera.
    const { world } = bootClient();
    const events = seedLedgerFor({
      ordinal: DEMO_USER_ORDINAL,
      index: world.activity,
      courses: world.courses,
      zone: 'America/Mexico_City',
    });
    const order = [...unitSizesOf(world.courses).keys()];
    const seen: string[] = [];
    for (const e of events) {
      if (e.t !== 'lesson-complete') continue;
      if (seen[seen.length - 1] !== e.unitId) seen.push(e.unitId);
    }
    // Las unidades visitadas son un PREFIJO del orden del catálogo, sin saltos ni retrocesos.
    expect(seen).toEqual(order.slice(0, seen.length));
  });

  it('dos siembras del mismo usuario producen el mismo ledger', () => {
    const { world } = bootClient();
    const args = {
      ordinal: DEMO_USER_ORDINAL,
      index: world.activity,
      courses: world.courses,
      zone: 'America/Mexico_City' as const,
    };
    expect(seedLedgerFor(args)).toEqual(seedLedgerFor(args));
  });
});
