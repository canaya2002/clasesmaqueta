/**
 * SENDA — el mapa del registro de dinámicas.
 *
 * Está VACÍO a propósito. Cada plugin lo aumenta desde su propio archivo con `declare module`, y de aquí se
 * derivan `DynamicType`, `DataOf<K>`, `AnswerOf<K>` y `DetailOf<K>`.
 *
 * Por qué no una unión escrita a mano en schema.ts: habría que editarla en cada dinámica nueva, lo que
 * contradice el criterio de aceptación de "1 archivo + 1 línea". Y por qué no `type: string` a secas:
 * porque entonces `step.data` es `unknown` y todo el motor se llena de comprobaciones defensivas.
 *
 * Una nota que importa para el code-splitting: la augmentation la evalúa el COMPILADOR con solo que el
 * archivo esté en el programa. No exige que el módulo se importe en runtime, así que los tipos sobreviven
 * intactos aunque el Player se cargue con `next/dynamic`.
 */

import type { Json } from './primitives';

/** Lo que cada dinámica declara: sus tres formas, restringidas a Json. */
export interface DynamicShape {
  readonly data: Json;
  readonly answer: Json;
  readonly detail: Json;
}

/* eslint-disable @typescript-eslint/no-empty-object-type -- se llena por declaration merging */
export interface DynamicRegistryMap {}
/* eslint-enable @typescript-eslint/no-empty-object-type */

// El `& string` es lo que mantiene `DynamicType` como tipo de cadena cuando el mapa todavía está vacío
// (antes de que cualquier plugin lo aumente). typescript-eslint lo marca como redundante en cuanto hay una
// clave, pero quitarlo rompería la compilación del motor en un repo sin dinámicas registradas.
/* eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents */
export type DynamicType = keyof DynamicRegistryMap & string;

/**
 * El `extends DynamicShape` no es decorativo: es lo que garantiza que `DataOf<K>` sea asignable a `Json`,
 * y por tanto lo que permite que la erasure a `Json` no necesite un solo cast.
 */
export type ShapeOf<K extends DynamicType> = DynamicRegistryMap[K] extends DynamicShape
  ? DynamicRegistryMap[K]
  : never;

export type DataOf<K extends DynamicType> = ShapeOf<K>['data'];
export type AnswerOf<K extends DynamicType> = ShapeOf<K>['answer'];
export type DetailOf<K extends DynamicType> = ShapeOf<K>['detail'];
