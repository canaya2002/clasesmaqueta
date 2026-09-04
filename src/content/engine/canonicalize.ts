/**
 * SENDA — forma canónica y hash de contenido.
 *
 * El criterio de aceptación dice "exportar un curso, borrarlo, reimportarlo → estado idéntico". La pregunta
 * que casi nadie responde es QUÉ significa idéntico. Comparar con `JSON.stringify` falla por el orden de
 * las claves entre navegadores y por cualquier marca de tiempo. Aquí la igualdad está DEFINIDA: forma
 * canónica con claves ordenadas y una lista de exclusión explícita, y el diálogo de importación muestra los
 * dos checksums en pantalla, así que el criterio se DEMUESTRA en vez de afirmarse.
 */

import { hash64 } from '@/lib/rng';
import { isJsonObject, type Json } from './primitives';

/**
 * Campos que NO entran en la identidad de un curso.
 *
 * La lista es explícita y corta a propósito: todo lo demás SÍ cuenta, incluidos los ids de todos los
 * niveles, el orden de los hijos y el `data` completo de cada paso con sus ids locales verbatim.
 */
export const VOLATILE_FIELDS: ReadonlySet<string> = new Set([
  'createdAt',
  'updatedAt',
  'publishedAt',
  'lastEditedBy',
  'rev',
  'draftNotes',
  '_ui',
]);

/**
 * Ordena claves por unidad de código, descarta `undefined` y CONSERVA `null`.
 *
 * Conservar `null` no es un detalle: en este motor `null` es un valor persistido legítimo (`hint: null`
 * significa "el autor decidió que no hay pista"), así que tratarlo como ausencia cambiaría el contenido.
 */
export function canonicalize(value: Json): Json {
  if (value === null || typeof value !== 'object') return value;
  if (!isJsonObject(value)) return value.map((v) => canonicalize(v));

  const entries = Object.entries(value)
    .filter(([k, v]) => !VOLATILE_FIELDS.has(k) && v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const out: Record<string, Json> = {};
  for (const [k, v] of entries) out[k] = canonicalize(v);
  return out;
}

/**
 * Clon profundo de un `Json` SIN pasar por `JSON.parse`.
 *
 * `JSON.parse(JSON.stringify(x))` devuelve `any` y contamina el tipo de todo lo que toca aguas abajo; con
 * la prohibición de casts, ese `any` es un error de lint que solo se puede callar mintiendo. Recorrer la
 * estructura cuesta lo mismo y conserva el tipo.
 */
export function cloneJson(value: Json): Json {
  if (value === null || typeof value !== 'object') return value;
  if (!isJsonObject(value)) return value.map((v) => cloneJson(v));
  const out: Record<string, Json> = {};
  for (const [k, v] of Object.entries(value)) out[k] = cloneJson(v);
  return out;
}

export function canonicalString(value: Json): string {
  return JSON.stringify(canonicalize(value));
}

/** Hash de 64 bits reales sobre la forma canónica. Es la identidad de contenido de un nodo. */
export function contentHash(value: Json): string {
  return hash64(canonicalString(value));
}
