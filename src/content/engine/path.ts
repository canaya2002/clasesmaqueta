/**
 * SENDA — un solo vocabulario de rutas de dominio.
 *
 * Lo consumen la validación, el diff de versiones, el índice del ⌘K y el reporte de importación. El default
 * es formatear el breadcrumb con template strings en cada feature: uno en el reporte de import, otro en el
 * diff, otro en el buscador, con tres criterios distintos de 0/1-based y ningún enlace.
 *
 * Convertirlo en un VALOR TIPADO con salida `href` es lo que hace la demo de 15 minutos: clic en el error y
 * estás en el campo exacto.
 */

import type { ContentText } from './primitives';

export type PathSegment =
  | { readonly kind: 'course'; readonly id: string; readonly index: number; readonly title: ContentText }
  | { readonly kind: 'section'; readonly id: string; readonly index: number; readonly title: ContentText }
  | { readonly kind: 'unit'; readonly id: string; readonly index: number; readonly title: ContentText }
  | { readonly kind: 'lesson'; readonly id: string; readonly index: number; readonly title: ContentText }
  | { readonly kind: 'step'; readonly id: string; readonly index: number; readonly title: ContentText }
  /** Un campo dentro del `data` de un paso: `opciones[2].texto`. */
  | { readonly kind: 'field'; readonly path: readonly (string | number)[] };

export type ContentPath = readonly [PathSegment, ...PathSegment[]];

export type PathStyle = 'issue' | 'full' | 'compact' | 'json' | 'href';

const LABEL: Readonly<Record<'course' | 'section' | 'unit' | 'lesson' | 'step', string>> = {
  course: 'Curso',
  section: 'Sección',
  unit: 'Unidad',
  lesson: 'Lección',
  step: 'Paso',
};

const SHORT: Readonly<Record<'course' | 'section' | 'unit' | 'lesson' | 'step', string>> = {
  course: 'C',
  section: 'S',
  unit: 'U',
  lesson: 'L',
  step: 'P',
};

function fieldToJson(path: readonly (string | number)[]): string {
  let out = '';
  for (const part of path) {
    out += typeof part === 'number' ? `[${part}]` : out === '' ? part : `.${part}`;
  }
  return out;
}

function fieldToHuman(path: readonly (string | number)[]): string {
  return fieldToJson(path);
}

/**
 * Formatea una ruta de dominio.
 *
 * `issue` es el estilo que la especificación cita literalmente: arranca en el segmento de UNIDAD, porque
 * "Fundamentos › Sección 1 › Unidad 3 › Lección 12 › Paso 4" no es lo que un gerente de capacitación quiere
 * leer en un mensaje de error — quiere las tres coordenadas que le dicen dónde hacer clic.
 *
 * La numeración es 1-BASED en todos los estilos humanos y 0-based solo en `json`, que es el único destinado
 * a un programador.
 */
export function formatContentPath(path: ContentPath, style: PathStyle = 'issue'): string {
  if (style === 'json') {
    const parts: string[] = [];
    for (const seg of path) {
      if (seg.kind === 'field') parts.push(fieldToJson(seg.path));
      else parts.push(`${seg.kind}s[${seg.index}]`);
    }
    return parts.join('.');
  }

  if (style === 'href') {
    let lesson: string | null = null;
    let step: string | null = null;
    let field: string | null = null;
    for (const seg of path) {
      if (seg.kind === 'lesson') lesson = seg.id;
      else if (seg.kind === 'step') step = seg.id;
      else if (seg.kind === 'field') field = fieldToJson(seg.path);
    }
    if (lesson === null) return '/studio/courses';
    const params = new URLSearchParams();
    if (step !== null) params.set('step', step);
    if (field !== null) params.set('field', field);
    const query = params.toString();
    return `/studio/lessons/${lesson}/edit${query === '' ? '' : `?${query}`}`;
  }

  const start = style === 'issue' ? path.findIndex((s) => s.kind === 'unit') : 0;
  const from = start < 0 ? 0 : start;
  const parts: string[] = [];

  for (let i = from; i < path.length; i += 1) {
    const seg = path[i];
    if (seg === undefined) continue;
    if (seg.kind === 'field') {
      parts.push(fieldToHuman(seg.path));
      continue;
    }
    const n = seg.index + 1;
    if (style === 'compact') {
      parts.push(`${SHORT[seg.kind]}${n}`);
      continue;
    }
    // El título real y no solo el número: es la diferencia entre un diff para programadores y uno que el
    // gerente de capacitación puede leer sin abrir el editor.
    const title = seg.title.length > 0 ? ` “${seg.title}”` : '';
    parts.push(style === 'full' ? `${LABEL[seg.kind]} ${n}${title}` : `${LABEL[seg.kind]} ${n}`);
  }

  return parts.join(' › ');
}

/** Añade un segmento sin perder el tipo no-vacío. */
export function pushPath(path: ContentPath, segment: PathSegment): ContentPath {
  return [path[0], ...path.slice(1), segment];
}

export function fieldSegment(...parts: readonly (string | number)[]): PathSegment {
  return { kind: 'field', path: parts };
}
