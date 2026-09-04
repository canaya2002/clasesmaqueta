/**
 * El esquema del ledger. Existe por la misma razón que el resto de los esquemas del proyecto: un tipo
 * marcado se produce por un parse, nunca por un cast.
 *
 * No es purismo. Lo que se rehidrata aquí viene de `localStorage`, que en una maqueta se edita a mano
 * durante la demo —es medio argumento de venta que todo el estado sea inspeccionable— y un evento con
 * `xpUnitsMilli: "mucho"` produciría un XP `NaN` que se propaga a todo el HUD sin lanzar en ningún sitio.
 */

import { z } from 'zod';
import { badgeId, lessonId, unitId } from '@/content/engine/primitives';
import { brand } from '@/lib/brand';
import type { DayKey, WeekKey } from './types';

/**
 * `.transform(brand)` y no `.brand()` de Zod.
 *
 * Son dos mecanismos de marca distintos que no unifican: el del proyecto es `{ readonly __brand: K }` y el
 * de Zod es su propio símbolo `$brand`. Mezclarlos produce dos tipos `DayKey` incompatibles que el
 * compilador no puede reconciliar, y la salida obvia —un `as`— está prohibida. `brand()` es la fábrica
 * sancionada de `lib/brand.ts`, el único archivo autorizado a producir una marca.
 */
const dayKey: z.ZodType<DayKey> = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Se esperaba una clave de día YYYY-MM-DD')
  .transform((v) => brand<string, 'DayKey'>(v));

const weekKey: z.ZodType<WeekKey> = z
  .string()
  .regex(/^\d{4}-W\d{2}$/, 'Se esperaba una clave de semana YYYY-Www')
  .transform((v) => brand<string, 'WeekKey'>(v));

const base = {
  seq: z.number().int().min(0),
  atRealMs: z.number().finite(),
  dayKey,
};

const finiteCount = z.number().finite().min(0);

export const ledgerEventSchema = z.discriminatedUnion('t', [
  z.object({
    ...base,
    t: z.literal('lesson-complete'),
    lessonId,
    unitId,
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    xpUnitsMilli: finiteCount,
    accuracyMilli: z.number().finite().min(0).max(1000),
    weightTotal: finiteCount,
    perfect: z.boolean(),
    firstClear: z.boolean(),
    paceBonusEarned: z.boolean(),
    maxCombo: finiteCount,
    elapsedMs: finiteCount,
    gemsGranted: finiteCount,
    countsForProgress: z.boolean(),
  }),
  z.object({
    ...base,
    t: z.literal('gems-granted'),
    source: z.enum(['perfect-lesson', 'quest', 'level-up', 'chest']),
    amount: finiteCount,
  }),
  z.object({
    ...base,
    t: z.literal('shop-purchase'),
    item: z.enum(['heart-refill', 'streak-freeze', 'unlimited-hearts']),
    pricePaid: finiteCount,
  }),
  z.object({
    ...base,
    t: z.literal('quest-claimed'),
    questId: z.string().min(1).max(64),
    gemsGranted: finiteCount,
  }),
  z.object({
    ...base,
    t: z.literal('chest-opened'),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    gemsGranted: finiteCount,
  }),
  z.object({
    ...base,
    t: z.literal('league-enrolled'),
    weekKey,
    division: z.number().int().min(0).max(4),
  }),
  z.object({
    ...base,
    t: z.literal('badge-seen'),
    badgeId,
  }),
]);

export const ledgerSchema = z.array(ledgerEventSchema);
