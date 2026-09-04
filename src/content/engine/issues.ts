/**
 * SENDA — vocabulario CERRADO de problemas de contenido.
 *
 * El patrón usual es un booleano `isValid` y un string. Sin código no hay deep-link a la celda ofensora ni
 * autofix, y sin severidad todo aviso bloquea la publicación.
 */

import type { ContentPath } from './path';
import { formatContentPath } from './path';

export type IssueCode =
  | 'empty-section'
  | 'empty-unit'
  | 'empty-lesson'
  | 'unsolvable-step'
  | 'broken-ref'
  | 'orphan-media'
  | 'prereq-cycle'
  | 'prereq-unreachable'
  | 'duplicate-id'
  | 'plugin-unknown'
  | 'plugin-version-ahead'
  | 'schema'
  | 'missing-explanation'
  | 'skill-unknown'
  | 'xp-out-of-range'
  | 'contrast-fail'
  | 'test-without-pass-mark'
  | 'requires-unsupported'
  | 'text-too-long'
  | 'seed-drift';

export type Severity = 'error' | 'warning' | 'info';

/** Un problema local al `data` de un paso: lo produce el plugin, que no conoce su ruta en el árbol. */
export interface LocalIssue {
  readonly code: IssueCode;
  readonly severity: Severity;
  readonly message: string;
  /** Ruta dentro del `data`, ya en forma de segmentos: `['options', 2, 'text']`. */
  readonly field: readonly (string | number)[];
  readonly fixHint: string | null;
}

/** El mismo problema, ya situado en el árbol por el walker. */
export interface ValidationIssue {
  readonly code: IssueCode;
  readonly severity: Severity;
  readonly message: string;
  readonly path: ContentPath;
  readonly fixHint: string | null;
}

/** Una lista de problemas NO PUEDE estar vacía: `err([])` compilaba y pintaba "hay errores" sin ninguno. */
export type Issues<T> = readonly [T, ...T[]];

export function asIssues<T>(list: readonly T[]): Issues<T> | null {
  const first = list[0];
  if (first === undefined) return null;
  return [first, ...list.slice(1)];
}

export interface ValidationReport {
  readonly issues: readonly ValidationIssue[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly elapsedMs: number;
}

export function localIssue(
  code: IssueCode,
  message: string,
  opts: { readonly field?: readonly (string | number)[]; readonly severity?: Severity; readonly fixHint?: string } = {},
): LocalIssue {
  return {
    code,
    severity: opts.severity ?? 'error',
    message,
    field: opts.field ?? [],
    fixHint: opts.fixHint ?? null,
  };
}

/**
 * Rinde el problema como el string exacto que pide la especificación:
 *   "Unidad 3 › Lección 12 › Paso 4: falta la opción correcta (ninguna opción tiene «correcta» marcada)."
 */
export function renderIssue(issue: ValidationIssue): string {
  const where = formatContentPath(issue.path, 'issue');
  return where === '' ? issue.message : `${where}: ${issue.message}`;
}

export function summarize(issues: readonly ValidationIssue[], elapsedMs: number): ValidationReport {
  let errorCount = 0;
  let warningCount = 0;
  for (const i of issues) {
    if (i.severity === 'error') errorCount += 1;
    else if (i.severity === 'warning') warningCount += 1;
  }
  return { issues, errorCount, warningCount, elapsedMs };
}
