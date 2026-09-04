import { defineDynamic, type GradeResult } from '@/content/engine/dynamic';
import { localIssue, type LocalIssue } from '@/content/engine/issues';
import { key, score, text, type ContentText, type Json } from '@/content/engine/primitives';
import {
  trueFalseAnswer,
  trueFalseData,
  trueFalseDetail,
  trueFalseDraft,
  type TrueFalseAnswer,
  type TrueFalseData,
  type TrueFalseDetail,
} from './schema';

declare module '@/content/engine/registry.types' {
  interface DynamicRegistryMap {
    'true-false-swipe': { data: TrueFalseData; answer: TrueFalseAnswer; detail: TrueFalseDetail };
  }
}

function grade(data: TrueFalseData, answer: TrueFalseAnswer): GradeResult<TrueFalseDetail> {
  const correct = answer.value !== null && answer.value === data.isTrue;
  return {
    correct,
    score: score(correct ? 1 : 0),
    feedback: correct ? null : key('player.feedback.wrongChoice'),
    detail: { expected: data.isTrue, chosen: answer.value },
    skillScores: {},
  };
}

function validate(data: TrueFalseData): readonly LocalIssue[] {
  const issues: LocalIssue[] = [];
  if (data.statement.trim().length < 12) {
    issues.push(
      localIssue('schema', 'la afirmación es demasiado corta para ser evaluable', {
        field: ['statement'],
        severity: 'warning',
      }),
    );
  }
  if (data.trueLabel === data.falseLabel) {
    issues.push(localIssue('schema', 'las dos etiquetas son idénticas', { field: ['falseLabel'] }));
  }
  return issues;
}

function validateDraft(draft: unknown): readonly LocalIssue[] {
  const parsed = trueFalseDraft.safeParse(draft);
  if (!parsed.success) return [localIssue('schema', 'el borrador tiene una forma que el editor no reconoce')];
  const issues: LocalIssue[] = [];
  if (parsed.data.statement.trim().length === 0) {
    issues.push(localIssue('schema', 'falta la afirmación', { field: ['statement'] }));
  }
  return issues;
}

export const trueFalseSwipe = defineDynamic<'true-false-swipe'>({
  type: 'true-false-swipe',
  label: key('dynamics.trueFalseSwipe.label'),
  version: 1,
  dataSchema: trueFalseData,
  answerSchema: trueFalseAnswer,
  detailSchema: trueFalseDetail,
  draftSchema: trueFalseDraft,
  defaultData: trueFalseData.parse({
    statement:
      'Si un familiar directo llama pidiendo el estatus del caso, puedes darle el avance general sin verificar autorización.',
    isTrue: false,
    trueLabel: 'Verdadero',
    falseLabel: 'Falso',
  }),
  grade,
  solution: (data): TrueFalseAnswer => ({ value: data.isTrue }),
  emptyAnswer: (): TrueFalseAnswer => ({ value: null }),
  canSubmit: (_data, draft): boolean => draft.value !== null,
  validate,
  validateDraft,
  searchText: (data): readonly ContentText[] => [data.statement],
  describe: (data): ContentText => text(data.statement.slice(0, 90)),
  refs: (): readonly string[] => [],
  facets: (_data, answer: Json) => {
    const parsed = trueFalseAnswer.safeParse(answer);
    return { answered: parsed.success && parsed.data.value !== null };
  },
  estimateSeconds: (): number => 9,
  consumesHearts: true,
  supports: { hearts: true, timer: true, audio: false, keyboard: true },
  requires: [],
});
