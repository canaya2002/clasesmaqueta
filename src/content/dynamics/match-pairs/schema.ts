import { z } from 'zod';
import { contentText } from '@/content/engine/primitives';
import { pairId } from '../_shared/ids';

export const pairSchema = z.object({ id: pairId, left: contentText, right: contentText });
export type Pair = z.output<typeof pairSchema>;

export const matchPairsData = z.object({
  prompt: contentText,
  pairs: z.array(pairSchema).min(3).max(8),
  /**
   * Opciones EXTRA en la columna derecha.
   *
   * Sin ellas, un ejercicio de seis parejas se resuelve por descarte en las dos últimas: el alumno acierta
   * sin saber. Con distractores a la derecha, el descarte deja de funcionar.
   */
  extraRights: z.array(z.object({ id: pairId, text: contentText })),
  /** Errores tolerados antes de considerar incorrecto el paso. */
  tolerance: z.number().int().min(0).max(3),
});
export type MatchPairsData = z.output<typeof matchPairsData>;

export const matchPairsAnswer = z.object({
  matched: z.array(z.object({ leftId: pairId, rightId: pairId })),
  /** Intentos fallidos acumulados. Es parte de la RESPUESTA porque la calificación los usa. */
  mistakes: z.number().int().min(0),
});
export type MatchPairsAnswer = z.output<typeof matchPairsAnswer>;

export const matchPairsDetail = z.object({ pairs: z.number().int(), mistakes: z.number().int() });
export type MatchPairsDetail = z.output<typeof matchPairsDetail>;

export const matchPairsDraft = z.object({
  prompt: z.string(),
  pairs: z.array(z.object({ id: z.string(), left: z.string(), right: z.string() })),
  extraRights: z.array(z.object({ id: z.string(), text: z.string() })),
  tolerance: z.number(),
});
