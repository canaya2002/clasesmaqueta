/**
 * El barrel del catálogo de dinámicas.
 *
 * Aquí solo entran los `meta.ts`, que son puros y pesan ~2 KB: los `Player` y `Editor` se cargan con
 * `next/dynamic` desde el propio plugin. Un barrel que importara las 14 dinámicas COMPLETAS metería
 * @dnd-kit y react-hook-form en la ruta del camino, y el code-splitting dejaría de decidirlo el registro.
 */

import type { ErasedDynamicOf } from '../engine/dynamic';
import { registerDynamic } from '../engine/registry';
import type { DynamicType } from '../engine/registry.types';
import { multipleChoice } from './multiple-choice/meta';

/**
 * El registro como RECORD MAPEADO EXHAUSTIVO sobre `DynamicType`.
 *
 * No es una prueba: es una ANOTACIÓN, y por eso da mejores errores que cualquier aserción a nivel de tipos.
 *   - Falta una clave  → «Property 'speaking' is missing in type … but required in type …» (ts2741)
 *   - Sobra una clave  → «Object literal may only specify known properties» (ts2353)
 *   - Valor mal puesto → «Type '"fill-blank"' is not assignable to type '"speaking"'» (ts2322)
 *   - Duplicados       → imposibles por construcción, cosa que un arreglo no impide.
 *
 * Y protege del fallo silencioso que importa: la augmentation de `DynamicRegistryMap` aplica con que el
 * archivo esté en el programa de TypeScript, SIN necesidad de importarlo en runtime. O sea que borrar la
 * entrada de runtime deja el tipo intacto y solo el registro vacío — exactamente el caso que hace explotar
 * el player con «Cannot read properties of undefined». Con el Record, borrarla no compila.
 */
export const DYNAMICS: { readonly [K in DynamicType]: ErasedDynamicOf<K> } = {
  'multiple-choice': multipleChoice,
};

for (const dynamic of Object.values(DYNAMICS)) registerDynamic(dynamic);

export { multipleChoice };
