/**
 * El bucle central: jugar tiene que mover los números.
 *
 * Durante dos fases el `onFinish` del reproductor fue `void result`. La lección se calificaba, el resumen
 * enseñaba el XP ganado, y no se escribía nada: el HUD seguía mostrando la historia sembrada, así que todo
 * se veía bien y el producto no funcionaba.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { bootClient, resetClientBoot } from '../boot-client';
import { getFold, replaceLedgerForTests, resetLedgerForTests } from '../ledger';
import { recordLesson } from '../actions';
import { resetContentIndexForTests, unitOf } from '../content-index';
import { resetWorld } from '../db';
import { resetDemo } from '../persist';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { brand } from '@/lib/brand';
import { score } from '@/content/engine/primitives';
import type { LessonResult } from '@/content/engine/grade';

function result(over: Partial<LessonResult> = {}): LessonResult {
  return {
    xp: 60,
    xpBreakdown: { steps: 60, perfect: 0, firstClear: 0, pace: 0 },
    accuracy: score(0.9),
    correctFirstTry: 9,
    firstTryCount: 10,
    maxCombo: 7,
    elapsedMs: 120_000,
    perfect: false,
    xpUnitsMilli: 12_000,
    paceBonusEarned: false,
    weightTotal: 10,
    ...over,
  };
}

const LESSON = brand<string, 'LessonId'>('lsn_00000000');

beforeEach(() => {
  resetDemo();
  resetWorld();
  resetClientBoot();
  resetLedgerForTests();
  resetContentIndexForTests();
  bootClient();
  replaceLedgerForTests([]);
});

describe('registrar una lección', () => {
  it('mueve el XP, el conteo y la racha', () => {
    const antes = getFold(DEFAULT_ECONOMY).basis;
    const unitId = unitOf(LESSON);
    expect(unitId).not.toBeNull();
    if (unitId === null) return;

    recordLesson(DEFAULT_ECONOMY, {
      lessonId: LESSON,
      unitId,
      difficulty: 3,
      result: result(),
      countsForProgress: true,
    });

    const despues = getFold(DEFAULT_ECONOMY).basis;
    expect(despues.totalMilliXp).toBeGreaterThan(antes.totalMilliXp);
    expect(despues.lessonsCompleted).toBe(antes.lessonsCompleted + 1);
    expect(despues.currentStreak).toBe(1);
    expect(getFold(DEFAULT_ECONOMY).clearedLessons.has(LESSON)).toBe(true);
  });

  it('la segunda vez ya no es primera vez', () => {
    const unitId = unitOf(LESSON);
    if (unitId === null) return;
    const args = { lessonId: LESSON, unitId, difficulty: 3 as const, result: result(), countsForProgress: true };
    recordLesson(DEFAULT_ECONOMY, args);
    recordLesson(DEFAULT_ECONOMY, args);
    expect(getFold(DEFAULT_ECONOMY).basis.firstClears).toBe(1);
  });

  it('el modo práctica no alimenta la racha pero sí otorga XP', () => {
    const unitId = unitOf(LESSON);
    if (unitId === null) return;
    recordLesson(DEFAULT_ECONOMY, {
      lessonId: LESSON,
      unitId,
      difficulty: 3,
      result: result(),
      countsForProgress: false,
    });
    const b = getFold(DEFAULT_ECONOMY).basis;
    expect(b.totalMilliXp).toBeGreaterThan(0);
    expect(b.currentStreak).toBe(0);
  });

  it('la subida de nivel se detecta como TRANSICIÓN, no comparando contra un nivel guardado', () => {
    // Comparar contra un nivel guardado antes falla en cuanto el admin mueve la curva de XP en el Studio:
    // el nivel se re-deriva sin que haya entrado ningún evento y la cinemática se dispararía sola.
    const unitId = unitOf(LESSON);
    if (unitId === null) return;
    const subida = recordLesson(DEFAULT_ECONOMY, {
      lessonId: LESSON,
      unitId,
      difficulty: 5,
      result: result({ xpUnitsMilli: 900_000 }),
      countsForProgress: true,
    });
    expect(subida.leveledUpTo).not.toBeNull();

    // Y una lección pequeña después NO vuelve a anunciar el mismo nivel.
    const otra = recordLesson(DEFAULT_ECONOMY, {
      lessonId: brand<string, 'LessonId'>('lsn_00000001'),
      unitId,
      difficulty: 1,
      result: result({ xpUnitsMilli: 1 }),
      countsForProgress: true,
    });
    expect(otra.leveledUpTo).toBeNull();
  });

  it('una lección perfecta otorga gemas y quedan congeladas', () => {
    const unitId = unitOf(LESSON);
    if (unitId === null) return;
    recordLesson(DEFAULT_ECONOMY, {
      lessonId: LESSON,
      unitId,
      difficulty: 3,
      result: result({ perfect: true }),
      countsForProgress: true,
    });
    const caro = getFold({ ...DEFAULT_ECONOMY, gemsPerfectLesson: 500 }).basis.gems;
    expect(caro).toBe(DEFAULT_ECONOMY.gemsPerfectLesson);
  });
});
