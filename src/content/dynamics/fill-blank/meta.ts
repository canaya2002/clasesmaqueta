import { defineDynamic, type GradeResult } from '@/content/engine/dynamic';
import { localIssue, type LocalIssue } from '@/content/engine/issues';
import { key, score, text, type ContentText, type Json } from '@/content/engine/primitives';
import { matchesAccepted } from '../_shared/grading';
import {
  fillBlankAnswer,
  fillBlankData,
  fillBlankDetail,
  fillBlankDraft,
  splitTemplate,
  type FillBlankAnswer,
  type FillBlankData,
  type FillBlankDetail,
} from './schema';

declare module '@/content/engine/registry.types' {
  interface DynamicRegistryMap {
    'fill-blank': { data: FillBlankData; answer: FillBlankAnswer; detail: FillBlankDetail };
  }
}

function grade(data: FillBlankData, answer: FillBlankAnswer): GradeResult<FillBlankDetail> {
  const perBlank = data.blanks.map((blank, i) => ({
    id: blank.id,
    ok: matchesAccepted(answer.values[i] ?? '', blank.accepted, { typoTolerance: blank.typoTolerance }),
    expected: blank.accepted[0] ?? '',
  }));

  const hits = perBlank.filter((b) => b.ok).length;
  const correct = hits === data.blanks.length;

  return {
    correct,
    score: score(data.blanks.length === 0 ? 0 : hits / data.blanks.length),
    feedback: correct ? null : key('player.feedback.someBlanksWrong'),
    detail: { perBlank },
    skillScores: {},
  };
}

function validate(data: FillBlankData): readonly LocalIssue[] {
  const issues: LocalIssue[] = [];
  const marks = splitTemplate(data.template).filter((s) => s.kind === 'blank').map((s) => s.value);
  const declared = new Set<string>(data.blanks.map((b) => b.id));

  if (marks.length !== data.blanks.length) {
    issues.push(
      localIssue(
        'schema',
        `la plantilla tiene ${String(marks.length)} marcas y hay ${String(data.blanks.length)} huecos declarados`,
        { field: ['template'], fixHint: 'Cada hueco necesita exactamente una marca en el texto.' },
      ),
    );
  }
  for (const m of marks) {
    if (!declared.has(m)) {
      issues.push(localIssue('broken-ref', `la marca ${m} no corresponde a ningún hueco`, { field: ['template'] }));
    }
  }
  if (data.mode === 'bank' && data.decoys.length === 0) {
    issues.push(
      localIssue('schema', 'en modo banco hacen falta distractores, o el ejercicio se resuelve por descarte', {
        field: ['decoys'],
        severity: 'warning',
      }),
    );
  }
  return issues;
}

function validateDraft(draft: unknown): readonly LocalIssue[] {
  const parsed = fillBlankDraft.safeParse(draft);
  if (!parsed.success) return [localIssue('schema', 'el borrador tiene una forma que el editor no reconoce')];
  const d = parsed.data;
  const issues: LocalIssue[] = [];
  if (d.template.trim().length === 0) issues.push(localIssue('schema', 'falta el texto', { field: ['template'] }));
  if (d.blanks.length === 0) issues.push(localIssue('schema', 'no hay ningún hueco', { field: ['blanks'] }));
  d.blanks.forEach((b, i) => {
    if (b.accepted.length === 0 || (b.accepted[0] ?? '').trim().length === 0) {
      issues.push(localIssue('unsolvable-step', `el hueco ${String(i + 1)} no tiene respuesta aceptada`, { field: ['blanks', i] }));
    }
  });
  return issues;
}

export const fillBlank = defineDynamic<'fill-blank'>({
  type: 'fill-blank',
  label: key('dynamics.fillBlank.label'),
  version: 1,
  dataSchema: fillBlankData,
  answerSchema: fillBlankAnswer,
  detailSchema: fillBlankDetail,
  draftSchema: fillBlankDraft,
  defaultData: fillBlankData.parse({
    template:
      'Un documento original que entrega el cliente se recibe con {{bnk_a1}}, se escanea y el original se devuelve el {{bnk_a2}} día.',
    blanks: [
      { id: 'bnk_a1', accepted: ['acuse', 'acuse de recibo'], typoTolerance: true },
      { id: 'bnk_a2', accepted: ['mismo'], typoTolerance: false },
    ],
    mode: 'input',
    decoys: [],
  }),
  grade,
  solution: (data): FillBlankAnswer => ({ values: data.blanks.map((b) => b.accepted[0] ?? '') }),
  emptyAnswer: (data): FillBlankAnswer => ({ values: data.blanks.map(() => '') }),
  /**
   * El `answerSchema` describe el ESPACIO DEL BORRADOR, con huecos vacíos permitidos: si exigiera huecos
   * llenos, borrar el hueco 2 haría que el draft dejara de parsear y el envoltorio tendría que elegir entre
   * descartar los otros tres o desmontar el input con el foco. La completitud vive aquí.
   */
  canSubmit: (_data, draft): boolean => draft.values.every((v) => v.trim().length > 0),
  validate,
  validateDraft,
  /**
   * Se indexa el texto RESUELTO, no la plantilla cruda.
   *
   * Con las marcas dentro, buscar "acuse" en el ⌘K no encontraría el ejercicio que pregunta justamente por
   * el acuse: la palabra solo existe en la lista de respuestas aceptadas. Lo cazó el arnés de conformidad,
   * que rechaza marcado en el texto buscable.
   */
  searchText: (data): readonly ContentText[] => {
    const byId = new Map<string, string>(data.blanks.map((b) => [b.id, b.accepted[0] ?? '']));
    const resolved = data.template.replace(/\{\{([^}]+)\}\}/g, (_, id: string) => byId.get(id) ?? '');
    return [text(resolved), ...data.blanks.flatMap((b) => b.accepted.map((a) => text(a)))];
  },
  describe: (data): ContentText => text(data.template.replace(/\{\{[^}]+\}\}/g, '____').slice(0, 90)),
  refs: (): readonly string[] => [],
  facets: (data, answer: Json) => {
    const parsed = fillBlankAnswer.safeParse(answer);
    const filled = parsed.success ? parsed.data.values.filter((v) => v.trim().length > 0).length : 0;
    return { answered: filled > 0, filled, blanks: data.blanks.length, mode: data.mode };
  },
  estimateSeconds: (data): number => 10 + data.blanks.length * 6,
  consumesHearts: true,
  supports: { hearts: true, timer: true, audio: false, keyboard: true },
  requires: [],
});
