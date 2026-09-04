/**
 * SENDA — proyección de un hecho del corpus a CUALQUIERA de las siete dinámicas.
 *
 * El primer generador producía `multiple-choice` para los ~2,100 ejercicios del catálogo. Compilaba, pasaba
 * las pruebas y dejaba SEIS de las siete dinámicas construidas inalcanzables desde la app: el argumento
 * entero del proyecto —"añadir una dinámica es un archivo y una línea"— no se podía ver funcionando.
 *
 * La regla de reparto no es aleatoria. Cada tipo mide algo distinto y aparece donde ese algo importa:
 *
 * - `multiple-choice` y `true-false-swipe` son RECONOCIMIENTO. Baratos, rápidos, buenos para calentar.
 * - `multiple-select` y `match-pairs` son DISCRIMINACIÓN: exigen separar lo correcto de lo plausible.
 * - `fill-blank` y `word-bank` son RECUERDO y PRODUCCIÓN: no hay dónde elegir, hay que saberlo.
 * - `order-sequence` es PROCEDIMIENTO, y por eso solo aparece donde se evalúa: `test` y `checkpoint`.
 *
 * Las lecciones de `test` cargan hacia recuerdo y procedimiento; las de `learn`, hacia reconocimiento.
 */

import { mix32, u01 } from '@/lib/rng';
import type { Json } from '@/content/engine/primitives';
import type { LessonKind } from '@/content/engine/schema';
import type { Fact, UnitTopic } from '@/content/seed/corpus';
import { clozeAt, extrasFor } from '@/content/seed/procedures';

const NS_LOCAL = 0x5e11c101;

export type StepType =
  | 'multiple-choice'
  | 'multiple-select'
  | 'true-false-swipe'
  | 'match-pairs'
  | 'word-bank'
  | 'fill-blank'
  | 'order-sequence';

/** Id LOCAL al paso. Alcance `data`, así que basta con que sea estable y no choque dentro del ejercicio. */
function localId(prefix: string, salt: number, index: number): string {
  return `${prefix}_${(mix32(NS_LOCAL, salt, index) >>> 0).toString(32).padStart(6, '0').slice(-6)}`;
}

function shuffled<T>(items: readonly T[], salt: number): readonly T[] {
  return items
    .map((v, i) => ({ v, k: u01(mix32(NS_LOCAL, salt, i + 977)) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}

export interface StepContext {
  readonly unit: UnitTopic;
  readonly fact: Fact;
  /** Hechos vecinos de la misma unidad, para los tipos que necesitan más de uno. */
  readonly neighbours: readonly Fact[];
  readonly salt: number;
  /** Cuál de las frases con hueco de la unidad toca. */
  readonly clozeIndex: number;
}

/* ------------------------------------------------------------------ el reparto */

const PLAN: Readonly<Record<LessonKind, readonly StepType[]>> = {
  learn: [
    'multiple-choice', 'true-false-swipe', 'multiple-choice', 'match-pairs', 'multiple-choice',
    'multiple-select', 'true-false-swipe', 'multiple-choice', 'word-bank', 'multiple-choice', 'match-pairs',
  ],
  practice: [
    'true-false-swipe', 'multiple-choice', 'multiple-select', 'match-pairs', 'fill-blank',
    'multiple-choice', 'word-bank', 'true-false-swipe', 'multiple-choice', 'multiple-select', 'match-pairs',
  ],
  story: [
    'multiple-choice', 'multiple-choice', 'true-false-swipe', 'match-pairs', 'multiple-choice',
    'word-bank', 'multiple-choice', 'multiple-select', 'true-false-swipe', 'multiple-choice', 'multiple-choice',
  ],
  test: [
    'multiple-select', 'fill-blank', 'match-pairs', 'multiple-choice', 'word-bank',
    'order-sequence', 'fill-blank', 'multiple-select', 'true-false-swipe', 'multiple-choice', 'match-pairs',
  ],
  checkpoint: [
    'multiple-choice', 'match-pairs', 'fill-blank', 'multiple-select', 'true-false-swipe',
    'order-sequence', 'multiple-choice', 'word-bank', 'match-pairs', 'multiple-select', 'multiple-choice',
  ],
};

/**
 * Rota el plan por lección para que dos lecciones seguidas de la misma unidad no traigan el mismo tipo en
 * la misma posición. Sin esto, "el paso 4 siempre es relacionar" se aprende en dos lecciones y el alumno
 * deja de leer el enunciado.
 */
export function typeAt(kind: LessonKind, localIndex: number, stepIndex: number): StepType {
  const plan = PLAN[kind];
  return plan[(stepIndex + localIndex) % plan.length] ?? 'multiple-choice';
}

/* ------------------------------------------------------------- los constructores */

function trueFalse(ctx: StepContext): Json {
  // La mitad de los enunciados son falsos. Un generador que solo afirma verdades se aprende en tres pasos:
  // el alumno deja de leer y desliza siempre hacia el mismo lado.
  const affirm = u01(mix32(NS_LOCAL, ctx.salt, 3)) < 0.5;
  const wrong = ctx.fact.wrong[ctx.salt % ctx.fact.wrong.length] ?? ctx.fact.wrong[0] ?? '';
  const claim = affirm ? ctx.fact.correct : wrong;
  return {
    statement: `Ante ${ctx.fact.subject}, lo correcto es: ${lower(claim)}.`,
    isTrue: affirm,
    trueLabel: 'Correcto',
    falseLabel: 'Incorrecto',
  };
}

function multipleSelect(ctx: StepContext): Json | null {
  const others = ctx.neighbours.filter((f) => f !== ctx.fact);
  const second = others[ctx.salt % Math.max(1, others.length)];
  if (second === undefined) return null;

  const corrects = [ctx.fact.correct, second.correct];
  const wrongs = [
    ctx.fact.wrong[0] ?? '',
    second.wrong[1] ?? second.wrong[0] ?? '',
    ctx.fact.wrong[2] ?? ctx.fact.wrong[1] ?? '',
  ].filter((w) => w !== '');
  if (wrongs.length < 2) return null;

  const rows = shuffled(
    [...corrects.map((t) => ({ t, ok: true })), ...wrongs.map((t) => ({ t, ok: false }))],
    ctx.salt,
  );
  const options = rows.map((r, i) => ({ id: localId('opt', ctx.salt, i), text: r.t, ok: r.ok }));

  return {
    prompt: `En ${lower(ctx.unit.title)}, ¿cuáles de estas acciones son correctas?`,
    options: options.map((o) => ({ id: o.id, text: o.text })),
    correctOptionIds: options.filter((o) => o.ok).map((o) => o.id),
    // Decir cuántas son correctas convierte el ejercicio en aritmética: se marcan dos y se acierta sin leer.
    revealCount: false,
  };
}

const MAX_PAIR_WORDS = 10;

function matchPairs(ctx: StepContext): Json | null {
  // Dos columnas de celdas de quince palabras dejan de ser un ejercicio de relacionar y pasan a ser
  // lectura comparada, y en un teléfono no caben en pantalla. Los hechos largos caen a otro tipo.
  const pool = [ctx.fact, ...ctx.neighbours.filter((f) => f !== ctx.fact)].filter(
    (f) => f.correct.split(' ').length <= MAX_PAIR_WORDS && f.subject.split(' ').length <= MAX_PAIR_WORDS,
  );
  const picked = shuffled(pool, ctx.salt).slice(0, 4);
  if (picked.length < 3) return null;

  const pairs = picked.map((f, i) => ({
    id: localId('pai', ctx.salt, i),
    left: capitalize(f.subject),
    right: f.correct,
  }));

  // Distractores a la derecha: sin ellos, las dos últimas parejas se resuelven por descarte.
  const extras = picked
    .slice(0, 2)
    .map((f, i) => ({ id: localId('pai', ctx.salt, 40 + i), text: f.wrong[0] ?? '' }))
    .filter((e) => e.text !== '');

  return {
    prompt: extrasFor(ctx.unit.slug).pairsPrompt,
    pairs,
    extraRights: extras,
    tolerance: 0,
  };
}

// Diez fichas es el techo donde armar la frase sigue siendo un ejercicio. La mediana del corpus son nueve
// palabras, así que el 80% de los hechos entran; los seis más largos caen a opción múltiple.
const MAX_TOKENS = 10;

function wordBank(ctx: StepContext): Json | null {
  const words = ctx.fact.correct.split(' ').filter((w) => w.length > 0);
  // Una frase de quince fichas no es un ejercicio, es una transcripción. Si no cabe, el llamador cae a otro tipo.
  if (words.length < 4 || words.length > MAX_TOKENS) return null;

  const tokens = words.map((w, i) => ({ id: localId('tok', ctx.salt, i), text: w }));
  const wrongWords = (ctx.fact.wrong[0] ?? '')
    .split(' ')
    .filter((w) => w.length > 3 && !words.includes(w));
  const decoys = shuffled(wrongWords, ctx.salt)
    .slice(0, 2)
    .map((w, i) => ({ id: localId('tok', ctx.salt, 60 + i), text: w }));

  return {
    prompt: `Arma la respuesta correcta ante ${ctx.fact.subject}.`,
    tokens,
    decoys,
  };
}

function fillBlank(ctx: StepContext): Json | null {
  const item = clozeAt(ctx.unit.slug, ctx.clozeIndex);
  if (item === undefined || !item.sentence.includes('___')) return null;

  const id = localId('bnk', ctx.salt, 0);
  const accepted = [...item.accepted];
  const canonical = accepted[0] ?? '';
  if (canonical === '') return null;

  return {
    template: item.sentence.replace('___', `{{${id}}}`),
    blanks: [
      {
        id,
        accepted,
        // Tolerancia a erratas solo en palabras largas: en "voz" y "vos" un carácter cambia la palabra, y en
        // un curso de cumplimiento aceptar la equivocada es exactamente lo que no puede pasar.
        typoTolerance: canonical.length >= 6,
      },
    ],
    mode: 'input',
    decoys: [],
  };
}

function orderSequence(ctx: StepContext): Json | null {
  const extras = extrasFor(ctx.unit.slug);
  if (extras.procedureItems.length < 3) return null;
  return {
    prompt: extras.procedurePrompt,
    items: extras.procedureItems.map((t, i) => ({ id: localId('itm', ctx.salt, i), text: t })),
  };
}

/** Devuelve `null` si este hecho no puede producir ese tipo; el llamador cae a `multiple-choice`. */
export function dataFor(type: StepType, ctx: StepContext): Json | null {
  switch (type) {
    case 'multiple-choice':
      return null;
    case 'true-false-swipe':
      return trueFalse(ctx);
    case 'multiple-select':
      return multipleSelect(ctx);
    case 'match-pairs':
      return matchPairs(ctx);
    case 'word-bank':
      return wordBank(ctx);
    case 'fill-blank':
      return fillBlank(ctx);
    case 'order-sequence':
      return orderSequence(ctx);
  }
}

// `slice(0, 1)` y no `s[0]`: con `noUncheckedIndexedAccess` el índice devuelve `string | undefined` y
// concatenarlo produciría "undefined..." en pantalla si la cadena viniera vacía.
function lower(s: string): string {
  return s.slice(0, 1).toLocaleLowerCase('es-MX') + s.slice(1);
}

function capitalize(s: string): string {
  return s.slice(0, 1).toLocaleUpperCase('es-MX') + s.slice(1);
}
