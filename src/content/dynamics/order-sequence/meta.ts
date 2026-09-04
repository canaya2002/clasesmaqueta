import { defineDynamic, type GradeResult } from '@/content/engine/dynamic';
import { localIssue, type LocalIssue } from '@/content/engine/issues';
import { key, score, text, type ContentText, type Json } from '@/content/engine/primitives';
import { MIN_ITEMS_FOR_PARTIAL, orderScore } from '../_shared/grading';
import {
  orderSequenceAnswer,
  orderSequenceData,
  orderSequenceDetail,
  orderSequenceDraft,
  type OrderSequenceAnswer,
  type OrderSequenceData,
  type OrderSequenceDetail,
} from './schema';

declare module '@/content/engine/registry.types' {
  interface DynamicRegistryMap {
    'order-sequence': {
      data: OrderSequenceData;
      answer: OrderSequenceAnswer;
      detail: OrderSequenceDetail;
    };
  }
}

function inversionsOf(placed: readonly string[], solution: readonly string[]): number {
  const rank = new Map(solution.map((id, i) => [id, i] as const));
  const ranks = placed.map((id) => rank.get(id) ?? -1);
  let count = 0;
  for (let i = 0; i < ranks.length; i += 1) {
    for (let j = i + 1; j < ranks.length; j += 1) {
      const a = ranks[i];
      const b = ranks[j];
      if (a !== undefined && b !== undefined && a > b) count += 1;
    }
  }
  return count;
}

function grade(data: OrderSequenceData, answer: OrderSequenceAnswer): GradeResult<OrderSequenceDetail> {
  const expected = data.items.map((i) => i.id);
  const value = orderScore(answer.order, expected);
  const correct = value === 1;

  return {
    correct,
    score: score(value),
    feedback: correct ? null : key('player.feedback.wrongOrder'),
    detail: { expected, inversions: inversionsOf(answer.order, expected) },
    skillScores: {},
  };
}

function validate(data: OrderSequenceData): readonly LocalIssue[] {
  const issues: LocalIssue[] = [];
  if (data.items.length < MIN_ITEMS_FOR_PARTIAL) {
    issues.push(
      localIssue(
        'schema',
        `con ${String(data.items.length)} pasos la calificación es binaria: el crédito parcial necesita al menos ${String(MIN_ITEMS_FOR_PARTIAL)}`,
        { field: ['items'], severity: 'info' },
      ),
    );
  }
  const seen = new Set<string>();
  data.items.forEach((item, i) => {
    if (seen.has(item.text)) {
      issues.push(localIssue('duplicate-id', `el paso “${item.text}” aparece dos veces`, { field: ['items', i] }));
    }
    seen.add(item.text);
  });
  return issues;
}

function validateDraft(draft: unknown): readonly LocalIssue[] {
  const parsed = orderSequenceDraft.safeParse(draft);
  if (!parsed.success) return [localIssue('schema', 'el borrador tiene una forma que el editor no reconoce')];
  const issues: LocalIssue[] = [];
  if (parsed.data.items.length < 3) issues.push(localIssue('schema', 'hacen falta al menos 3 pasos', { field: ['items'] }));
  parsed.data.items.forEach((it, i) => {
    if (it.text.trim().length === 0) issues.push(localIssue('schema', `el paso ${String(i + 1)} está vacío`, { field: ['items', i] }));
  });
  return issues;
}

export const orderSequence = defineDynamic<'order-sequence'>({
  type: 'order-sequence',
  label: key('dynamics.orderSequence.label'),
  version: 1,
  dataSchema: orderSequenceData,
  answerSchema: orderSequenceAnswer,
  detailSchema: orderSequenceDetail,
  draftSchema: orderSequenceDraft,
  defaultData: orderSequenceData.parse({
    prompt: 'Ordena los pasos para recibir un documento original en mostrador.',
    items: [
      { id: 'itm_o1', text: 'Verificar que el documento esté completo y legible' },
      { id: 'itm_o2', text: 'Sellar el acuse con el detalle de lo recibido' },
      { id: 'itm_o3', text: 'Escanearlo y guardarlo en el expediente' },
      { id: 'itm_o4', text: 'Devolver el original al cliente' },
      { id: 'itm_o5', text: 'Registrar la entrada con fecha y responsable' },
    ],
  }),
  grade,
  solution: (data): OrderSequenceAnswer => ({ order: data.items.map((i) => i.id) }),
  /**
   * Arranca DESORDENADO, no vacío ni resuelto.
   *
   * Un ejercicio de ordenar con la lista vacía no se entiende, y devolver el orden correcto lo daría por
   * resuelto sin que el alumno toque nada. El desorden es determinista —una rotación más un intercambio—
   * porque `emptyAnswer` es una función pura y no puede pedir aleatoriedad: la misma semilla tiene que
   * producir la misma pantalla en cada máquina.
   */
  emptyAnswer: (data): OrderSequenceAnswer => {
    const ids = data.items.map((i) => i.id);
    const n = ids.length;
    if (n < 2) return { order: ids };
    const shift = Math.ceil(n / 2);
    const rotated = [...ids.slice(shift), ...ids.slice(0, shift)];
    const a = rotated[0];
    const b = rotated[1];
    if (a !== undefined && b !== undefined) {
      rotated[0] = b;
      rotated[1] = a;
    }
    return { order: rotated };
  },
  canSubmit: (data, draft): boolean => draft.order.length === data.items.length,
  validate,
  validateDraft,
  searchText: (data): readonly ContentText[] => [data.prompt, ...data.items.map((i) => i.text)],
  describe: (data): ContentText => text(data.prompt.slice(0, 90)),
  refs: (): readonly string[] => [],
  facets: (data, answer: Json) => {
    const parsed = orderSequenceAnswer.safeParse(answer);
    return {
      answered: parsed.success,
      items: data.items.length,
      inversions: parsed.success ? inversionsOf(parsed.data.order, data.items.map((i) => i.id)) : -1,
    };
  },
  estimateSeconds: (data): number => 12 + data.items.length * 4,
  consumesHearts: true,
  supports: { hearts: true, timer: true, audio: false, keyboard: true },
  requires: [],
});
