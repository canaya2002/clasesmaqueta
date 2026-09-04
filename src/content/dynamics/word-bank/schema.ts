import { z } from 'zod';
import { contentText } from '@/content/engine/primitives';
import { tokenId } from '../_shared/ids';

export const tokenSchema = z.object({ id: tokenId, text: contentText });
export type Token = z.output<typeof tokenSchema>;

export const wordBankData = z.object({
  prompt: contentText,
  /** Las fichas EN EL ORDEN CORRECTO. */
  tokens: z.array(tokenSchema).min(3).max(14),
  decoys: z.array(tokenSchema),
});
export type WordBankData = z.output<typeof wordBankData>;

export const wordBankAnswer = z.object({ order: z.array(tokenId) });
export type WordBankAnswer = z.output<typeof wordBankAnswer>;

export const wordBankDetail = z.object({ expected: z.string(), got: z.string() });
export type WordBankDetail = z.output<typeof wordBankDetail>;

export const wordBankDraft = z.object({
  prompt: z.string(),
  tokens: z.array(z.object({ id: z.string(), text: z.string() })),
  decoys: z.array(z.object({ id: z.string(), text: z.string() })),
});
