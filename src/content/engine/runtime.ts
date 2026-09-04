/**
 * SENDA — el PUERTO de la sesión de lección.
 *
 * Es una interfaz creada FUERA de React y pasada como prop, no un contexto. La diferencia importa: con un
 * `LessonProvider` y un flag `isPreview`, el día que alguien olvide el flag el editor del Studio empieza a
 * gastar corazones reales y a escribir intentos en la analítica. Con dos implementaciones distintas
 * —`createSessionRuntime` y `createPreviewRuntime`— eso no compila.
 *
 * El puerto lleva SOLO entrada y salida. Las REGLAS DE JUEGO viven en `SessionPolicy`, derivada del tipo de
 * lección: con las reglas dentro del puerto, el preview acabaría corriendo una lección con reglas distintas
 * a las del alumno, y la ruta que corta la experiencia —quedarse sin corazones— sería justo la que nunca se
 * ejercita en el editor.
 */

import type { Attempt } from './session';
import type { ContentPath } from './path';
import type { LessonId, StepId } from './primitives';

export type SessionSfxId = 'correct' | 'wrong' | 'combo' | 'tap';

export interface HeartsSnapshot {
  readonly enabled: boolean;
  readonly current: number;
  readonly max: number;
  /** Instante de RELOJ DE PARED en que llega el siguiente corazón. `null` si están llenos o apagados. */
  readonly nextRefillAtRealMs: number | null;
  readonly unlimited: boolean;
}

export interface StepReport {
  readonly stepId: StepId;
  readonly lessonId: LessonId;
  /** Fija la VERSIÓN del contenido reportado: si el paso se edita, el reporte se cierra solo. */
  readonly contentHash: string;
  readonly reason: 'wrong-answer' | 'unclear' | 'typo' | 'other';
  readonly comment: string;
  readonly path: ContentPath | null;
}

export interface LessonRuntime {
  /** Nivel 1 de la precedencia de corazones: el anfitrión puede apagarlos (preview, test de nivel). */
  readonly hostAllowsHearts: boolean;
  /** `false` en el preview y en el modo "practicar sin corazones": se juega, pero no otorga progreso. */
  readonly awardsProgress: boolean;
  readonly hearts: HeartsSnapshot;
  readonly spendHeart: () => void;
  readonly refillHearts: () => void;
  readonly playSfx: (id: SessionSfxId) => void;
  readonly burst: (element: Element | null) => void;
  readonly persistAttempt: (attempt: Attempt) => void;
  readonly reportStep: (report: StepReport) => void;
}

/**
 * Por qué los corazones están como están. El Studio muestra esta razón literalmente en el preview: sin
 * ella, depurar seis interruptores encadenados es adivinar cuál de los seis ganó.
 */
export type HeartsOffReason =
  | 'config-off'
  | 'host-off'
  | 'practice-override'
  | 'unlimited-boost'
  | 'lesson-off'
  | 'dynamic-off'
  | 'none';

/** Qué enseña el encabezado. Son TRES estados, no un booleano. */
export type HeartsHud = 'hidden' | 'counter' | 'infinite';

export interface HeartsResolution {
  readonly hud: HeartsHud;
  /** ¿Se descuenta al fallar? */
  readonly consumes: boolean;
  readonly reason: HeartsOffReason;
  /** El HUD lleva insignia de "práctica — no cuenta para progreso". */
  readonly practiceBadge: boolean;
}

export interface HeartsInput {
  readonly heartsSystemEnabled: boolean;
  readonly maxHearts: number;
  readonly hostAllowsHearts: boolean;
  readonly practiceOverride: boolean;
  readonly unlimited: boolean;
  readonly lessonHeartsEnabled: boolean;
  readonly dynamicConsumesHearts: boolean;
}

/**
 * Los SEIS interruptores de corazones, con precedencia declarada. Primera coincidencia gana.
 *
 * Con seis banderas booleanas y sin orden escrito, el resultado depende del orden de los `if` que escribió
 * quien tocó el archivo al final. Aquí es una función pura con un test por rama.
 *
 * Los dos ejes están separados a propósito, porque no son el mismo interruptor:
 *
 * - Apagarlos porque la LECCIÓN los apaga significa que no hay vidas en juego: el contador sobra y se
 *   esconde.
 * - Apagarlos porque esta DINÁMICA no castiga —una flashcard— significa que el alumno SÍ tiene vidas, solo
 *   que este ejercicio no se las quita. Esconder el contador ahí lo dejaría sin saber cuántas le quedan.
 * - El potenciador tampoco esconde: enseña el infinito, que es justo lo que el alumno pagó por ver.
 */
export function resolveHearts(input: HeartsInput): HeartsResolution {
  if (!input.heartsSystemEnabled || input.maxHearts <= 0) {
    return { hud: 'hidden', consumes: false, reason: 'config-off', practiceBadge: false };
  }
  if (!input.hostAllowsHearts) {
    return { hud: 'hidden', consumes: false, reason: 'host-off', practiceBadge: false };
  }
  // Va ANTES del potenciador: quien eligió "practicar sin corazones" tras quedarse a cero necesita saber
  // que sigue sin progreso aunque en ese momento tenga un potenciador vigente.
  if (input.practiceOverride) {
    return { hud: 'counter', consumes: false, reason: 'practice-override', practiceBadge: true };
  }
  if (input.unlimited) {
    return { hud: 'infinite', consumes: false, reason: 'unlimited-boost', practiceBadge: false };
  }
  if (!input.lessonHeartsEnabled) {
    return { hud: 'hidden', consumes: false, reason: 'lesson-off', practiceBadge: false };
  }
  if (!input.dynamicConsumesHearts) {
    return { hud: 'counter', consumes: false, reason: 'dynamic-off', practiceBadge: false };
  }
  return { hud: 'counter', consumes: true, reason: 'none', practiceBadge: false };
}
