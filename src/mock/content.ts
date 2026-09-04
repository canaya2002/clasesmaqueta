/**
 * SENDA — materialización del contenido: del corpus a ~2,100 ejercicios.
 *
 * Los enunciados NO se repiten palabra por palabra. Cada hecho del corpus se proyecta con cuatro plantillas,
 * y una de ellas es NEGATIVA —"¿cuál de estas acciones NO corresponde?"—, que invierte el papel de la
 * respuesta correcta y los distractores. 182 hechos x 4 plantillas = 728 enunciados distintos.
 *
 * Se declara el número honesto: con 190 lecciones de ~11 pasos son ~2,090 ejercicios, así que cada
 * enunciado aparece unas 2.9 veces a lo largo del catálogo completo, siempre en lecciones distintas y con
 * distractores distintos. Un corpus de 2,100 enunciados únicos es un proyecto de autoría, no una semilla.
 */

import { mix32, u01 } from '@/lib/rng';
import type { Course, Lesson, RawStep, Section, Unit } from '@/content/engine/schema';
import { courseSchema } from '@/content/engine/schema';
import { asId, text, type Json } from '@/content/engine/primitives';
import { COURSES, LESSONS, lessonsOfUnit, SECTIONS } from '@/content/seed/catalog';
import { UNITS, type Fact } from '@/content/seed/corpus';

const NS_STEP = 0x5e11c001;
const NS_OPT = 0x5e11c002;
const STEPS_PER_LESSON = 11;

type Template = 0 | 1 | 2 | 3;

/** Un `switch` en vez de un cast: el compilador comprueba que la unión está cubierta. */
function templateAt(n: number): Template {
  switch (n % 4) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    default:
      return 3;
  }
}

function prompt(fact: Fact, template: Template): string {
  switch (template) {
    case 0:
      return `¿Cómo se procede ante ${fact.subject}?`;
    case 1:
      return `Un compañero te pregunta qué hacer con ${fact.subject}. ¿Qué le respondes?`;
    case 2:
      return `¿Cuál es la acción correcta cuando se presenta ${fact.subject}?`;
    default:
      return `Ante ${fact.subject}, ¿cuál de estas acciones NO corresponde?`;
  }
}

interface Built {
  readonly promptText: string;
  readonly options: readonly { readonly id: string; readonly text: string }[];
  readonly correctId: string;
}

/**
 * La plantilla negativa invierte los papeles: la respuesta correcta pasa a ser uno de los distractores y
 * el acierto original se convierte en distractor. Es lo que hace que el mismo hecho produzca un ejercicio
 * genuinamente distinto y no una variación cosmética del enunciado.
 */
function buildOptions(fact: Fact, template: Template, salt: number): Built {
  const negative = template === 3;
  const correctText = negative ? (fact.wrong[salt % fact.wrong.length] ?? fact.wrong[0] ?? '') : fact.correct;
  const distractors = negative
    ? [fact.correct, ...fact.wrong.filter((w) => w !== correctText)]
    : [...fact.wrong];

  const chosen = distractors.slice(0, 3);
  const all = [correctText, ...chosen];

  // Orden determinista por hecho y plantilla: la demo es idéntica en cada máquina.
  const ordered = all
    .map((t, i) => ({ t, k: u01(mix32(NS_OPT, salt, i)) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.t);

  const options = ordered.map((t, i) => ({
    id: `opt_${(salt * 7 + i).toString(32).padStart(4, '0').slice(-6)}`,
    text: t,
  }));
  const correct = options.find((o) => o.text === correctText);

  return {
    promptText: prompt(fact, template),
    options,
    correctId: correct?.id ?? options[0]?.id ?? 'opt_0000',
  };
}

function stepIdFor(lessonOrdinal: number, index: number): string {
  return `stp_${mix32(NS_STEP, lessonOrdinal, index).toString(32).padStart(8, '0').slice(-8)}`;
}

function buildStep(lessonOrdinal: number, index: number, fact: Fact, template: Template): RawStep {
  const salt = mix32(NS_STEP, lessonOrdinal, index) % 100000;
  const built = buildOptions(fact, template, salt);

  const data: Json = {
    prompt: built.promptText,
    options: built.options.map((o) => ({ id: o.id, text: o.text })),
    correctOptionId: built.correctId,
    shuffle: true,
    figure: null,
  };

  return {
    id: asId<'StepId'>(stepIdFor(lessonOrdinal, index)),
    type: 'multiple-choice',
    data,
    hint: index % 4 === 0 ? text('Piensa en qué queda registrado y quién lo va a leer después.') : null,
    explanation: text(fact.explanation),
    xpWeight: index % 5 === 0 ? 2 : 1,
    assessmentWeight: fact.legal ? 3 : index % 3 === 0 ? 2 : 1,
    skills: [asId<'SkillId'>(fact.skill)],
    tags: fact.legal ? ['contenido-de-ejemplo'] : [],
  };
}

function buildLesson(unitIndex: number, lessonOrdinal: number, localIndex: number): Lesson {
  const unit = UNITS[unitIndex];
  const meta = LESSONS[lessonOrdinal];
  if (unit === undefined || meta === undefined) throw new Error('Índice de contenido inconsistente');

  const steps: RawStep[] = [];
  for (let i = 0; i < STEPS_PER_LESSON; i += 1) {
    const factIndex = (localIndex * STEPS_PER_LESSON + i) % unit.facts.length;
    const fact = unit.facts[factIndex];
    if (fact === undefined) continue;
    const template = templateAt(localIndex + i);
    steps.push(buildStep(lessonOrdinal, i, fact, template));
  }

  const first = steps[0];
  if (first === undefined) throw new Error(`La lección ${meta.slug} quedó sin pasos`);

  return {
    id: asId<'LessonId'>(`lsn_${lessonOrdinal.toString(32).padStart(8, '0')}`),
    title: text(meta.title),
    kind: meta.kind,
    difficulty: meta.difficulty,
    // Aprender y los casos NO gastan vidas: el muro de corazones en capacitación obligatoria no monetiza,
    // genera tickets a Recursos Humanos.
    heartsEnabled: meta.kind !== 'learn' && meta.kind !== 'story',
    steps: [first, ...steps.slice(1)],
  };
}

function buildUnit(unitIndex: number): Unit {
  const topic = UNITS[unitIndex];
  if (topic === undefined) throw new Error(`Unidad ${String(unitIndex)} inexistente`);
  const lessonMetas = lessonsOfUnit(unitIndex);

  const lessons = lessonMetas.map((meta, i) => buildLesson(unitIndex, meta.ordinal, i));
  const first = lessons[0];
  if (first === undefined) throw new Error(`La unidad ${topic.slug} quedó sin lecciones`);

  // El grafo de prerequisitos es explícito por id, no "la unidad anterior": el prerequisito implícito por
  // índice hace imposible ramificar el camino y convierte el DAG en una fila.
  //
  // Y no cruza la frontera del curso. Esto lo cazó el propio validador: la primera unidad de cada curso
  // declaraba como prerequisito la última del curso ANTERIOR, que no existe en su grafo. Un alumno de
  // Cobranza habría visto su primera unidad bloqueada por una unidad de Primer Contacto que no tiene
  // asignada — y en pantalla se habría visto como un camino roto sin explicación.
  const course = COURSES.find((c) => unitIndex >= c.unitRange[0] && unitIndex < c.unitRange[1]);
  const isFirstOfCourse = course === undefined || unitIndex === course.unitRange[0];
  const prerequisites = isFirstOfCourse
    ? []
    : [asId<'UnitId'>(`unt_${(unitIndex - 1).toString(32).padStart(8, '0')}`)];

  return {
    id: asId<'UnitId'>(`unt_${unitIndex.toString(32).padStart(8, '0')}`),
    title: text(topic.title),
    objective: text(topic.objective),
    icon: topic.icon,
    prerequisites,
    lessons: [first, ...lessons.slice(1)],
  };
}

const cache = new Map<string, Course>();

export function materializeCourse(courseSlug: string): Course {
  const cached = cache.get(courseSlug);
  if (cached !== undefined) return cached;

  const meta = COURSES.find((c) => c.slug === courseSlug);
  if (meta === undefined) throw new Error(`Curso desconocido: ${courseSlug}`);
  const courseIndex = COURSES.indexOf(meta);

  const sections: Section[] = [];
  for (const s of SECTIONS.filter((x) => x.courseSlug === courseSlug)) {
    const units: Unit[] = [];
    for (let u = s.unitRange[0]; u < s.unitRange[1]; u += 1) units.push(buildUnit(u));
    const firstUnit = units[0];
    if (firstUnit === undefined) continue;
    sections.push({
      id: asId<'SectionId'>(`sec_${SECTIONS.indexOf(s).toString(32).padStart(8, '0')}`),
      title: text(s.title),
      palette: s.palette,
      units: [firstUnit, ...units.slice(1)],
    });
  }

  const firstSection = sections[0];
  if (firstSection === undefined) throw new Error(`El curso ${courseSlug} quedó sin secciones`);

  // Se parsea con el schema: el contenido semilla pasa por la MISMA puerta que un JSON importado a mano.
  // Si el generador produjera algo inválido, se sabría aquí y no en la primera lección de la demo.
  const course = courseSchema.parse({
    id: `crs_${courseIndex.toString(32).padStart(8, '0')}`,
    title: meta.title,
    description: meta.description,
    icon: meta.icon,
    palette: meta.palette,
    level: meta.level,
    state: 'published',
    version: { major: 1, minor: 0 },
    authorId: 'seed',
    contentLocale: 'es-MX',
    sections: [firstSection, ...sections.slice(1)],
  });

  cache.set(courseSlug, course);
  return course;
}

export function materializeAll(): readonly Course[] {
  return COURSES.map((c) => materializeCourse(c.slug));
}

export function clearContentCache(): void {
  cache.clear();
}
