/**
 * SENDA — la única puerta entre la capa de datos y la interfaz.
 *
 * `mock/repo/*` devuelve `RawStep` (con `data: Json` sin validar). Ningún componente recibe un `RawStep`:
 * el motor corre `prepareStep()` y entrega un `PreparedStep` con su `BoundStep` ya parseado, o una lista de
 * problemas con su ruta de dominio — que el player convierte en una tarjeta legible y el editor en marcas
 * de campo.
 */

import type { BoundStep, ErasedDynamic } from './dynamic';
import { findDynamic } from './registry';
import type { LocalIssue, ValidationIssue } from './issues';
import { localIssue } from './issues';
import type { ContentPath, PathSegment } from './path';
import { fieldSegment } from './path';
import type { Result } from './primitives';
import { err, ok } from './primitives';
import type { RawStep } from './schema';

export interface PreparedStep {
  readonly raw: RawStep;
  readonly bound: BoundStep;
  readonly dynamic: ErasedDynamic;
  readonly path: ContentPath;
  /** Problemas de SIGNIFICADO detectados por el plugin. El paso se puede jugar igual; el editor los marca. */
  readonly issues: readonly ValidationIssue[];
}

/** Sitúa un problema local del plugin dentro del árbol, conservando su ruta de campo. */
export function situate(issue: LocalIssue, stepPath: ContentPath): ValidationIssue {
  const segments: PathSegment[] = [...stepPath];
  if (issue.field.length > 0) segments.push(fieldSegment(...issue.field));
  const first = segments[0];
  if (first === undefined) throw new Error('Ruta de contenido vacía: imposible por construcción');
  const path: ContentPath = [first, ...segments.slice(1)];
  return {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    path,
    fixHint: issue.fixHint,
  };
}

export function prepareStep(raw: RawStep, path: ContentPath): Result<PreparedStep, readonly ValidationIssue[]> {
  const dynamic = findDynamic(raw.type);
  if (dynamic === null) {
    return err([
      situate(
        localIssue('plugin-unknown', `el tipo de ejercicio “${raw.type}” no existe en esta versión de SENDA`, {
          field: ['type'],
          fixHint: 'Puede venir de un paquete exportado con una versión más nueva del motor.',
        }),
        path,
      ),
    ]);
  }

  const bound = dynamic.bind(raw.data);
  if (!bound.ok) return err(bound.error.map((i) => situate(i, path)));

  return ok({
    raw,
    bound: bound.value,
    dynamic,
    path,
    issues: bound.value.issues().map((i) => situate(i, path)),
  });
}
