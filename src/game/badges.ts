/**
 * Las 32 insignias, declaradas como DATOS.
 *
 * Escribir una función por insignia da 32 puntos donde un cambio en el ledger se puede olvidar, y ninguna
 * forma de responder "¿cuáles faltan?" sin leer 32 cuerpos. Aquí la condición es un dato y el evaluador es
 * uno solo.
 *
 * ## Por qué el umbral no puede mirar cualquier contador
 *
 * `metric` está restringido a `MonotoneCounter`, un subconjunto EXPLÍCITO de `Basis`. Fuera quedan tres
 * campos que parecen perfectamente razonables y no lo son:
 *
 * - `gems` es un SALDO y baja al comprar: una insignia de "1,000 gemas" se revoca al gastar 200 en un
 *   congelador. Se usa `gemsEarnedTotal`, que solo sube.
 * - `currentStreak` se reinicia: la insignia de "racha de 30" aparecería el día 30 y desaparecería el 31.
 *   Se usa `longestStreak`.
 * - `level` se mueve en los dos sentidos cuando el admin retoca la economía. Se usa `totalMilliXp`, que se
 *   mueve igual pero cuyo umbral el admin puede ver en las mismas unidades que edita.
 *
 * Una recompensa que se desbloquea y luego desaparece es peor que no darla.
 *
 * ## Las que no caben en un umbral
 *
 * Seis de las 32 no son contadores: dependen de CUÁNDO o de QUÉ, no de cuánto. Tienen su propio molde
 * `predicate`, con un vocabulario cerrado y evaluable — no una función libre, que volvería a ser código
 * disperso.
 */

import type { Basis, FoldResult, MonotoneCounter } from './types';

export type BadgeTier = 'bronze' | 'silver' | 'gold';

/** El vocabulario CERRADO de condiciones no numéricas. Añadir una obliga a tocar el evaluador. */
export type BadgePredicate =
  | 'first-lesson'
  | 'perfect-unit'
  | 'weekend-warrior'
  | 'early-bird'
  | 'night-owl'
  | 'comeback';

export interface BadgeDef {
  readonly id: string;
  readonly name: string;
  readonly hint: string;
  readonly tier: BadgeTier;
  readonly glyph: string;
  readonly condition:
    | { readonly kind: 'threshold'; readonly metric: MonotoneCounter; readonly at: number }
    | { readonly kind: 'predicate'; readonly of: BadgePredicate };
}

const t = (
  id: string,
  name: string,
  hint: string,
  tier: BadgeTier,
  glyph: string,
  metric: MonotoneCounter,
  at: number,
): BadgeDef => ({ id, name, hint, tier, glyph, condition: { kind: 'threshold', metric, at } });

const p = (
  id: string,
  name: string,
  hint: string,
  tier: BadgeTier,
  glyph: string,
  of: BadgePredicate,
): BadgeDef => ({ id, name, hint, tier, glyph, condition: { kind: 'predicate', of } });

export const BADGES: readonly BadgeDef[] = [
  /* --- constancia ---------------------------------------------------------------------------- */
  p('bdg_primera', 'Primer paso', 'Termina tu primera lección', 'bronze', '◆', 'first-lesson'),
  t('bdg_racha3', 'Tres seguidos', 'Tres días de racha', 'bronze', '▲', 'longestStreak', 3),
  t('bdg_racha7', 'Semana completa', 'Siete días de racha', 'bronze', '▲', 'longestStreak', 7),
  t('bdg_racha14', 'Quincena', 'Catorce días de racha', 'silver', '▲', 'longestStreak', 14),
  t('bdg_racha30', 'Un mes entero', 'Treinta días de racha', 'gold', '★', 'longestStreak', 30),
  t('bdg_racha60', 'Dos meses', 'Sesenta días de racha', 'gold', '★', 'longestStreak', 60),
  t('bdg_activos30', 'Presente', 'Treinta días con actividad', 'silver', '●', 'activeDays', 30),
  t('bdg_activos90', 'Habitual', 'Noventa días con actividad', 'gold', '●', 'activeDays', 90),

  /* --- volumen ------------------------------------------------------------------------------- */
  t('bdg_lec10', 'Diez lecciones', 'Completa diez lecciones', 'bronze', '◼', 'lessonsCompleted', 10),
  t('bdg_lec50', 'Cincuenta lecciones', 'Completa cincuenta lecciones', 'silver', '◼', 'lessonsCompleted', 50),
  t('bdg_lec100', 'Cien lecciones', 'Completa cien lecciones', 'gold', '◼', 'lessonsCompleted', 100),
  t('bdg_lec190', 'El catálogo entero', 'Completa las 190 lecciones', 'gold', '✦', 'lessonsCompleted', 190),
  t('bdg_unidad1', 'Unidad cerrada', 'Completa una unidad', 'bronze', '⬢', 'unitsCompleted', 1),
  t('bdg_unidad5', 'Cinco unidades', 'Completa cinco unidades', 'silver', '⬢', 'unitsCompleted', 5),
  t('bdg_unidad13', 'Media senda', 'Completa trece unidades', 'gold', '⬢', 'unitsCompleted', 13),
  t('bdg_unidad26', 'Senda completa', 'Completa las 26 unidades', 'gold', '✦', 'unitsCompleted', 26),

  /* --- precisión ----------------------------------------------------------------------------- */
  p('bdg_unidadperfecta', 'Sin un fallo', 'Completa una unidad entera sin fallar', 'gold', '◇', 'perfect-unit'),
  t('bdg_perfecta1', 'Impecable', 'Una lección perfecta', 'bronze', '◇', 'perfectLessons', 1),
  t('bdg_perfecta10', 'Diez impecables', 'Diez lecciones perfectas', 'silver', '◇', 'perfectLessons', 10),
  t('bdg_perfecta50', 'Cincuenta impecables', 'Cincuenta lecciones perfectas', 'gold', '◇', 'perfectLessons', 50),
  t('bdg_combo10', 'Racha de aciertos', 'Diez aciertos seguidos', 'bronze', '⚡', 'maxCombo', 10),
  t('bdg_combo25', 'Imparable', 'Veinticinco aciertos seguidos', 'silver', '⚡', 'maxCombo', 25),
  t('bdg_combo50', 'En racha larga', 'Cincuenta aciertos seguidos', 'gold', '⚡', 'maxCombo', 50),

  /* --- progresión ---------------------------------------------------------------------------- */
  t('bdg_xp1k', 'Mil de experiencia', 'Acumula 1,000 XP', 'bronze', '◈', 'totalMilliXp', 1_000_000),
  t('bdg_xp10k', 'Diez mil', 'Acumula 10,000 XP', 'silver', '◈', 'totalMilliXp', 10_000_000),
  t('bdg_xp50k', 'Cincuenta mil', 'Acumula 50,000 XP', 'gold', '◈', 'totalMilliXp', 50_000_000),
  t('bdg_misiones25', 'Cumplidor', 'Completa veinticinco misiones', 'silver', '✓', 'questsClaimed', 25),
  t('bdg_cofres10', 'Diez cofres', 'Abre diez cofres', 'bronze', '▣', 'chestsOpened', 10),

  /* --- hábito -------------------------------------------------------------------------------- */
  p('bdg_finde', 'Fin de semana', 'Practica un sábado y un domingo', 'bronze', '◐', 'weekend-warrior'),
  p('bdg_madrugador', 'Madrugador', 'Termina una lección antes de las 8:00', 'bronze', '☼', 'early-bird'),
  p('bdg_trasnochador', 'Trasnochador', 'Termina una lección después de las 22:00', 'bronze', '☾', 'night-owl'),
  p('bdg_regreso', 'De vuelta', 'Vuelve tras dos semanas sin entrar', 'silver', '↺', 'comeback'),
];

/** Las 32 declaradas. Si alguien añade una sin actualizar el número, la prueba lo dice. */
export const BADGE_COUNT = 32;

export interface BadgeContext {
  readonly basis: Basis;
  readonly fold: FoldResult;
  /** Días de la semana (lunes = 0) en que hubo actividad, y horas locales de fin de lección. */
  readonly activeWeekdays: ReadonlySet<number>;
  readonly finishHours: readonly number[];
  /** Mayor hueco en días entre dos jornadas activas, para "De vuelta". */
  readonly longestAbsence: number;
}

function meetsPredicate(of: BadgePredicate, ctx: BadgeContext): boolean {
  switch (of) {
    case 'first-lesson':
      return ctx.basis.lessonsCompleted >= 1;
    case 'perfect-unit':
      return ctx.basis.unitsCompleted >= 1 && ctx.basis.perfectLessons >= 1;
    case 'weekend-warrior':
      return ctx.activeWeekdays.has(5) && ctx.activeWeekdays.has(6);
    case 'early-bird':
      return ctx.finishHours.some((h) => h < 8);
    case 'night-owl':
      return ctx.finishHours.some((h) => h >= 22);
    case 'comeback':
      return ctx.longestAbsence >= 14 && ctx.basis.lessonsCompleted > 0;
  }
}

export function isUnlocked(badge: BadgeDef, ctx: BadgeContext): boolean {
  return badge.condition.kind === 'threshold'
    ? ctx.basis[badge.condition.metric] >= badge.condition.at
    : meetsPredicate(badge.condition.of, ctx);
}

export function unlockedBadges(ctx: BadgeContext): readonly BadgeDef[] {
  return BADGES.filter((b) => isUnlocked(b, ctx));
}
