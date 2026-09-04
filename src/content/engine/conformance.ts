/**
 * SENDA — el arnés de conformidad de dinámicas.
 *
 * Es lo que convierte "14 suites de pruebas" en "1 suite parametrizada", y es lo que hace VERDADERA la
 * promesa de que una dinámica nueva lo hereda todo gratis: el costo marginal de la dinámica 15 es cero, y
 * el editor, el player y la analítica no pueden romperse en silencio para un tipo concreto.
 *
 * Deliberadamente NO usa vitest: es una función pura que devuelve resultados, así que el mismo arnés lo
 * puede correr una prueba, el Studio (para validar un plugin recién registrado) o un script de CI.
 */

import type { ErasedDynamic } from './dynamic';

export interface ConformanceCheck {
  readonly id: string;
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface ConformanceResult {
  readonly type: string;
  readonly checks: readonly ConformanceCheck[];
  readonly failed: number;
}

function check(id: string, name: string, run: () => string | null): ConformanceCheck {
  try {
    const problem = run();
    return { id, name, passed: problem === null, detail: problem ?? 'ok' };
  } catch (error) {
    return { id, name, passed: false, detail: `lanzó: ${String(error)}` };
  }
}

export function checkDynamic(dynamic: ErasedDynamic): ConformanceResult {
  const checks: ConformanceCheck[] = [];

  checks.push(
    check('C01', 'la versión es un entero positivo', () =>
      Number.isInteger(dynamic.version) && dynamic.version >= 1 ? null : `versión ${String(dynamic.version)}`,
    ),
  );

  checks.push(
    check('C02', 'defaultData valida contra su propio esquema', () =>
      dynamic.bind(dynamic.defaultData).ok ? null : 'el defaultData no pasa su propio dataSchema',
    ),
  );

  const bound = dynamic.bind(dynamic.defaultData);

  checks.push(
    check('C03', 'la solución del plugin califica 1.0 contra su propia calificación', () => {
      if (!bound.ok) return 'no se pudo enlazar el defaultData';
      const graded = bound.value.grade(bound.value.solution());
      if (!graded.ok) return 'la solución no valida contra el answerSchema';
      if (!graded.value.correct) return 'la solución no se considera correcta';
      return graded.value.score === 1 ? null : `la solución califica ${String(graded.value.score)}`;
    }),
  );

  checks.push(
    check('C04', 'la respuesta vacía no lanza y no se considera correcta', () => {
      if (!bound.ok) return 'no se pudo enlazar el defaultData';
      const graded = bound.value.grade(bound.value.emptyAnswer());
      if (!graded.ok) return null; // rechazar la respuesta vacía también es válido
      return graded.value.correct ? 'la respuesta vacía se considera correcta' : null;
    }),
  );

  checks.push(
    check('C05', 'la calificación es DETERMINISTA', () => {
      if (!bound.ok) return 'no se pudo enlazar el defaultData';
      const a = bound.value.grade(bound.value.solution());
      const b = bound.value.grade(bound.value.solution());
      return JSON.stringify(a) === JSON.stringify(b) ? null : 'dos calificaciones idénticas difieren';
    }),
  );

  checks.push(
    check('C06', 'una respuesta basura devuelve error en vez de lanzar', () => {
      if (!bound.ok) return 'no se pudo enlazar el defaultData';
      const graded = bound.value.grade({ basura: true });
      return graded.ok ? 'una respuesta con forma inválida fue aceptada' : null;
    }),
  );

  checks.push(
    check('C07', 'searchText no está vacío y no contiene marcado', () => {
      if (!bound.ok) return 'no se pudo enlazar el defaultData';
      const texts = bound.value.searchText();
      if (texts.length === 0) return 'searchText devolvió una lista vacía';
      const withMarkup = texts.find((t) => t.includes('<') || t.includes('{'));
      return withMarkup === undefined ? null : `searchText devuelve marcado: ${withMarkup.slice(0, 40)}`;
    }),
  );

  checks.push(
    check('C08', 'describe cabe en una línea (90 caracteres)', () => {
      if (!bound.ok) return 'no se pudo enlazar el defaultData';
      const d = bound.value.describe();
      if (d.length === 0) return 'describe devolvió cadena vacía';
      return d.length <= 90 ? null : `describe mide ${String(d.length)} caracteres`;
    }),
  );

  checks.push(
    check('C09', 'estimateSeconds es positivo y finito', () => {
      if (!bound.ok) return 'no se pudo enlazar el defaultData';
      const s = bound.value.estimateSeconds();
      return Number.isFinite(s) && s > 0 && s <= 600 ? null : `estimateSeconds devolvió ${String(s)}`;
    }),
  );

  checks.push(
    check('C10', 'refs devuelve una lista (posiblemente vacía) de cadenas', () => {
      if (!bound.ok) return 'no se pudo enlazar el defaultData';
      const refs = bound.value.refs();
      return refs.every((r) => typeof r === 'string') ? null : 'refs devolvió algo que no es una cadena';
    }),
  );

  checks.push(
    check('C11', 'el defaultData es publicable: validate no reporta errores', () => {
      if (!bound.ok) return 'no se pudo enlazar el defaultData';
      const issues = bound.value.issues().filter((i) => i.severity === 'error');
      return issues.length === 0 ? null : `${String(issues.length)} problema(s): ${issues[0]?.message ?? ''}`;
    }),
  );

  checks.push(
    check('C12', 'un data corrupto devuelve problemas NO VACÍOS', () => {
      const bad = dynamic.bind({ definitivamente: 'no es esto' });
      if (bad.ok) return 'un data corrupto fue aceptado';
      return bad.error.length > 0 ? null : 'devolvió una lista de problemas vacía';
    }),
  );

  checks.push(
    check('C13', 'el borrador vacío se puede validar sin lanzar', () => {
      // El editor pasa borradores a medias en cada pulsación: si esto lanza, el editor se rompe al teclear.
      dynamic.validateDraft({});
      dynamic.validateDraft(null);
      dynamic.validateDraft({ prompt: '' });
      return null;
    }),
  );

  checks.push(
    check('C14', 'facets devuelve valores agregables', () => {
      if (!bound.ok) return 'no se pudo enlazar el defaultData';
      const f = bound.value.facets(bound.value.solution());
      const bad = Object.entries(f).find(
        ([, v]) => typeof v !== 'number' && typeof v !== 'string' && typeof v !== 'boolean',
      );
      return bad === undefined ? null : `la faceta "${bad[0]}" no es agregable`;
    }),
  );

  checks.push(
    check('C15', 'si exige micrófono o voz, lo declara en requires', () => {
      const needsAudio = dynamic.supports.audio;
      if (!needsAudio) return null;
      return dynamic.requires.length > 0 ? null : 'declara soporte de audio y no declara ningún requisito';
    }),
  );

  checks.push(
    check('C16', 'defaultData es serializable a JSON sin pérdida', () => {
      // `Infinity` se convierte en `null` al serializar y el dato se rehidrata corrupto sobre algo que era
      // válido al escribirlo. Con snapshots inmutables y diff campo por campo, eso es indetectable.
      const round: unknown = JSON.parse(JSON.stringify(dynamic.defaultData));
      return JSON.stringify(round) === JSON.stringify(dynamic.defaultData)
        ? null
        : 'el defaultData pierde información al serializar';
    }),
  );

  return { type: dynamic.type, checks, failed: checks.filter((c) => !c.passed).length };
}

export const CONFORMANCE_CHECK_COUNT = 16;
