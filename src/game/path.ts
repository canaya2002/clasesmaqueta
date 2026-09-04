/**
 * El estado de cada nodo del camino. Puro: la estructura del catálogo entra como argumento.
 *
 * Dos reglas de desbloqueo que se confunden a menudo y son distintas:
 *
 * - **Entre unidades manda el GRAFO.** `prerequisites` es una lista de ids, no un orden lineal, porque el
 *   contenido lo edita un administrador desde el Studio y puede hacer que dos unidades converjan en una
 *   tercera. Un contador de "unidades completadas" no puede responder "¿está desbloqueada la unidad 7?".
 * - **Dentro de una unidad manda el ORDEN.** Las lecciones se abren una a una: es lo que hace que el
 *   camino se lea como un camino y no como una cuadrícula de opciones.
 *
 * Y hay exactamente UN nodo `current` en todo el catálogo. Marcar como "actual" la primera lección
 * disponible de cada unidad desbloqueada da cinco banderas a la vez y ninguna dice a dónde ir.
 */

export type NodeState = 'done' | 'current' | 'available' | 'locked';

export interface PathUnitInput {
  readonly unitId: string;
  /** Las lecciones EN ORDEN. */
  readonly lessonIds: readonly string[];
  readonly prerequisites: readonly string[];
}

export interface PathResult {
  readonly lessonState: ReadonlyMap<string, NodeState>;
  readonly unitUnlocked: ReadonlySet<string>;
  /** La lección a la que apunta el botón grande. `null` solo si el catálogo entero está completo. */
  readonly currentLessonId: string | null;
  readonly currentUnitId: string | null;
}

export function pathStates(
  units: readonly PathUnitInput[],
  clearedLessons: ReadonlySet<string>,
  completedUnits: ReadonlySet<string>,
): PathResult {
  const lessonState = new Map<string, NodeState>();
  const unitUnlocked = new Set<string>();
  let currentLessonId: string | null = null;
  let currentUnitId: string | null = null;

  for (const unit of units) {
    const unlocked = unit.prerequisites.every((p) => completedUnits.has(p));
    if (unlocked) unitUnlocked.add(unit.unitId);

    let openNext = unlocked;
    for (const lessonId of unit.lessonIds) {
      if (clearedLessons.has(lessonId)) {
        lessonState.set(lessonId, 'done');
        continue;
      }
      if (!openNext) {
        lessonState.set(lessonId, 'locked');
        continue;
      }
      // La primera no superada de la primera unidad abierta es la ÚNICA actual del catálogo.
      if (currentLessonId === null) {
        currentLessonId = lessonId;
        currentUnitId = unit.unitId;
        lessonState.set(lessonId, 'current');
      } else {
        lessonState.set(lessonId, 'available');
      }
      // Dentro de la unidad, la siguiente queda cerrada hasta superar esta.
      openNext = false;
    }
  }

  return { lessonState, unitUnlocked, currentLessonId, currentUnitId };
}
