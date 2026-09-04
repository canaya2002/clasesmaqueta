/**
 * Fórmulas de calificación compartidas.
 */

import { MIN_LENGTH_FOR_TYPO_TOLERANCE, normalizeAnswer, withinOneEdit } from '@/lib/text';

/**
 * Desorden de una secuencia por DISTANCIA DE KENDALL recentrada.
 *
 * No se usa la subsecuencia creciente más larga, que era la primera opción: con n=2 la LIS solo puede valer
 * 1 o 2, así que el score es 0 o 1 y el "parcial" no existe; con n=3 vale 0, 0.5 o 1, y un barajado al azar
 * ya saca 0.5 de media. Regalar medio punto al azar puro en un curso de cumplimiento no es un detalle.
 *
 * Kendall recentrada vale 0 EN MEDIA para una permutación aleatoria, sea cual sea n. Y por debajo de cinco
 * elementos no hay granularidad que valga la pena: ahí la calificación es binaria y se dice.
 */
export const MIN_ITEMS_FOR_PARTIAL = 5;

export function orderScore(placed: readonly string[], solution: readonly string[]): number {
  const n = solution.length;
  if (n < 2) return placed.length === n ? 1 : 0;

  const rank = new Map<string, number>();
  solution.forEach((id, i) => rank.set(id, i));

  const ranks = placed.map((id) => rank.get(id) ?? -1);
  if (ranks.includes(-1) || ranks.length !== n) return 0;

  const exact = ranks.every((r, i) => r === i);
  if (exact) return 1;
  if (n < MIN_ITEMS_FOR_PARTIAL) return 0;

  let inversions = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const a = ranks[i];
      const b = ranks[j];
      if (a !== undefined && b !== undefined && a > b) inversions += 1;
    }
  }
  const maxInversions = (n * (n - 1)) / 2;
  const value = 1 - (2 * inversions) / maxInversions;
  return value < 0 ? 0 : value;
}

/**
 * ¿La respuesta escrita coincide con alguna de las aceptadas?
 *
 * La tolerancia de un typo se DESACTIVA cuando hay dígitos o códigos de formulario de por medio. En un
 * despacho migratorio, "I-130" y "I-131" están a una edición de distancia y son trámites distintos; lo
 * mismo "15 días" y "45 días". Un typo perdonado ahí no es amabilidad, es una respuesta equivocada dada por
 * buena. Y las diferencias que involucran la ñ nunca se perdonan: la normalización ya la conserva a
 * propósito, así que perdonarla por distancia de edición desharía esa decisión por la puerta de atrás.
 */
export function matchesAccepted(
  input: string,
  accepted: readonly string[],
  opts: { readonly typoTolerance: boolean },
): boolean {
  const value = normalizeAnswer(input);
  if (value.length === 0) return false;

  for (const candidate of accepted) {
    const target = normalizeAnswer(candidate);
    if (value === target) return true;
  }
  if (!opts.typoTolerance) return false;

  for (const candidate of accepted) {
    const target = normalizeAnswer(candidate);
    if (target.length < MIN_LENGTH_FOR_TYPO_TOLERANCE) continue;
    // Códigos, plazos y cantidades: coincidencia exacta o nada.
    if (/\d/.test(target) || /\d/.test(value)) continue;
    // La ñ no se perdona: "ano" y "año" no son la misma palabra.
    if (target.includes('ñ') !== value.includes('ñ')) continue;
    if (withinOneEdit(value, target)) return true;
  }
  return false;
}
