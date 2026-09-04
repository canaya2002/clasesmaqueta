/**
 * SENDA — el ÚNICO módulo isomorfo del mundo.
 *
 * Es puro y determinista, no importa nada de `src/mock/**`, y por eso el servidor puede consumirlo:
 * `generateStaticParams`, los `<title>` y los banners de sección pre-pintados salen de aquí.
 *
 * Matiza la regla de "el mock es client-only" a propósito. La reacción normal a esa regla es que el
 * servidor pinte solo esqueletos, y eso regala 600–900 ms de LCP en un móvil de gama media: el elemento más
 * grande de `/aprende` acabaría dependiendo del bundle de la aplicación. El ÍNDICE del contenido no tiene
 * nada que ocultar; los pasos, el progreso y los usuarios siguen materializándose solo en cliente.
 */

import { COURSE_UNIT_COUNTS, UNITS } from './corpus';
import type { SectionPalette } from '../engine/schema';

export interface CourseIndexEntry {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly palette: SectionPalette;
  readonly level: 1 | 2 | 3;
  readonly sectionSlugs: readonly string[];
  readonly unitRange: readonly [number, number];
}

export interface SectionIndexEntry {
  readonly slug: string;
  readonly title: string;
  readonly courseSlug: string;
  readonly palette: SectionPalette;
  readonly unitRange: readonly [number, number];
}

export interface LessonIndexEntry {
  readonly slug: string;
  readonly title: string;
  readonly ordinal: number;
  readonly unitIndex: number;
  readonly unitSlug: string;
  readonly courseSlug: string;
  readonly sectionSlug: string;
  readonly kind: 'learn' | 'practice' | 'test' | 'story' | 'checkpoint';
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
}

export const COURSES: readonly CourseIndexEntry[] = [
  {
    slug: 'primer-contacto',
    title: 'Primer Contacto',
    description: 'Todo lo que ocurre antes de que un caso exista: la llamada, la cita y el límite de lo que se puede decir.',
    icon: 'phone-call',
    palette: 'brand',
    level: 1,
    sectionSlugs: ['la-llamada', 'la-persona', 'el-registro'],
    unitRange: [0, COURSE_UNIT_COUNTS[0]],
  },
  {
    slug: 'expediente-impecable',
    title: 'Expediente Impecable',
    description: 'El expediente como instrumento de trabajo: qué entra, cómo se registra y qué plazos corren.',
    icon: 'folder-check',
    palette: 'sky',
    level: 2,
    sectionSlugs: ['la-forma', 'el-tiempo', 'la-prueba'],
    unitRange: [COURSE_UNIT_COUNTS[0], COURSE_UNIT_COUNTS[0] + COURSE_UNIT_COUNTS[1]],
  },
  {
    slug: 'cobranza-con-dignidad',
    title: 'Cobranza con Dignidad',
    description: 'Cobrar sin perder al cliente: lo que la política permite, los planes que se sostienen y las conversaciones difíciles.',
    icon: 'hand-coins',
    palette: 'amber',
    level: 2,
    sectionSlugs: ['el-saldo', 'la-conversacion'],
    unitRange: [
      COURSE_UNIT_COUNTS[0] + COURSE_UNIT_COUNTS[1],
      COURSE_UNIT_COUNTS[0] + COURSE_UNIT_COUNTS[1] + COURSE_UNIT_COUNTS[2],
    ],
  },
];

/** Cuántas unidades tiene cada sección, en orden. Suma 26. */
const SECTION_UNIT_SPLIT: readonly number[] = [4, 3, 3, 3, 3, 3, 4, 3];

const SECTION_TITLES: Readonly<Record<string, string>> = {
  'la-llamada': 'La llamada',
  'la-persona': 'La persona',
  'el-registro': 'El registro',
  'la-forma': 'La forma',
  'el-tiempo': 'El tiempo',
  'la-prueba': 'La prueba',
  'el-saldo': 'El saldo',
  'la-conversacion': 'La conversación',
};

export const SECTIONS: readonly SectionIndexEntry[] = (() => {
  const out: SectionIndexEntry[] = [];
  let unitCursor = 0;
  let splitCursor = 0;
  for (const course of COURSES) {
    for (const slug of course.sectionSlugs) {
      const count = SECTION_UNIT_SPLIT[splitCursor] ?? 3;
      splitCursor += 1;
      out.push({
        slug,
        title: SECTION_TITLES[slug] ?? slug,
        courseSlug: course.slug,
        palette: course.palette,
        unitRange: [unitCursor, unitCursor + count],
      });
      unitCursor += count;
    }
  }
  return out;
})();

/**
 * Cuántas lecciones tiene cada unidad. Suma 190.
 *
 * Es un arreglo LITERAL, no una generación con RNG: `seedrandom` nunca decide cuántas lecciones tiene una
 * unidad ni de qué tipo son. Determinista no es lo mismo que memorizable, y el presentador necesita que la
 * lección 4 sea SIEMPRE la misma.
 */
export const LESSON_COUNTS: readonly number[] = [
  9, 8, 8, 7, 7, 7, 6, 6, 6, 5, // Primer Contacto — 69
  9, 8, 8, 7, 7, 7, 6, 6, 5, //     Expediente Impecable — 63
  10, 9, 9, 8, 8, 7, 7, //          Cobranza con Dignidad — 58
];

export const TOTAL_LESSONS = LESSON_COUNTS.reduce((a, b) => a + b, 0);

if (TOTAL_LESSONS !== 190) {
  throw new Error(`LESSON_COUNTS suma ${String(TOTAL_LESSONS)} y debe sumar 190`);
}

/**
 * El tipo de lección por posición dentro de su unidad. Función PURA, no muestreo.
 *
 * El patrón: se aprende, se practica, aparece un caso, se practica más y se cierra con evaluación. La
 * última de cada unidad es checkpoint; la penúltima de las unidades largas, examen.
 */
export function lessonKindAt(index: number, total: number): LessonIndexEntry['kind'] {
  if (index === total - 1) return 'checkpoint';
  if (total >= 8 && index === total - 2) return 'test';
  if (index === 0) return 'learn';
  if (index === 2) return 'story';
  return index % 2 === 1 ? 'practice' : 'learn';
}

/** Dificultad creciente dentro de la unidad, con el checkpoint siempre en el tope. */
export function difficultyAt(index: number, total: number): LessonIndexEntry['difficulty'] {
  if (index === total - 1) return 5;
  const ratio = total <= 1 ? 0 : index / (total - 1);
  const level = 1 + Math.floor(ratio * 3.4);
  // Un `switch` explícito en vez de un cast: el compilador comprueba que la unión está cubierta.
  switch (level) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    default:
      return 4;
  }
}

export const LESSONS: readonly LessonIndexEntry[] = (() => {
  const out: LessonIndexEntry[] = [];
  let ordinal = 0;
  for (let u = 0; u < UNITS.length; u += 1) {
    const unit = UNITS[u];
    const count = LESSON_COUNTS[u] ?? 7;
    if (unit === undefined) continue;
    const section = SECTIONS.find((s) => u >= s.unitRange[0] && u < s.unitRange[1]);
    const course = COURSES.find((c) => u >= c.unitRange[0] && u < c.unitRange[1]);
    for (let i = 0; i < count; i += 1) {
      const kind = lessonKindAt(i, count);
      out.push({
        slug: `${unit.slug}-${String(i + 1).padStart(2, '0')}`,
        title: lessonTitle(unit.title, i, count, kind),
        ordinal,
        unitIndex: u,
        unitSlug: unit.slug,
        courseSlug: course?.slug ?? 'primer-contacto',
        sectionSlug: section?.slug ?? 'la-llamada',
        kind,
        difficulty: difficultyAt(i, count),
      });
      ordinal += 1;
    }
  }
  return out;
})();

function lessonTitle(unitTitle: string, index: number, total: number, kind: LessonIndexEntry['kind']): string {
  if (kind === 'checkpoint') return `${unitTitle}: comprobación`;
  if (kind === 'test') return `${unitTitle}: evaluación`;
  if (kind === 'story') return `${unitTitle}: un caso real`;
  return `${unitTitle} ${String(index + 1)} de ${String(total)}`;
}

export function lessonsOfUnit(unitIndex: number): readonly LessonIndexEntry[] {
  return LESSONS.filter((l) => l.unitIndex === unitIndex);
}

export function courseOfSlug(slug: string): CourseIndexEntry | null {
  return COURSES.find((c) => c.slug === slug) ?? null;
}
