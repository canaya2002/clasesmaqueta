/**
 * El ÚNICO plegado del ledger. Una pasada, todos los sistemas.
 *
 * Tres decisiones que no son obvias:
 *
 * 1. **`asOf` es un argumento, no una lectura.** La racha no es función de `(eventos, economía)`: a las
 *    03:59 vale 12 y a las 04:01 vale 0 sin que haya entrado ningún evento. Un fold que leyera el reloj por
 *    dentro sería imposible de memoizar sin congelar el 12 para siempre, y memoizarlo mal produce un
 *    re-render por notificación — justo lo que el criterio de aislamiento tiene que impedir.
 * 2. **El congelador de racha se consume en la misma pasada cronológica**, no al final. Una compra no puede
 *    reparar un hueco ANTERIOR a ella: comprar dos congeladores el viernes no devuelve el martes perdido.
 *    Esa es la diferencia entre una pasada ordenada y contar totales.
 * 3. **Los conjuntos se construyen aquí y no aparte.** Prerrequisitos, test-out y meta diaria no caben en
 *    un escalar, y hacerlos en otra pasada abre la puerta a que agregado y detalle discrepen.
 */

import { levelAt, levelThresholds } from '@/content/engine/economy';
import { epochDayOf } from './day';
import type { Basis, FoldOptions, FoldResult, LedgerEvent, TodayStats } from './types';

const EMPTY_BASIS: Basis = {
  totalMilliXp: 0,
  level: 1,
  gems: 0,
  gemsEarnedTotal: 0,
  lessonsCompleted: 0,
  perfectLessons: 0,
  firstClears: 0,
  currentStreak: 0,
  longestStreak: 0,
  activeDays: 0,
  unitsCompleted: 0,
  maxCombo: 0,
  totalSeconds: 0,
  weightedScoreMilli: 0,
  weightTotal: 0,
  questsClaimed: 0,
  chestsOpened: 0,
  freezesOwned: 0,
  freezesUsed: 0,
  heartRefillsBought: 0,
  xpToday: 0,
};

interface StreakOutcome {
  readonly current: number;
  readonly longest: number;
  readonly freezesLeft: number;
  readonly freezesUsed: number;
}

/**
 * La racha, en una sola pasada sobre la fusión ordenada de días activos y compras de congelador.
 *
 * Regla de consumo declarada: un congelador tapa UN día de hueco, se consume en orden y solo si YA estaba
 * comprado cuando ocurrió el hueco. El hueco hasta hoy se evalúa igual que cualquier otro, con una
 * excepción: el día de HOY todavía no ha terminado, así que no cuenta como hueco.
 */
function foldStreak(
  activeDays: readonly number[],
  freezePurchaseDays: readonly number[],
  todayEpochDay: number,
): StreakOutcome {
  let owned = 0;
  let used = 0;
  let purchaseIdx = 0;
  let current = 0;
  let longest = 0;
  let prev: number | null = null;

  const grantThrough = (day: number): void => {
    while (purchaseIdx < freezePurchaseDays.length && (freezePurchaseDays[purchaseIdx] ?? 0) <= day) {
      owned += 1;
      purchaseIdx += 1;
    }
  };

  /**
   * Tapa el hueco [from, to] día a día.
   *
   * Se emparejan congelador y día faltante UNO A UNO, y solo si el congelador ya estaba comprado ESE día.
   * Conceder primero todos los congeladores del tramo y luego restar del total es más corto y está mal:
   * dejaría que un congelador comprado el último día del hueco tapara el primero, que es viajar al pasado.
   */
  const coverGap = (from: number, to: number): boolean => {
    let uncovered = 0;
    for (let m = from; m <= to; m += 1) {
      grantThrough(m);
      if (owned > 0) {
        owned -= 1;
        used += 1;
      } else {
        uncovered += 1;
      }
    }
    return uncovered === 0;
  };

  for (const day of activeDays) {
    // Sin `grantThrough(day)` aquí a propósito: conceder los congeladores del día ACTUAL antes de evaluar
    // el hueco que lo precede es precisamente lo que dejaría que una compra reparase el pasado. Los
    // congeladores se conceden dentro de `coverGap`, día faltante a día faltante.
    if (prev === null) {
      current = 1;
    } else if (day === prev) {
      continue;
    } else if (day === prev + 1) {
      current += 1;
    } else {
      current = coverGap(prev + 1, day - 1) ? current + 1 : 1;
    }
    longest = Math.max(longest, current);
    prev = day;
  }

  if (prev === null) return { current: 0, longest: 0, freezesLeft: owned, freezesUsed: used };

  // Hoy no ha terminado, así que el hueco abierto se mide hasta AYER: terminar ayer y abrir la app esta
  // mañana no puede enseñar la racha en cero.
  if (todayEpochDay - prev > 1 && !coverGap(prev + 1, todayEpochDay - 1)) current = 0;

  // Las compras que no hizo falta gastar siguen en el inventario.
  grantThrough(todayEpochDay);

  return { current, longest, freezesLeft: owned, freezesUsed: used };
}

export function fold(events: readonly LedgerEvent[], opts: FoldOptions): FoldResult {
  const { econ, asOf } = opts;
  const ordered = [...events].sort((a, b) => a.atRealMs - b.atRealMs || a.seq - b.seq);

  let totalMilliXp = 0;
  let gems = 0;
  let gemsEarnedTotal = 0;
  let lessonsCompleted = 0;
  let perfectLessons = 0;
  let firstClears = 0;
  let maxCombo = 0;
  let totalMs = 0;
  let weightedScoreMilli = 0;
  let weightTotal = 0;
  let questsClaimed = 0;
  let chestsOpened = 0;
  let heartRefillsBought = 0;

  // Lo de HOY se acumula en la MISMA pasada. Recorrer otra vez filtrando por `dayKey` abre la puerta a
  // que el resumen del día y los totales usen criterios distintos de qué cuenta.
  let todayXp = 0;
  let todayLessons = 0;
  let todayPerfect = 0;
  let todayCombo = 0;
  let todayScoreMilli = 0;
  let todayWeight = 0;

  const clearedLessons = new Map<string, { times: number; bestAccuracyMilli: number }>();
  const unitLessons = new Map<string, Set<string>>();
  const xpByDayKey = new Map<string, number>();
  const activeDaySet = new Set<string>();
  const seenBadges = new Set<string>();
  const claimedQuests = new Set<string>();
  const freezePurchaseDays: number[] = [];

  for (const e of ordered) {
    switch (e.t) {
      case 'lesson-complete': {
        const factor = econ.difficultyFactor[e.difficulty - 1] ?? 1;
        const stepMilli = e.xpUnitsMilli * econ.xpBase * factor;
        const bonuses =
          (e.perfect ? econ.bonusPerfectXp : 0) +
          (e.firstClear ? econ.bonusFirstClearXp : 0) +
          (e.paceBonusEarned ? econ.bonusPaceXp : 0);
        const milli = stepMilli + bonuses * 1000;

        totalMilliXp += milli;
        lessonsCompleted += 1;
        if (e.perfect) perfectLessons += 1;
        if (e.firstClear) firstClears += 1;
        maxCombo = Math.max(maxCombo, e.maxCombo);
        totalMs += e.elapsedMs;
        weightedScoreMilli += e.accuracyMilli * e.weightTotal;
        weightTotal += e.weightTotal;
        gems += e.gemsGranted;
        gemsEarnedTotal += e.gemsGranted;

        const xp = Math.round(milli / 1000);
        xpByDayKey.set(e.dayKey, (xpByDayKey.get(e.dayKey) ?? 0) + xp);

        if (e.dayKey === asOf.todayKey) {
          todayXp += xp;
          todayLessons += 1;
          if (e.perfect) todayPerfect += 1;
          todayCombo = Math.max(todayCombo, e.maxCombo);
          todayScoreMilli += e.accuracyMilli * e.weightTotal;
          todayWeight += e.weightTotal;
        }

        // Solo cuenta para progreso —y por tanto para la racha— si se jugó con las reglas completas.
        if (e.countsForProgress) {
          activeDaySet.add(e.dayKey);
          const prev = clearedLessons.get(e.lessonId);
          clearedLessons.set(e.lessonId, {
            times: (prev?.times ?? 0) + 1,
            bestAccuracyMilli: Math.max(prev?.bestAccuracyMilli ?? 0, e.accuracyMilli),
          });
          const set = unitLessons.get(e.unitId) ?? new Set<string>();
          set.add(e.lessonId);
          unitLessons.set(e.unitId, set);
        }
        break;
      }
      case 'gems-granted':
        gems += e.amount;
        gemsEarnedTotal += e.amount;
        break;
      case 'quest-claimed':
        questsClaimed += 1;
        claimedQuests.add(e.questId);
        gems += e.gemsGranted;
        gemsEarnedTotal += e.gemsGranted;
        break;
      case 'chest-opened':
        chestsOpened += 1;
        gems += e.gemsGranted;
        gemsEarnedTotal += e.gemsGranted;
        break;
      case 'shop-purchase':
        gems -= e.pricePaid;
        if (e.item === 'streak-freeze') {
          const day = epochDayOf(e.dayKey);
          if (day !== null) freezePurchaseDays.push(day);
        }
        if (e.item === 'heart-refill') heartRefillsBought += 1;
        break;
      case 'badge-seen':
        seenBadges.add(e.badgeId);
        break;
      case 'league-enrolled':
        break;
    }
  }

  // Una unidad está completa cuando TODAS sus lecciones están superadas. Con un contador no se puede
  // responder "¿está desbloqueada la unidad 7?", porque los prerrequisitos son un grafo por ids.
  const completedUnits = new Set<string>();
  for (const [unitId, cleared] of unitLessons) {
    const size = opts.unitSizes.get(unitId);
    if (size !== undefined && size > 0 && cleared.size >= size) completedUnits.add(unitId);
  }

  const activeDayKeys = [...activeDaySet].sort();
  const activeDays: number[] = [];
  for (const key of activeDayKeys) {
    const d = epochDayOf(key);
    if (d !== null) activeDays.push(d);
  }
  const streak = foldStreak(activeDays, freezePurchaseDays, asOf.todayEpochDay);

  const totalXp = Math.round(totalMilliXp / 1000);
  const level = levelAt(levelThresholds(econ), totalXp);

  const basis: Basis = {
    ...EMPTY_BASIS,
    totalMilliXp,
    level,
    gems,
    gemsEarnedTotal,
    lessonsCompleted,
    perfectLessons,
    firstClears,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    activeDays: activeDayKeys.length,
    unitsCompleted: completedUnits.size,
    maxCombo,
    totalSeconds: Math.round(totalMs / 1000),
    weightedScoreMilli,
    weightTotal,
    questsClaimed,
    chestsOpened,
    freezesOwned: streak.freezesLeft,
    freezesUsed: streak.freezesUsed,
    heartRefillsBought,
    xpToday: xpByDayKey.get(asOf.todayKey) ?? 0,
  };

  const today: TodayStats = {
    xp: todayXp,
    lessons: todayLessons,
    perfect: todayPerfect,
    maxCombo: todayCombo,
    weightedScoreMilli: todayScoreMilli,
    weightTotal: todayWeight,
  };

  return {
    basis,
    today,
    todayKey: asOf.todayKey,
    todayEpochDay: asOf.todayEpochDay,
    completedUnits,
    clearedLessons,
    xpByDayKey,
    activeDayKeys,
    seenBadges,
    claimedQuests,
  };
}
