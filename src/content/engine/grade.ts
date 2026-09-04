/**
 * SENDA — calificación de una lección completa. Función pura, sin React ni DOM.
 */

import { comboMultiplier, type EconomyConfig } from './economy';
import type { SessionPolicy } from './policy';
import type { Attempt } from './session';
import { milliXp, score, toXp, type MilliXp, type Score01 } from './primitives';

export interface LessonResult {
  readonly xp: number;
  readonly xpBreakdown: {
    readonly steps: number;
    readonly perfect: number;
    readonly firstClear: number;
    readonly pace: number;
  };
  /**
   * Precisión sobre PRIMEROS intentos, ponderada por el peso psicométrico congelado en cada intento.
   *
   * Casi todas las apps calculan aciertos/total incluyendo reintentos, que es por qué su precisión siempre
   * ronda el 95% y no dice nada. Y el peso se toma del intento, no del contenido vigente: si se tomara del
   * contenido, retocar la economía en el Studio movería la precisión histórica de alumnos que no han
   * contestado nada.
   */
  readonly accuracy: Score01;
  readonly correctFirstTry: number;
  readonly firstTryCount: number;
  readonly maxCombo: number;
  readonly elapsedMs: number;
  readonly perfect: boolean;
}

export interface GradeLessonOptions {
  readonly econ: EconomyConfig;
  readonly policy: SessionPolicy;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  /** Peso de ECONOMÍA por paso. El psicométrico ya viaja congelado dentro de cada intento. */
  readonly xpWeightByStep: ReadonlyMap<string, 1 | 2 | 3>;
  readonly firstClear: boolean;
  readonly estimatedSeconds: number;
}

export function gradeLesson(attempts: readonly Attempt[], opts: GradeLessonOptions): LessonResult {
  const econ = opts.econ;
  const difficultyFactor = econ.difficultyFactor[opts.difficulty - 1] ?? 1;

  let stepMilli = 0;
  let weightedScore = 0;
  let weightTotal = 0;
  let correctFirstTry = 0;
  let firstTryCount = 0;
  let maxCombo = 0;
  let elapsedMs = 0;

  for (const a of attempts) {
    elapsedMs += a.elapsedMs;
    maxCombo = Math.max(maxCombo, a.comboRunAfter);

    if (a.attemptIndex === 0) {
      firstTryCount += 1;
      weightTotal += a.weightAtTime;
      // Saltar o revelar cuentan CERO en el numerador y su peso COMPLETO en el denominador.
      weightedScore += a.outcome === 'correct' ? a.score * a.weightAtTime : 0;
      if (a.outcome === 'correct') correctFirstTry += 1;
    }

    if (a.outcome !== 'correct') continue;

    const xpWeight = opts.xpWeightByStep.get(a.stepId) ?? 1;
    const combo = comboMultiplier(econ, a.comboRunAfter);
    const replay = a.attemptIndex > 0 ? opts.policy.requeueXpFactor : 1;
    const hint = a.usedHint ? econ.hintXpFactor : 1;
    // Todo en milésimas enteras: el redondeo ocurre UNA vez, al cerrar la lección.
    stepMilli += econ.xpBase * xpWeight * difficultyFactor * combo * replay * hint * a.score * 1000;
  }

  const perfect = firstTryCount > 0 && correctFirstTry === firstTryCount;
  const netSeconds = elapsedMs / 1000;
  const paceBonus = netSeconds > 0 && netSeconds < opts.estimatedSeconds * 0.7 ? econ.bonusPaceXp : 0;
  const perfectBonus = perfect ? econ.bonusPerfectXp : 0;
  const firstClearBonus = opts.firstClear ? econ.bonusFirstClearXp : 0;
  const steps: MilliXp = milliXp(stepMilli);

  return {
    xp: toXp(steps) + perfectBonus + firstClearBonus + paceBonus,
    xpBreakdown: { steps: toXp(steps), perfect: perfectBonus, firstClear: firstClearBonus, pace: paceBonus },
    accuracy: score(weightTotal === 0 ? 0 : weightedScore / weightTotal),
    correctFirstTry,
    firstTryCount,
    maxCombo,
    elapsedMs,
    perfect,
  };
}
