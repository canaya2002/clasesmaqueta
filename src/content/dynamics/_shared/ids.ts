import { z } from 'zod';
import { brand, type Branded } from '@/lib/brand';

/**
 * Identificadores LOCALES al paso, compartidos por todo el catálogo.
 *
 * No son identidades de dominio: al duplicar una lección se conservan verbatim, porque su alcance es el
 * propio `data`. Remapearlos "por seguridad" —lo que hace todo importador— rompería la referencia a la
 * respuesta correcta dentro de plugins que el importador no conoce, y el fallo solo aparecería cuando un
 * alumno responde.
 */
export type LocalId = Branded<string, 'LocalId'>;

export function localIdSchema(prefix: string) {
  return z
    .string()
    .regex(new RegExp(`^${prefix}_[a-z0-9]{2,10}$`))
    .transform((s): LocalId => brand(s));
}

export function asLocalId(value: string): LocalId {
  return brand(value);
}

export const optionId = localIdSchema('opt');
export const tokenId = localIdSchema('tok');
export const pairId = localIdSchema('pai');
export const itemId = localIdSchema('itm');
export const blankId = localIdSchema('bnk');
