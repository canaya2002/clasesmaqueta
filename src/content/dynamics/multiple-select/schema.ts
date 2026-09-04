import { z } from 'zod';
import { atLeastTwo, contentText } from '@/content/engine/primitives';
import { optionId } from '../_shared/ids';

export const optionSchema = z.object({ id: optionId, text: contentText });

export const multipleSelectData = z.object({
  prompt: contentText,
  options: atLeastTwo(optionSchema),
  correctOptionIds: z.array(optionId).min(1),
  /** Revelar cuántas son correctas convierte el ejercicio en aritmética. Por defecto, no. */
  revealCount: z.boolean(),
});
export type MultipleSelectData = z.output<typeof multipleSelectData>;

export const multipleSelectAnswer = z.object({ optionIds: z.array(optionId) });
export type MultipleSelectAnswer = z.output<typeof multipleSelectAnswer>;

export const multipleSelectDetail = z.object({
  correctOptionIds: z.array(optionId),
  truePositives: z.number().int(),
  falsePositives: z.number().int(),
});
export type MultipleSelectDetail = z.output<typeof multipleSelectDetail>;

export const multipleSelectDraft = z.object({
  prompt: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  correctOptionIds: z.array(z.string()),
  revealCount: z.boolean(),
});
