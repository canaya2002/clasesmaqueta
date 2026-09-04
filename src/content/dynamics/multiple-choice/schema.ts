import { z } from 'zod';
import { atLeastTwo, contentText, mediaId, type ContentText, type MediaId } from '../../engine/primitives';
import { brand, type Branded } from '@/lib/brand';

/**
 * Los ids de opción son LOCALES al paso.
 *
 * No son identidades de dominio: al duplicar una lección se conservan verbatim, porque su alcance es el
 * propio `data`. Remapearlos "por seguridad" —lo que hace todo importador— rompería `correctOptionId`
 * dentro de plugins que el importador no conoce, y el fallo solo aparecería cuando un alumno responde.
 */
export type OptionId = Branded<string, 'OptionId'>;

export const optionId = z
  .string()
  .regex(/^opt_[a-z0-9]{4,10}$/)
  .transform((s): OptionId => brand(s));

export function asOptionId(value: string): OptionId {
  return brand(value);
}

/** Sin `<img>` ni URLs: una figura es un glifo del catálogo o una escena procedural. Cero red. */
export const figureSchema = z.union([
  z.object({ kind: z.literal('glyph'), name: z.string().min(1).max(40) }),
  z.object({ kind: z.literal('media'), id: mediaId }),
]);

export type Figure = z.output<typeof figureSchema>;

export const optionSchema = z.object({
  id: optionId,
  text: contentText,
});

export type Option = z.output<typeof optionSchema>;

export const multipleChoiceData = z.object({
  prompt: contentText,
  /** Cardinalidad en el TIPO: `.min(2)` es una regla de runtime que el tipo no ve. */
  options: atLeastTwo(optionSchema),
  correctOptionId: optionId,
  /** El barajado usa el `rng` determinista del intento, nunca `Math.random`. */
  shuffle: z.boolean(),
  figure: figureSchema.nullable(),
});

export type MultipleChoiceData = z.output<typeof multipleChoiceData>;

export const multipleChoiceAnswer = z.object({
  optionId: optionId.nullable(),
});

export type MultipleChoiceAnswer = z.output<typeof multipleChoiceAnswer>;

export const multipleChoiceDetail = z.object({
  correctOptionId: optionId,
  chosenOptionId: optionId.nullable(),
});

export type MultipleChoiceDetail = z.output<typeof multipleChoiceDetail>;

/**
 * El borrador: TODO laxo.
 *
 * El editor escribe aquí mientras el autor teclea. Un enunciado vacío, cero opciones y `correctOptionId`
 * nulo son estados NORMALES de un paso a medio escribir, no errores que deban bloquear la escritura.
 */
export const multipleChoiceDraft = z.object({
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  correctOptionId: z.string().nullable(),
  shuffle: z.boolean(),
  figure: figureSchema.nullable(),
});

export type MultipleChoiceDraft = z.output<typeof multipleChoiceDraft>;

export type { MediaId, ContentText };
