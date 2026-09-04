/**
 * El test de nivel. Decide en qué unidad empieza alguien que llega nuevo.
 *
 * La decisión de producto está en la regla de crédito, no en las preguntas:
 *
 * - Se acredita SOLO la corrida inicial de aciertos consecutivos. Un acierto suelto en la unidad 9 después
 *   de fallar la 4 no acredita nada: significa que esa pregunta era fácil o que se adivinó, no que domine
 *   las cinco unidades intermedias.
 * - Hacen falta DOS aciertos seguidos para acreditar algo. Con cuatro opciones, adivinar una es el 25%;
 *   adivinar dos seguidas es el 6%. Saltar contenido de cumplimiento por una moneda al aire es el error
 *   caro de esta pantalla: el alumno no ve lo que se saltó, y el reporte dirá que lo cubrió.
 * - Se acredita como mucho la MITAD del curso. Un test de cinco preguntas no puede certificar veintiséis
 *   unidades; quien de verdad las domina lo demostrará avanzando rápido, que además deja rastro.
 */

export interface PlacementProbe {
  /** Índice de la unidad de la que salió la pregunta, en orden de catálogo. */
  readonly unitIndex: number;
  readonly correct: boolean;
}

export interface PlacementResult {
  /** La unidad donde empieza el camino. */
  readonly startUnitIndex: number;
  /** Cuántas unidades quedan acreditadas por el test. */
  readonly creditedUnits: number;
  /** Por qué salió ese resultado. Se enseña al alumno: un salto sin explicación parece un error. */
  readonly reason: 'sin-credito' | 'credito-parcial' | 'tope-alcanzado';
}

export const MIN_STREAK_TO_CREDIT = 2;

export function placementResult(
  probes: readonly PlacementProbe[],
  totalUnits: number,
): PlacementResult {
  const cap = Math.floor(totalUnits / 2);

  let streak = 0;
  for (const probe of probes) {
    if (!probe.correct) break;
    streak += 1;
  }

  if (streak < MIN_STREAK_TO_CREDIT) {
    return { startUnitIndex: 0, creditedUnits: 0, reason: 'sin-credito' };
  }

  const lastCorrect = probes[streak - 1];
  // Se acredita HASTA la unidad probada, incluida: contestar bien la pregunta de la unidad 6 acredita la 6.
  const credited = Math.min((lastCorrect?.unitIndex ?? 0) + 1, cap);
  return {
    startUnitIndex: Math.min(credited, Math.max(0, totalUnits - 1)),
    creditedUnits: credited,
    reason: credited >= cap ? 'tope-alcanzado' : 'credito-parcial',
  };
}
