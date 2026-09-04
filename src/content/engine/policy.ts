/**
 * SENDA — la política de sesión, derivada del tipo de lección.
 *
 * Existe porque el puerto `LessonRuntime` mezclaba dos cosas que no son la misma: capacidades de E/S (sonido,
 * reloj, persistencia) y REGLAS DE JUEGO. Con las reglas dentro del puerto, el preview del Studio acababa
 * corriendo una lección con reglas distintas a las del alumno — y la ruta que corta la experiencia, quedarse
 * sin corazones, era justo la que nunca se ejercitaba en el editor.
 *
 * Y hay un caso que la especificación no contempla y que rompe un examen: si fallar REVELA la respuesta y
 * además el paso reaparece al final, el alumno lo contesta ya sabiendo la respuesta. En `kind: 'test'` eso
 * es exposición de reactivo.
 */

import type { EconomyConfig } from './economy';
import type { Lesson } from './schema';

export interface SessionPolicy {
  readonly heartsEnabled: boolean;
  readonly requeueOnWrong: boolean;
  readonly maxRequeuesPerStep: number;
  readonly maxRequeuesPerSession: number;
  readonly revealOnWrong: boolean;
  readonly requeueXpFactor: number;
  readonly allowHints: boolean;
  readonly scoring: 'practice' | 'exam';
}

export function policyFor(lesson: Lesson, econ: EconomyConfig): SessionPolicy {
  const kindHearts = econ.heartsByLessonKind[lesson.kind];
  const heartsEnabled = lesson.heartsEnabled && kindHearts && econ.maxHearts > 0;

  if (lesson.kind === 'test' || lesson.kind === 'checkpoint') {
    return {
      heartsEnabled,
      requeueOnWrong: false,
      maxRequeuesPerStep: 0,
      maxRequeuesPerSession: 0,
      revealOnWrong: false,
      requeueXpFactor: 0,
      allowHints: false,
      scoring: 'exam',
    };
  }

  return {
    heartsEnabled,
    requeueOnWrong: true,
    maxRequeuesPerStep: 1,
    maxRequeuesPerSession: 3,
    revealOnWrong: true,
    requeueXpFactor: econ.replayXpFactor,
    allowHints: true,
    scoring: 'practice',
  };
}
