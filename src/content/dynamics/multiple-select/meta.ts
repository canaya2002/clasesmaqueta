import { defineDynamic, type GradeResult } from '@/content/engine/dynamic';
import { localIssue, type LocalIssue } from '@/content/engine/issues';
import { key, score, text, type ContentText, type Json } from '@/content/engine/primitives';
import {
  multipleSelectAnswer,
  multipleSelectData,
  multipleSelectDetail,
  multipleSelectDraft,
  type MultipleSelectAnswer,
  type MultipleSelectData,
  type MultipleSelectDetail,
} from './schema';

declare module '@/content/engine/registry.types' {
  interface DynamicRegistryMap {
    'multiple-select': {
      data: MultipleSelectData;
      answer: MultipleSelectAnswer;
      detail: MultipleSelectDetail;
    };
  }
}

/**
 * Calificación con CORRECCIÓN POR ADIVINANZA: `score = clamp01(TP/P − FP/N)`.
 *
 * La fórmula ingenua `TP/P` premia marcar todo con 1.00, y en un curso de cumplimiento premiar el ruido es
 * enseñar a adivinar. La exactitud balanceada `0.5·(TP/P) + 0.5·(TN/N)` da 0.50 tanto a "marqué todo" como
 * a "no marqué nada", que es absurdo.
 *
 * Con P=2 y N=3: marcar todo → 0.00; una de dos sin falsos → 0.50; dos de dos con un falso → 0.67.
 */
function grade(data: MultipleSelectData, answer: MultipleSelectAnswer): GradeResult<MultipleSelectDetail> {
  const correctSet = new Set<string>(data.correctOptionIds);
  const chosen = new Set<string>(answer.optionIds);
  const p = correctSet.size;
  const n = data.options.length - p;

  let tp = 0;
  let fp = 0;
  for (const id of chosen) {
    if (correctSet.has(id)) tp += 1;
    else fp += 1;
  }

  const raw = p === 0 ? 0 : tp / p - (n === 0 ? 0 : fp / n);
  const correct = tp === p && fp === 0;

  return {
    correct,
    score: score(raw),
    feedback: correct ? null : key('player.feedback.partialSelection'),
    detail: { correctOptionIds: data.correctOptionIds, truePositives: tp, falsePositives: fp },
    skillScores: {},
  };
}

function validate(data: MultipleSelectData): readonly LocalIssue[] {
  const issues: LocalIssue[] = [];
  const ids = new Set<string>(data.options.map((o) => o.id));
  for (const id of data.correctOptionIds) {
    if (!ids.has(id)) {
      issues.push(localIssue('unsolvable-step', `la opción correcta ${id} no existe entre las opciones`, { field: ['correctOptionIds'] }));
    }
  }
  if (data.correctOptionIds.length >= data.options.length) {
    issues.push(
      localIssue('unsolvable-step', 'todas las opciones están marcadas como correctas: no hay distractores', {
        field: ['correctOptionIds'],
        fixHint: 'La fórmula de corrección por adivinanza necesita al menos un distractor.',
      }),
    );
  }
  return issues;
}

function validateDraft(draft: unknown): readonly LocalIssue[] {
  const parsed = multipleSelectDraft.safeParse(draft);
  if (!parsed.success) return [localIssue('schema', 'el borrador tiene una forma que el editor no reconoce')];
  const d = parsed.data;
  const issues: LocalIssue[] = [];
  if (d.prompt.trim().length === 0) issues.push(localIssue('schema', 'falta el enunciado', { field: ['prompt'] }));
  if (d.options.length < 2) issues.push(localIssue('schema', 'hacen falta al menos 2 opciones', { field: ['options'] }));
  if (d.correctOptionIds.length === 0) {
    issues.push(localIssue('unsolvable-step', 'no hay ninguna opción marcada como correcta', { field: ['correctOptionIds'] }));
  }
  if (d.correctOptionIds.length >= d.options.length && d.options.length > 0) {
    issues.push(localIssue('unsolvable-step', 'no queda ningún distractor', { field: ['correctOptionIds'] }));
  }
  return issues;
}

export const multipleSelect = defineDynamic<'multiple-select'>({
  type: 'multiple-select',
  label: key('dynamics.multipleSelect.label'),
  version: 1,
  dataSchema: multipleSelectData,
  answerSchema: multipleSelectAnswer,
  detailSchema: multipleSelectDetail,
  draftSchema: multipleSelectDraft,
  defaultData: multipleSelectData.parse({
    prompt: '¿Qué datos deben verificarse antes de dar información de un expediente por teléfono?',
    options: [
      { id: 'opt_ms1', text: 'El número de expediente' },
      { id: 'opt_ms2', text: 'La fecha de nacimiento registrada' },
      { id: 'opt_ms3', text: 'El nombre completo, y con eso basta' },
      { id: 'opt_ms4', text: 'El nombre de quien lo recomendó' },
    ],
    correctOptionIds: ['opt_ms1', 'opt_ms2'],
    revealCount: false,
  }),
  grade,
  solution: (data): MultipleSelectAnswer => ({ optionIds: [...data.correctOptionIds] }),
  emptyAnswer: (): MultipleSelectAnswer => ({ optionIds: [] }),
  canSubmit: (_data, draft): boolean => draft.optionIds.length > 0,
  validate,
  validateDraft,
  searchText: (data): readonly ContentText[] => [data.prompt, ...data.options.map((o) => o.text)],
  describe: (data): ContentText => text(data.prompt.slice(0, 90)),
  refs: (): readonly string[] => [],
  facets: (data, answer: Json) => {
    const parsed = multipleSelectAnswer.safeParse(answer);
    const picked = parsed.success ? parsed.data.optionIds.length : 0;
    return { answered: picked > 0, picked, optionCount: data.options.length };
  },
  estimateSeconds: (data): number => 8 + data.options.length * 2,
  consumesHearts: true,
  supports: { hearts: true, timer: true, audio: false, keyboard: true },
  requires: [],
});
