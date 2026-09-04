/**
 * Opción múltiple — la dinámica de referencia.
 *
 * Es la que `ADDING_A_DYNAMIC.md` usa como ejemplo: todo lo que hay aquí es el CABLEADO mínimo, y con eso
 * la dinámica aparece automáticamente en el editor, la biblioteca, el player y la analítica.
 */

import { defineDynamic, type GradeResult } from '../../engine/dynamic';
import { localIssue, type LocalIssue } from '../../engine/issues';
import { key, score, text, type ContentText } from '../../engine/primitives';
import type { Json } from '../../engine/primitives';
import {
  asOptionId,
  multipleChoiceAnswer,
  multipleChoiceData,
  multipleChoiceDetail,
  multipleChoiceDraft,
  type MultipleChoiceAnswer,
  type MultipleChoiceData,
  type MultipleChoiceDetail,
} from './schema';

declare module '../../engine/registry.types' {
  interface DynamicRegistryMap {
    'multiple-choice': {
      data: MultipleChoiceData;
      answer: MultipleChoiceAnswer;
      detail: MultipleChoiceDetail;
    };
  }
}

function grade(data: MultipleChoiceData, answer: MultipleChoiceAnswer): GradeResult<MultipleChoiceDetail> {
  const correct = answer.optionId !== null && answer.optionId === data.correctOptionId;
  return {
    correct,
    score: score(correct ? 1 : 0),
    feedback: correct ? null : key('player.feedback.wrongChoice'),
    detail: { correctOptionId: data.correctOptionId, chosenOptionId: answer.optionId },
    // Vacío a propósito: esta dinámica no tiene información por skill más fina que la del paso, así que el
    // runtime reparte el score entre los skills declarados en el Step. Solo las dinámicas compuestas
    // (clasificar, emparejar) llenan esto.
    skillScores: {},
  };
}

/**
 * El SIGNIFICADO va aquí, no en el schema.
 *
 * "correctOptionId debe existir en options" dentro de `dataSchema` produce un editor que no puede editar el
 * error que te pide arreglar: el parse falla y el formulario no llega a montarse.
 */
function validate(data: MultipleChoiceData): readonly LocalIssue[] {
  const issues: LocalIssue[] = [];
  const ids = data.options.map((o) => o.id);

  if (!ids.includes(data.correctOptionId)) {
    issues.push(
      localIssue('unsolvable-step', 'falta la opción correcta (ninguna opción tiene «correcta» marcada)', {
        field: ['correctOptionId'],
        fixHint: 'Marca una de las opciones como correcta en el panel de propiedades.',
      }),
    );
  }

  const seen = new Set<string>();
  ids.forEach((id, i) => {
    if (seen.has(id)) {
      issues.push(localIssue('duplicate-id', `la opción ${i + 1} repite un identificador`, { field: ['options', i, 'id'] }));
    }
    seen.add(id);
  });

  if (data.options.length > 6) {
    issues.push(
      localIssue('schema', `tiene ${data.options.length} opciones y el máximo son 6`, {
        field: ['options'],
        severity: 'warning',
        fixHint: 'Por encima de seis opciones, los atajos de teclado 1–6 dejan de alcanzar.',
      }),
    );
  }

  return issues;
}

/**
 * Validación del BORRADOR: dice qué falta sin impedir seguir escribiendo.
 *
 * Es una función distinta de `validate` a propósito: `validate` opera sobre un data ya parseado y decide si
 * el paso se puede PUBLICAR; esta opera sobre lo que el autor tiene a medias y decide qué MARCAR en rojo.
 */
function validateDraft(draft: unknown): readonly LocalIssue[] {
  const parsed = multipleChoiceDraft.safeParse(draft);
  if (!parsed.success) {
    return [localIssue('schema', 'el borrador tiene una forma que el editor no reconoce')];
  }
  const d = parsed.data;
  const issues: LocalIssue[] = [];

  if (d.prompt.trim().length === 0) {
    issues.push(localIssue('schema', 'falta el enunciado', { field: ['prompt'] }));
  }
  if (d.options.length < 2) {
    issues.push(
      localIssue('schema', `hacen falta al menos 2 opciones (hay ${d.options.length})`, { field: ['options'] }),
    );
  }
  d.options.forEach((o, i) => {
    if (o.text.trim().length === 0) {
      issues.push(localIssue('schema', `la opción ${i + 1} está vacía`, { field: ['options', i, 'text'] }));
    }
  });
  if (d.correctOptionId === null) {
    issues.push(
      localIssue('unsolvable-step', 'falta marcar cuál es la opción correcta', { field: ['correctOptionId'] }),
    );
  } else if (!d.options.some((o) => o.id === d.correctOptionId)) {
    issues.push(
      localIssue('unsolvable-step', 'la opción marcada como correcta ya no existe', {
        field: ['correctOptionId'],
        fixHint: 'Probablemente se borró esa opción. Marca otra.',
      }),
    );
  }
  return issues;
}

export const multipleChoice = defineDynamic<'multiple-choice'>({
  type: 'multiple-choice',
  label: key('dynamics.multipleChoice.label'),
  version: 1,

  dataSchema: multipleChoiceData,
  answerSchema: multipleChoiceAnswer,
  detailSchema: multipleChoiceDetail,

  defaultData: multipleChoiceData.parse({
    prompt: 'Escribe aquí el enunciado',
    options: [
      { id: 'opt_aa01', text: 'Primera opción' },
      { id: 'opt_aa02', text: 'Segunda opción' },
    ],
    correctOptionId: 'opt_aa01',
    shuffle: true,
    figure: null,
  }),

  draftSchema: multipleChoiceDraft,
  validateDraft,

  grade,
  solution: (data): MultipleChoiceAnswer => ({ optionId: data.correctOptionId }),
  emptyAnswer: (): MultipleChoiceAnswer => ({ optionId: null }),
  canSubmit: (_data, draft): boolean => draft.optionId !== null,
  validate,

  searchText: (data): readonly ContentText[] => [data.prompt, ...data.options.map((o) => o.text)],
  describe: (data): ContentText => text(data.prompt.slice(0, 90)),
  refs: (data): readonly string[] => (data.figure !== null && data.figure.kind === 'media' ? [data.figure.id] : []),

  /** Dimensiones agregables sin conocer la dinámica: la analítica no reimporta el answerSchema. */
  facets: (data, answer: Json): Readonly<Record<string, number | string | boolean>> => {
    const parsed = multipleChoiceAnswer.safeParse(answer);
    const chosen = parsed.success ? parsed.data.optionId : null;
    return {
      answered: chosen !== null,
      optionCount: data.options.length,
      chosePosition: chosen === null ? -1 : data.options.findIndex((o) => o.id === chosen),
    };
  },

  estimateSeconds: (data): number => 6 + data.options.length * 1.6,
  consumesHearts: true,
  supports: { hearts: true, timer: true, audio: false, keyboard: true },
  requires: [],
});

export { asOptionId };
