/**
 * SENDA — el walker de validación.
 *
 * Tres pasadas, y la primera es la que importa: **ejecuta `solution(data)` contra `grade` y exige score 1**.
 * Lo estándar es validar solo el esquema Zod; un paso que pasa Zod y es IRRESOLUBLE llega al player y le
 * quita corazones a 300 personas sin que nadie se entere hasta que alguien abre un ticket.
 */

import { analyzePrereqs } from './graph';
import type { ValidationIssue, ValidationReport } from './issues';
import { localIssue, summarize } from './issues';
import type { ContentPath, PathSegment } from './path';
import { findDynamic } from './registry';
import type { Course, Lesson, Section, Unit } from './schema';
import { situate } from './step';
import { text, type UnitId } from './primitives';

/**
 * Verbos observables admitidos en un objetivo de aprendizaje.
 *
 * La lista es CERRADA a propósito. Un objetivo con la forma "VERBO OBSERVABLE + OBJETO + CONDICIÓN +
 * CRITERIO MEDIBLE" es un contrato que un gerente de capacitación puede firmar; "aprenderás sobre el
 * teléfono" no es auditable ni se puede medir, y en el Studio se ve como relleno.
 */
const OBSERVABLE_VERBS = [
  'contestar', 'calificar', 'transferir', 'registrar', 'clasificar', 'identificar', 'redactar',
  'verificar', 'escalar', 'documentar', 'explicar', 'aplicar', 'detectar', 'priorizar',
  'confirmar', 'archivar', 'agendar', 'cobrar', 'negociar', 'reportar', 'resolver', 'entregar',
] as const;

const MAX_DESCRIBE = 90;

export interface ValidateOptions {
  /** Ids de medios que existen en la biblioteca. Lo que no esté aquí es una referencia rota. */
  readonly knownMedia: ReadonlySet<string>;
  readonly knownSkills: ReadonlySet<string>;
  /** Versión de cada dinámica en ESTE build. Un paquete importado puede traer una más nueva. */
  readonly dynamicVersions: ReadonlyMap<string, number>;
}

function seg(kind: 'course' | 'section' | 'unit' | 'lesson' | 'step', id: string, index: number, title: string): PathSegment {
  return { kind, id, index, title: text(title) };
}

export function validateCourse(course: Course, opts: ValidateOptions): ValidationReport {
  const started = performanceNow();
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  const coursePath: ContentPath = [seg('course', course.id, 0, course.title)];

  const push = (issue: ValidationIssue): void => {
    issues.push(issue);
  };

  const checkDuplicate = (id: string, path: ContentPath): void => {
    if (seenIds.has(id)) {
      push(situate(localIssue('duplicate-id', `el identificador ${id} está repetido en el curso`), path));
    }
    seenIds.add(id);
  };

  for (let si = 0; si < course.sections.length; si += 1) {
    const section: Section | undefined = course.sections[si];
    if (section === undefined) continue;
    const sectionPath: ContentPath = [...coursePath, seg('section', section.id, si, section.title)];
    checkDuplicate(section.id, sectionPath);

    if (section.units.length === 0) {
      push(situate(localIssue('empty-section', 'la sección está vacía (0 unidades)'), sectionPath));
    }

    for (let ui = 0; ui < section.units.length; ui += 1) {
      const unit: Unit | undefined = section.units[ui];
      if (unit === undefined) continue;
      const unitPath: ContentPath = [...sectionPath, seg('unit', unit.id, ui, unit.title)];
      checkDuplicate(unit.id, unitPath);

      validateObjective(unit, unitPath, push);

      if (unit.lessons.length === 0) {
        push(situate(localIssue('empty-unit', 'la unidad no tiene lecciones'), unitPath));
      }

      for (let li = 0; li < unit.lessons.length; li += 1) {
        const lesson: Lesson | undefined = unit.lessons[li];
        if (lesson === undefined) continue;
        const lessonPath: ContentPath = [...unitPath, seg('lesson', lesson.id, li, lesson.title)];
        checkDuplicate(lesson.id, lessonPath);

        if (lesson.steps.length === 0) {
          push(situate(localIssue('empty-lesson', 'la lección no tiene ejercicios'), lessonPath));
        }

        for (let pi = 0; pi < lesson.steps.length; pi += 1) {
          const step = lesson.steps[pi];
          if (step === undefined) continue;
          const stepPath: ContentPath = [...lessonPath, seg('step', step.id, pi, text(''))];
          checkDuplicate(step.id, stepPath);

          const dynamic = findDynamic(step.type);
          if (dynamic === null) {
            push(
              situate(
                localIssue('plugin-unknown', `el tipo de ejercicio “${step.type}” no existe en esta versión`, {
                  field: ['type'],
                }),
                stepPath,
              ),
            );
            continue;
          }

          const localVersion = opts.dynamicVersions.get(step.type);
          if (localVersion !== undefined && dynamic.version < localVersion) {
            push(
              situate(
                localIssue(
                  'plugin-version-ahead',
                  `el paquete usa la versión ${localVersion} de “${step.type}” y este build tiene la ${dynamic.version}`,
                ),
                stepPath,
              ),
            );
          }

          const bound = dynamic.bind(step.data);
          if (!bound.ok) {
            for (const i of bound.error) push(situate(i, stepPath));
            continue;
          }

          // Los problemas de SIGNIFICADO que declara el propio plugin.
          for (const i of bound.value.issues()) push(situate(i, stepPath));

          // PASADA 1: ¿es resoluble? Se ejecuta la solución del plugin contra su propia calificación.
          const graded = bound.value.grade(bound.value.solution());
          if (!graded.ok) {
            push(
              situate(
                localIssue('unsolvable-step', 'la respuesta correcta del ejercicio no valida contra su propio esquema'),
                stepPath,
              ),
            );
          } else if (!graded.value.correct || graded.value.score < 1) {
            push(
              situate(
                localIssue(
                  'unsolvable-step',
                  `el ejercicio no se puede resolver: su propia respuesta correcta califica ${graded.value.score.toFixed(2)}`,
                  { fixHint: 'Revisa que la opción marcada como correcta exista entre las opciones.' },
                ),
                stepPath,
              ),
            );
          }

          // PASADA 2: cierre de referencias.
          for (const ref of bound.value.refs()) {
            if (!opts.knownMedia.has(ref)) {
              push(situate(localIssue('broken-ref', `el recurso ${ref} no existe en la biblioteca de medios`), stepPath));
            }
          }
          for (const skill of step.skills) {
            if (!opts.knownSkills.has(skill)) {
              push(situate(localIssue('skill-unknown', `la habilidad ${skill} no está en el catálogo`, { field: ['skills'] }), stepPath));
            }
          }

          if (bound.value.describe().length > MAX_DESCRIBE) {
            push(
              situate(
                localIssue('text-too-long', `la descripción del paso pasa de ${MAX_DESCRIBE} caracteres`, {
                  severity: 'warning',
                }),
                stepPath,
              ),
            );
          }

          if (lesson.kind === 'test' && step.explanation === null) {
            push(
              situate(
                localIssue('missing-explanation', 'un ejercicio de examen sin explicación no enseña nada al fallar', {
                  severity: 'warning',
                }),
                stepPath,
              ),
            );
          }
        }
      }
    }
  }

  // PASADA 3: el grafo de prerequisitos.
  const graph = new Map<UnitId, readonly UnitId[]>();
  const unitTitle = new Map<UnitId, string>();
  for (const section of course.sections) {
    for (const unit of section.units) {
      graph.set(unit.id, unit.prerequisites);
      unitTitle.set(unit.id, unit.title);
    }
  }
  const analysis = analyzePrereqs(graph);
  for (const cycle of analysis.cycles) {
    const names = cycle.map((id) => unitTitle.get(id) ?? id);
    push(
      situate(
        localIssue('prereq-cycle', `ciclo de prerequisitos: ${[...names, names[0] ?? ''].join(' → ')}`),
        coursePath,
      ),
    );
  }
  for (const orphan of analysis.unreachable) {
    push(
      situate(
        localIssue(
          'prereq-unreachable',
          `la unidad “${unitTitle.get(orphan) ?? orphan}” declara un prerequisito que no existe en el curso`,
        ),
        coursePath,
      ),
    );
  }

  return summarize(issues, performanceNow() - started);
}

function validateObjective(unit: Unit, path: ContentPath, push: (i: ValidationIssue) => void): void {
  const objective = unit.objective.toLocaleLowerCase('es-MX');
  const hasVerb = OBSERVABLE_VERBS.some((v) => objective.startsWith(v) || objective.includes(` ${v}`));
  const hasNumber = /\d/.test(objective);

  if (!hasVerb) {
    push(
      situate(
        localIssue('schema', 'el objetivo no empieza con un verbo observable', {
          field: ['objective'],
          severity: 'warning',
          fixHint: `Usa uno de: ${OBSERVABLE_VERBS.slice(0, 6).join(', ')}…`,
        }),
        path,
      ),
    );
  }
  if (!hasNumber) {
    push(
      situate(
        localIssue('schema', 'el objetivo no declara un criterio medible (falta un número)', {
          field: ['objective'],
          severity: 'warning',
          fixHint: 'Ej.: “…en menos de 3 minutos” o “…con 5 preguntas”.',
        }),
        path,
      ),
    );
  }
}

/* eslint-disable-next-line no-restricted-syntax -- medir la propia validación es su razón de existir */
const performanceNow = (): number => (typeof performance === 'undefined' ? 0 : performance.now());

export { OBSERVABLE_VERBS };
