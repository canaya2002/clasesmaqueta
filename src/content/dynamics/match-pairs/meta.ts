import { defineDynamic, type GradeResult } from '@/content/engine/dynamic';
import { localIssue, type LocalIssue } from '@/content/engine/issues';
import { key, score, text, type ContentText, type Json } from '@/content/engine/primitives';
import {
  matchPairsAnswer,
  matchPairsData,
  matchPairsDetail,
  matchPairsDraft,
  type MatchPairsAnswer,
  type MatchPairsData,
  type MatchPairsDetail,
} from './schema';

declare module '@/content/engine/registry.types' {
  interface DynamicRegistryMap {
    'match-pairs': { data: MatchPairsData; answer: MatchPairsAnswer; detail: MatchPairsDetail };
  }
}

function grade(data: MatchPairsData, answer: MatchPairsAnswer): GradeResult<MatchPairsDetail> {
  const total = data.pairs.length;
  const rightOf = new Map(data.pairs.map((p) => [p.id, p.id] as const));

  let matched = 0;
  for (const m of answer.matched) {
    if (rightOf.get(m.leftId) === m.rightId) matched += 1;
  }

  const complete = matched === total;
  const correct = complete && answer.mistakes <= data.tolerance;
  const value = total === 0 ? 0 : Math.max(0, (matched - answer.mistakes) / total);

  return {
    correct,
    score: score(correct ? 1 : value),
    feedback: correct ? null : key('player.feedback.somePairsWrong'),
    detail: { pairs: total, mistakes: answer.mistakes },
    skillScores: {},
  };
}

function validate(data: MatchPairsData): readonly LocalIssue[] {
  const issues: LocalIssue[] = [];
  if (data.extraRights.length === 0 && data.pairs.length >= 4) {
    issues.push(
      localIssue('schema', 'sin opciones extra a la derecha, las dos últimas parejas se resuelven por descarte', {
        field: ['extraRights'],
        severity: 'warning',
        fixHint: 'Agrega al menos una opción que no empareje con nada.',
      }),
    );
  }
  const seen = new Set<string>();
  for (const p of data.pairs) {
    if (seen.has(p.left)) issues.push(localIssue('duplicate-id', `el término “${p.left}” aparece dos veces`, { field: ['pairs'] }));
    seen.add(p.left);
  }
  return issues;
}

function validateDraft(draft: unknown): readonly LocalIssue[] {
  const parsed = matchPairsDraft.safeParse(draft);
  if (!parsed.success) return [localIssue('schema', 'el borrador tiene una forma que el editor no reconoce')];
  const issues: LocalIssue[] = [];
  if (parsed.data.pairs.length < 3) issues.push(localIssue('schema', 'hacen falta al menos 3 parejas', { field: ['pairs'] }));
  parsed.data.pairs.forEach((p, i) => {
    if (p.left.trim().length === 0 || p.right.trim().length === 0) {
      issues.push(localIssue('schema', `la pareja ${String(i + 1)} está incompleta`, { field: ['pairs', i] }));
    }
  });
  return issues;
}

export const matchPairs = defineDynamic<'match-pairs'>({
  type: 'match-pairs',
  label: key('dynamics.matchPairs.label'),
  version: 1,
  dataSchema: matchPairsData,
  answerSchema: matchPairsAnswer,
  detailSchema: matchPairsDetail,
  draftSchema: matchPairsDraft,
  defaultData: matchPairsData.parse({
    prompt: 'Empareja cada situación con la acción que corresponde.',
    pairs: [
      { id: 'pai_m1', left: 'Documento original en mostrador', right: 'Sellar acuse y escanear' },
      { id: 'pai_m2', left: 'Plazo detectado en un documento', right: 'Registrarlo con responsable el mismo día' },
      { id: 'pai_m3', left: 'Familiar que pide información', right: 'Verificar autorización por escrito' },
      { id: 'pai_m4', left: 'Cliente que menciona una detención', right: 'Escalar al abogado de guardia' },
    ],
    extraRights: [{ id: 'pai_x1', text: 'Archivarlo sin acuse' }],
    tolerance: 1,
  }),
  grade,
  solution: (data): MatchPairsAnswer => ({
    matched: data.pairs.map((p) => ({ leftId: p.id, rightId: p.id })),
    mistakes: 0,
  }),
  emptyAnswer: (): MatchPairsAnswer => ({ matched: [], mistakes: 0 }),
  canSubmit: (data, draft): boolean => draft.matched.length === data.pairs.length,
  validate,
  validateDraft,
  searchText: (data): readonly ContentText[] => [
    data.prompt,
    ...data.pairs.flatMap((p) => [p.left, p.right]),
  ],
  describe: (data): ContentText => text(data.prompt.slice(0, 90)),
  refs: (): readonly string[] => [],
  facets: (data, answer: Json) => {
    const parsed = matchPairsAnswer.safeParse(answer);
    return {
      answered: parsed.success && parsed.data.matched.length > 0,
      matched: parsed.success ? parsed.data.matched.length : 0,
      mistakes: parsed.success ? parsed.data.mistakes : 0,
      pairs: data.pairs.length,
    };
  },
  estimateSeconds: (data): number => 10 + data.pairs.length * 5,
  consumesHearts: true,
  supports: { hearts: true, timer: true, audio: false, keyboard: true },
  requires: [],
});
