import { z } from 'zod';
import { contentText } from '@/content/engine/primitives';
import { itemId } from '../_shared/ids';

export const stepItemSchema = z.object({ id: itemId, text: contentText });
export type StepItem = z.output<typeof stepItemSchema>;

export const orderSequenceData = z.object({
  prompt: contentText,
  /** Los pasos EN EL ORDEN CORRECTO. */
  items: z.array(stepItemSchema).min(3).max(9),
});
export type OrderSequenceData = z.output<typeof orderSequenceData>;

export const orderSequenceAnswer = z.object({ order: z.array(itemId) });
export type OrderSequenceAnswer = z.output<typeof orderSequenceAnswer>;

export const orderSequenceDetail = z.object({
  expected: z.array(itemId),
  inversions: z.number().int().min(0),
});
export type OrderSequenceDetail = z.output<typeof orderSequenceDetail>;

export const orderSequenceDraft = z.object({
  prompt: z.string(),
  items: z.array(z.object({ id: z.string(), text: z.string() })),
});
