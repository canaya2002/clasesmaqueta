/**
 * SENDA — el árbol de contenido: Course → Section → Unit → Lesson → Step.
 *
 * Dos decisiones atraviesan todo el modelo:
 *
 * 1. **Referencias por ID, nunca por índice.** Con `correctIndex`, arrastrar una opción en el editor cambia
 *    la respuesta correcta — y arrastrar una opción es literalmente lo que el cliente hará en la demo.
 * 2. **Cero propiedades opcionales: `null` explícito.** Copiar `hint?` de la especificación acaba en pelearse
 *    con `exactOptionalPropertyTypes` en cada reducer y apagar la bandera. La bandera es requisito.
 *
 * Y una tercera que no es obvia: **el contenido no guarda XP absoluto**. Lleva `xpWeight` (1|2|3) y la
 * lección lleva `difficulty` (1..5); el XP lo calcula la economía. Con XP persistido en 2,100 pasos, mover
 * el deslizador del Studio exigiría reescribir el contenido y el diff mostraría 2,100 filas cambiadas.
 */

import { z } from 'zod';
import {
  contentText,
  courseId,
  jsonSchema,
  lessonId,
  nonEmpty,
  sectionId,
  skillId,
  stepId,
  unitId,
} from './primitives';

/* ------------------------------------------------------------------- paleta */

/**
 * `lime` NO está en el enum.
 *
 * Es la decisión de color más consecuente del sistema: con lima disponible, un administrador no técnico
 * puede publicar una sección del camino ilegible (1.35:1) desde la pantalla que vende el white-label.
 * `grape` ocupa su lugar y cada token viaja con su pareja de texto.
 */
export const sectionPalette = z.enum(['brand', 'grape', 'mint', 'coral', 'amber', 'sky']);
export type SectionPalette = z.output<typeof sectionPalette>;

export const lessonKind = z.enum(['learn', 'practice', 'test', 'story', 'checkpoint']);
export type LessonKind = z.output<typeof lessonKind>;

export const publishState = z.enum(['draft', 'review', 'scheduled', 'published', 'unpublished', 'archived']);
export type PublishState = z.output<typeof publishState>;

export const difficulty = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
export type Difficulty = z.output<typeof difficulty>;

export const xpWeight = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type XpWeight = z.output<typeof xpWeight>;

/* --------------------------------------------------------------------- paso */

/**
 * Un paso tal como llega de la capa de datos: el `type` es un string cualquiera y el `data` es Json sin
 * validar. Ningún componente recibe esto: el motor corre `prepareStep()` y entrega un `PreparedStep`.
 *
 * La razón no es purismo. Un administrador importa un JSON escrito a mano durante la demo; tipar el repo
 * como si devolviera contenido válido (`Promise<Lesson>`) es un supuesto que se rompe en vivo.
 */
export const rawStepSchema = z.object({
  id: stepId,
  type: z.string().min(1),
  data: jsonSchema,
  hint: contentText.nullable(),
  explanation: contentText.nullable(),
  /** Peso de ECONOMÍA: cuánto XP otorga. Editable indirectamente desde /studio/gamification. */
  xpWeight,
  /**
   * Peso PSICOMÉTRICO: cuánta información diagnóstica aporta el paso. Deliberadamente SEPARADO de `xpWeight`.
   *
   * Son dos constructos distintos y mezclarlos tiene una consecuencia concreta: si la precisión se pondera
   * por el peso de economía y la métrica se recalcula perezosamente desde el registro de mutaciones —que es
   * exactamente cómo funciona esta capa mock—, retocar el XP en el Studio cambia la precisión HISTÓRICA de
   * un alumno que no ha contestado nada. El reporte trimestral pasa de 78% a 71% solo.
   */
  assessmentWeight: xpWeight,
  /** 1–3 skills. El enum cerrado vive en las fixtures; aquí solo se exige la forma. */
  skills: z.array(skillId).min(1).max(3),
  tags: z.array(z.string().min(1)),
});

export type RawStep = z.output<typeof rawStepSchema>;

/* ------------------------------------------------------------------ lección */

export const lessonSchema = z.object({
  id: lessonId,
  title: contentText,
  kind: lessonKind,
  difficulty,
  /**
   * La lección puede APAGAR los corazones, pero no encenderlos donde el plugin declara
   * `consumesHearts: false`. La intersección manda: descontar vidas en una flashcard envenena el repaso
   * espaciado, porque el usuario deja de admitir que no sabía.
   */
  heartsEnabled: z.boolean(),
  steps: nonEmpty(rawStepSchema),
});

export type Lesson = z.output<typeof lessonSchema>;

/* ------------------------------------------------------------------- unidad */

export const unitSchema = z.object({
  id: unitId,
  title: contentText,
  /**
   * VERBO OBSERVABLE + OBJETO + CONDICIÓN + CRITERIO MEDIBLE.
   *
   * "En esta unidad aprenderás sobre el teléfono" no es auditable, no se puede medir y en el Studio se ve
   * como relleno. `validate.ts` rechaza objetivos sin verbo observable o sin número.
   */
  objective: contentText,
  icon: z.string().min(1),
  /** DAG explícito por ids, no "la unidad anterior": el prerequisito implícito por índice hace imposible
   *  ramificar el camino y convierte el grafo en una fila. */
  prerequisites: z.array(unitId),
  lessons: nonEmpty(lessonSchema),
});

export type Unit = z.output<typeof unitSchema>;

/* ------------------------------------------------------------------ sección */

export const sectionSchema = z.object({
  id: sectionId,
  title: contentText,
  palette: sectionPalette,
  units: nonEmpty(unitSchema),
});

export type Section = z.output<typeof sectionSchema>;

/* -------------------------------------------------------------------- curso */

export const courseSchema = z.object({
  id: courseId,
  title: contentText,
  description: contentText,
  icon: z.string().min(1),
  palette: sectionPalette,
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  state: publishState,
  /** Versión mayor.menor: cada publicación sube la menor. */
  version: z.object({ major: z.number().int().min(0), minor: z.number().int().min(0) }),
  authorId: z.string().min(1),
  /**
   * El idioma del CONTENIDO, que es monolingüe por curso. El chrome tiene su propio locale, independiente:
   * meter los enunciados en el archivo de traducciones convierte 2,100 pasos en 2,100 claves i18n y hace
   * que el diff de contenido y el archivo de traducciones sean el mismo archivo.
   */
  contentLocale: z.enum(['es-MX', 'en-US']),
  sections: nonEmpty(sectionSchema),
});

export type Course = z.output<typeof courseSchema>;

/* --------------------------------------------------------------- recorridos */

export interface StepLocation {
  readonly course: Course;
  readonly section: Section;
  readonly sectionIndex: number;
  readonly unit: Unit;
  readonly unitIndex: number;
  readonly lesson: Lesson;
  readonly lessonIndex: number;
  readonly step: RawStep;
  readonly stepIndex: number;
}

/** Recorre el curso entero en orden. Lo consumen el walker de validación, el índice del ⌘K y el seed. */
export function* walkSteps(course: Course): Generator<StepLocation> {
  for (let si = 0; si < course.sections.length; si += 1) {
    const section = course.sections[si];
    if (section === undefined) continue;
    for (let ui = 0; ui < section.units.length; ui += 1) {
      const unit = section.units[ui];
      if (unit === undefined) continue;
      for (let li = 0; li < unit.lessons.length; li += 1) {
        const lesson = unit.lessons[li];
        if (lesson === undefined) continue;
        for (let pi = 0; pi < lesson.steps.length; pi += 1) {
          const step = lesson.steps[pi];
          if (step === undefined) continue;
          yield {
            course,
            section,
            sectionIndex: si,
            unit,
            unitIndex: ui,
            lesson,
            lessonIndex: li,
            step,
            stepIndex: pi,
          };
        }
      }
    }
  }
}
