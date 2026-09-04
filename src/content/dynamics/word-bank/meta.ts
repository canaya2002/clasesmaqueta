import { defineDynamic, type GradeResult } from '@/content/engine/dynamic';
import { localIssue, type LocalIssue } from '@/content/engine/issues';
import { key, score, text, type ContentText, type Json } from '@/content/engine/primitives';
import { normalizeAnswer } from '@/lib/text';
import { orderScore } from '../_shared/grading';
import {
  wordBankAnswer,
  wordBankData,
  wordBankDetail,
  wordBankDraft,
  type WordBankAnswer,
  type WordBankData,
  type WordBankDetail,
} from './schema';

declare module '@/content/engine/registry.types' {
  interface DynamicRegistryMap {
    'word-bank': { data: WordBankData; answer: WordBankAnswer; detail: WordBankDetail };
  }
}

function textOf(data: WordBankData, ids: readonly string[]): string {
  // Clave `string`: el orden llega desde el borrador, que puede traer un id que ya no existe en el data.
  const byId = new Map<string, string>([...data.tokens, ...data.decoys].map((t) => [t.id, t.text]));
  return ids.map((id) => byId.get(id) ?? '').join(' ');
}

/**
 * La exactitud se evalúa sobre la CADENA RESULTANTE, no sobre la permutación de identificadores.
 *
 * Con fichas repetidas —"de", "el", "la" aparecen dos veces en cualquier frase larga— comparar la
 * permutación marca como incorrecta una frase que se lee exactamente igual que la solución. El alumno ve
 * su respuesta idéntica a la correcta y el sistema le dice que está mal: es la peor forma de perder la
 * confianza en la calificación.
 */
function grade(data: WordBankData, answer: WordBankAnswer): GradeResult<WordBankDetail> {
  const expected = textOf(data, data.tokens.map((t) => t.id));
  const got = textOf(data, answer.order);
  const correct = normalizeAnswer(got) === normalizeAnswer(expected);
  const partial = correct ? 1 : orderScore(answer.order, data.tokens.map((t) => t.id));

  return {
    correct,
    score: score(partial),
    feedback: correct ? null : key('player.feedback.wrongOrder'),
    detail: { expected, got },
    skillScores: {},
  };
}

function validate(data: WordBankData): readonly LocalIssue[] {
  const issues: LocalIssue[] = [];
  if (data.decoys.length === 0) {
    issues.push(
      localIssue('schema', 'sin distractores, la frase se arma colocando todas las fichas en cualquier orden', {
        field: ['decoys'],
        severity: 'warning',
      }),
    );
  }
  const ids = new Set<string>();
  for (const t of [...data.tokens, ...data.decoys]) {
    if (ids.has(t.id)) issues.push(localIssue('duplicate-id', `la ficha ${t.id} está repetida`, { field: ['tokens'] }));
    ids.add(t.id);
  }
  return issues;
}

function validateDraft(draft: unknown): readonly LocalIssue[] {
  const parsed = wordBankDraft.safeParse(draft);
  if (!parsed.success) return [localIssue('schema', 'el borrador tiene una forma que el editor no reconoce')];
  const issues: LocalIssue[] = [];
  if (parsed.data.tokens.length < 3) {
    issues.push(localIssue('schema', 'hacen falta al menos 3 fichas', { field: ['tokens'] }));
  }
  parsed.data.tokens.forEach((t, i) => {
    if (t.text.trim().length === 0) issues.push(localIssue('schema', `la ficha ${String(i + 1)} está vacía`, { field: ['tokens', i] }));
  });
  return issues;
}

export const wordBank = defineDynamic<'word-bank'>({
  type: 'word-bank',
  label: key('dynamics.wordBank.label'),
  version: 1,
  dataSchema: wordBankData,
  answerSchema: wordBankAnswer,
  detailSchema: wordBankDetail,
  draftSchema: wordBankDraft,
  defaultData: wordBankData.parse({
    prompt: 'Arma la regla de verificación de identidad por teléfono.',
    tokens: [
      { id: 'tok_w1', text: 'Verifica' },
      { id: 'tok_w2', text: 'dos datos' },
      { id: 'tok_w3', text: 'del expediente' },
      { id: 'tok_w4', text: 'antes de' },
      { id: 'tok_w5', text: 'decir nada' },
    ],
    decoys: [
      { id: 'tok_d1', text: 'el nombre' },
      { id: 'tok_d2', text: 'basta con' },
    ],
  }),
  grade,
  solution: (data): WordBankAnswer => ({ order: data.tokens.map((t) => t.id) }),
  emptyAnswer: (): WordBankAnswer => ({ order: [] }),
  canSubmit: (data, draft): boolean => draft.order.length === data.tokens.length,
  validate,
  validateDraft,
  searchText: (data): readonly ContentText[] => [data.prompt, ...data.tokens.map((t) => t.text)],
  describe: (data): ContentText => text(data.prompt.slice(0, 90)),
  refs: (): readonly string[] => [],
  facets: (data, answer: Json) => {
    const parsed = wordBankAnswer.safeParse(answer);
    const placed = parsed.success ? parsed.data.order.length : 0;
    return { answered: placed > 0, placed, needed: data.tokens.length };
  },
  estimateSeconds: (data): number => 12 + data.tokens.length * 3,
  consumesHearts: true,
  supports: { hearts: true, timer: true, audio: false, keyboard: true },
  requires: [],
});
