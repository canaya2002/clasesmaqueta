import { z } from 'zod';
import { contentText } from '@/content/engine/primitives';
import { blankId } from '../_shared/ids';

export const blankSchema = z.object({
  id: blankId,
  /** La primera es la canónica; las demás son sinónimos admitidos. */
  accepted: z.array(z.string().min(1)).min(1),
  typoTolerance: z.boolean(),
});
export type Blank = z.output<typeof blankSchema>;

export const fillBlankData = z.object({
  /** Plantilla con marcas `{{bnk_x}}`. Se valida que las marcas coincidan con los huecos declarados. */
  template: contentText,
  blanks: z.array(blankSchema).min(1).max(6),
  mode: z.enum(['input', 'bank']),
  /** Solo en modo banco: palabras que no van en ningún hueco. */
  decoys: z.array(z.string().min(1)),
});
export type FillBlankData = z.output<typeof fillBlankData>;

/**
 * Las respuestas van en un ARREGLO paralelo a `blanks`, no en un Record.
 *
 * Un Record en JSON no tiene orden garantizado, y este valor viaja al hash canónico del contenido, al diff
 * de versiones y al registro de intentos.
 */
export const fillBlankAnswer = z.object({ values: z.array(z.string()) });
export type FillBlankAnswer = z.output<typeof fillBlankAnswer>;

export const fillBlankDetail = z.object({
  perBlank: z.array(z.object({ id: blankId, ok: z.boolean(), expected: z.string() })),
});
export type FillBlankDetail = z.output<typeof fillBlankDetail>;

export const fillBlankDraft = z.object({
  template: z.string(),
  blanks: z.array(z.object({ id: z.string(), accepted: z.array(z.string()), typoTolerance: z.boolean() })),
  mode: z.enum(['input', 'bank']),
  decoys: z.array(z.string()),
});

export const BLANK_PATTERN = /\{\{(bnk_[a-z0-9]{2,10})\}\}/g;

export interface Segment {
  readonly kind: 'text' | 'blank';
  readonly value: string;
}

/** Parte la plantilla en segmentos alternos. Lo usan el player y el editor. */
export function splitTemplate(template: string): readonly Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of template.matchAll(BLANK_PATTERN)) {
    const at = match.index;
    if (at > last) out.push({ kind: 'text', value: template.slice(last, at) });
    out.push({ kind: 'blank', value: match[1] ?? '' });
    last = at + match[0].length;
  }
  if (last < template.length) out.push({ kind: 'text', value: template.slice(last) });
  return out;
}
