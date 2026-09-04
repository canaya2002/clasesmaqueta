/**
 * El ÚNICO archivo del repositorio autorizado a AFIRMAR una marca de tipo.
 *
 * `eslint.config.mjs` prohíbe `TSAsExpression` en todo `src/` salvo `as const`. Un tipo marcado no se puede
 * construir sin una afirmación en algún punto, así que la elección real no es "con casts o sin ellos": es
 * si hay UNO, declarado y auditable, o veinte repartidos por el árbol.
 *
 * La regla de uso: nadie llama a `brand()` directamente desde una feature. Cada dominio expone su fábrica
 * (`mintId`, `toDayIndex`, `score01`) y esa fábrica valida antes de marcar. La marca es la CONSECUENCIA de
 * una validación, nunca un atajo para saltarla.
 */

/* eslint-disable no-restricted-syntax -- este archivo ES la excepción declarada */

export type Branded<T, K extends string> = T & { readonly __brand: K };

/** Afirma la marca. Solo se llama desde una fábrica que ya validó el valor. */
export function brand<T, K extends string>(value: T): Branded<T, K> {
  return value as Branded<T, K>;
}

/**
 * Claves de un objeto de configuración como tupla, con comprobación de completitud a nivel de TIPOS.
 *
 * `Object.keys()` devuelve `string[]` y forzarlo a `(keyof T)[]` es un cast que miente en cuanto alguien
 * añade una clave. En su lugar se declara la tupla a mano y el tipo comprueba que no le falte ninguna:
 * añadir una clave al objeto sin añadirla a la tupla NO COMPILA.
 */
export type AssertComplete<Declared extends string, Actual extends string> = [
  Exclude<Actual, Declared>,
  Exclude<Declared, Actual>,
] extends [never, never]
  ? true
  : {
      readonly error: 'La tupla de claves está desincronizada con el objeto';
      readonly faltan: Exclude<Actual, Declared>;
      readonly sobran: Exclude<Declared, Actual>;
    };
