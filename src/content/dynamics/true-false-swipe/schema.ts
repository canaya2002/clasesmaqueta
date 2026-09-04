import { z } from 'zod';
import { contentText } from '@/content/engine/primitives';

export const trueFalseData = z.object({
  statement: contentText,
  isTrue: z.boolean(),
  trueLabel: contentText,
  falseLabel: contentText,
});
export type TrueFalseData = z.output<typeof trueFalseData>;

export const trueFalseAnswer = z.object({ value: z.boolean().nullable() });
export type TrueFalseAnswer = z.output<typeof trueFalseAnswer>;

export const trueFalseDetail = z.object({ expected: z.boolean(), chosen: z.boolean().nullable() });
export type TrueFalseDetail = z.output<typeof trueFalseDetail>;

export const trueFalseDraft = z.object({
  statement: z.string(),
  isTrue: z.boolean(),
  trueLabel: z.string(),
  falseLabel: z.string(),
});
