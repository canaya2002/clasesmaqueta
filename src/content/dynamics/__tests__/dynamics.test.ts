import { describe, expect, it } from 'vitest';
import { DYNAMICS } from '../index';
import { CONFORMANCE_CHECK_COUNT, checkDynamic } from '@/content/engine/conformance';
import { listDynamics } from '@/content/engine/registry';
import { isJsonObject, score } from '@/content/engine/primitives';
import { matchesAccepted, MIN_ITEMS_FOR_PARTIAL, orderScore } from '../_shared/grading';
import { multipleSelect } from '../multiple-select/meta';
import { orderSequence } from '../order-sequence/meta';
import { wordBank } from '../word-bank/meta';
import { fillBlank } from '../fill-blank/meta';
import { matchPairs } from '../match-pairs/meta';
import { multipleSelectData } from '../multiple-select/schema';

describe('el catálogo de la fase 3', () => {
  it('registra las siete primeras dinámicas', () => {
    expect(Object.keys(DYNAMICS)).toHaveLength(7);
    expect(listDynamics()).toHaveLength(7);
  });

  it('las siete pasan las 16 comprobaciones del arnés: 112 casos', () => {
    let total = 0;
    for (const dynamic of listDynamics()) {
      const result = checkDynamic(dynamic);
      total += result.checks.length;
      const failed = result.checks.filter((c) => !c.passed);
      expect(failed.map((f) => `${dynamic.type} ${f.id}: ${f.detail}`)).toStrictEqual([]);
    }
    expect(total).toBe(7 * CONFORMANCE_CHECK_COUNT);
  });

  it('todas declaran soporte de teclado', () => {
    for (const d of listDynamics()) expect(d.supports.keyboard).toBe(true);
  });
});

describe('guardas numéricas', () => {
  it('score(NaN) es 0, no NaN', () => {
    // `NaN < 0` y `NaN > 1` son ambas falsas: sin la guarda explícita, un 0/0 en cualquier fórmula de
    // calificación parcial se colaba entero hasta el reporte del alumno.
    expect(score(Number.NaN)).toBe(0);
    expect(score(Number.POSITIVE_INFINITY)).toBe(0);
    expect(score(-3)).toBe(0);
    expect(score(2)).toBe(1);
  });
});

describe('selección múltiple: corrección por adivinanza', () => {
  const data = multipleSelectData.parse({
    prompt: 'Enunciado de prueba con dos correctas',
    options: [
      { id: 'opt_t1', text: 'A' },
      { id: 'opt_t2', text: 'B' },
      { id: 'opt_t3', text: 'C' },
      { id: 'opt_t4', text: 'D' },
    ],
    correctOptionIds: ['opt_t1', 'opt_t2'],
    revealCount: false,
  });

  const gradeWith = (ids: readonly string[]) => {
    const bound = multipleSelect.bind(data);
    if (!bound.ok) throw new Error('bind falló');
    const graded = bound.value.grade({ optionIds: [...ids] });
    if (!graded.ok) throw new Error('grade falló');
    return graded.value;
  };

  it('marcar TODO no otorga crédito: premiar el ruido es enseñar a adivinar', () => {
    // La fórmula ingenua TP/P daría 1.00 a esta respuesta.
    expect(gradeWith(['opt_t1', 'opt_t2', 'opt_t3', 'opt_t4']).score).toBe(0);
  });

  it('una de dos sin falsos positivos vale la mitad', () => {
    expect(gradeWith(['opt_t1']).score).toBeCloseTo(0.5, 5);
  });

  it('dos de dos con un falso positivo pierde medio punto', () => {
    expect(gradeWith(['opt_t1', 'opt_t2', 'opt_t3']).score).toBeCloseTo(0.5, 5);
  });

  it('correcto exige el conjunto exacto', () => {
    expect(gradeWith(['opt_t1', 'opt_t2']).correct).toBe(true);
    expect(gradeWith(['opt_t1', 'opt_t2', 'opt_t3']).correct).toBe(false);
  });
});

describe('orden: distancia de Kendall recentrada, no LIS', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('el orden exacto vale 1 y el invertido 0', () => {
    expect(orderScore(ids, ids)).toBe(1);
    expect(orderScore([...ids].reverse(), ids)).toBe(0);
  });

  it('por debajo de 5 elementos la calificación es BINARIA', () => {
    // Con LIS y n=3, un barajado al azar sacaba 0.5 de media: medio punto regalado al azar puro.
    const three = ['a', 'b', 'c'];
    expect(orderScore(three, three)).toBe(1);
    expect(orderScore(['b', 'a', 'c'], three)).toBe(0);
    expect(MIN_ITEMS_FOR_PARTIAL).toBe(5);
  });

  it('un solo intercambio adyacente pierde poco', () => {
    const value = orderScore(['b', 'a', 'c', 'd', 'e', 'f'], ids);
    expect(value).toBeGreaterThan(0.85);
    expect(value).toBeLessThan(1);
  });

  it('la respuesta inicial de ordenar NUNCA es la solución', () => {
    const bound = orderSequence.bind(orderSequence.defaultData);
    if (!bound.ok) throw new Error('bind falló');
    const graded = bound.value.grade(bound.value.emptyAnswer());
    if (!graded.ok) throw new Error('grade falló');
    expect(graded.value.correct).toBe(false);
  });
});

describe('completar el espacio: normalización es-MX', () => {
  it('perdona acentos y mayúsculas, y acepta sinónimos', () => {
    expect(matchesAccepted('RECEPCIÓN', ['recepcion'], { typoTolerance: false })).toBe(true);
    expect(matchesAccepted('  acuse  ', ['acuse'], { typoTolerance: false })).toBe(true);
    expect(matchesAccepted('acuse de recibo', ['acuse', 'acuse de recibo'], { typoTolerance: false })).toBe(true);
  });

  it('tolera un typo en palabras largas', () => {
    expect(matchesAccepted('expedente', ['expediente'], { typoTolerance: true })).toBe(true);
  });

  it('NO tolera typos cuando hay dígitos: I-130 e I-131 son trámites distintos', () => {
    expect(matchesAccepted('I-131', ['I-130'], { typoTolerance: true })).toBe(false);
    expect(matchesAccepted('45 dias', ['15 dias'], { typoTolerance: true })).toBe(false);
  });

  it('NO perdona la ñ: la normalización la conserva a propósito', () => {
    expect(matchesAccepted('ano', ['año'], { typoTolerance: true })).toBe(false);
  });

  it('la respuesta vacía nunca acierta', () => {
    expect(matchesAccepted('', ['acuse'], { typoTolerance: true })).toBe(false);
    expect(matchesAccepted('   ', ['acuse'], { typoTolerance: true })).toBe(false);
  });

  it('detecta marcas de plantilla que no corresponden a ningún hueco', () => {
    const bound = fillBlank.bind({
      template: 'Falta {{bnk_zz}} aquí',
      blanks: [{ id: 'bnk_a1', accepted: ['acuse'], typoTolerance: true }],
      mode: 'input',
      decoys: [],
    });
    if (!bound.ok) throw new Error('bind falló');
    expect(bound.value.issues().some((i) => i.code === 'broken-ref')).toBe(true);
  });

  it('indexa el texto RESUELTO, no la plantilla con marcas', () => {
    const bound = fillBlank.bind(fillBlank.defaultData);
    if (!bound.ok) throw new Error('bind falló');
    const texts = bound.value.searchText().join(' ');
    expect(texts).not.toContain('{{');
    expect(texts).toContain('acuse');
  });
});

describe('armar la frase: se compara la CADENA, no la permutación', () => {
  it('una frase con fichas repetidas se acepta si se lee igual', () => {
    // Comparar la permutación de identificadores marcaría como incorrecta una frase idéntica a la
    // solución. El alumno vería su respuesta igual a la correcta y el sistema diciéndole que está mal.
    const bound = wordBank.bind({
      prompt: 'Arma la frase',
      tokens: [
        { id: 'tok_a1', text: 'de' },
        { id: 'tok_a2', text: 'la' },
        { id: 'tok_a3', text: 'de' },
      ],
      decoys: [],
    });
    if (!bound.ok) throw new Error('bind falló');
    const graded = bound.value.grade({ order: ['tok_a3', 'tok_a2', 'tok_a1'] });
    if (!graded.ok) throw new Error('grade falló');
    expect(graded.value.correct).toBe(true);
  });
});

describe('emparejar: el descarte no debe resolver el ejercicio', () => {
  it('los errores cuentan aunque todas las parejas terminen bien', () => {
    const bound = matchPairs.bind(matchPairs.defaultData);
    if (!bound.ok) throw new Error('bind falló');
    const solution = bound.value.solution();
    if (!isJsonObject(solution)) throw new Error('solución inesperada');
    const graded = bound.value.grade({ matched: solution['matched'] ?? null, mistakes: 9 });
    if (!graded.ok) throw new Error('grade falló');
    expect(graded.value.correct).toBe(false);
  });

  it('el ejemplo trae opciones extra a la derecha para que el descarte no funcione', () => {
    const data = matchPairs.defaultData;
    if (!isJsonObject(data)) throw new Error('data inesperado');
    const extras = data['extraRights'];
    expect(Array.isArray(extras) && extras.length > 0).toBe(true);
  });
});

describe('cada dinámica sabe cuándo se puede comprobar', () => {
  it('canSubmit vive en el META, para que el shell no cargue el chunk de la UI', () => {
    for (const d of listDynamics()) {
      const bound = d.bind(d.defaultData);
      if (!bound.ok) throw new Error(`${d.type}: bind falló`);
      expect(bound.value.canSubmit(bound.value.solution()), `${d.type}: la solución debe ser comprobable`).toBe(true);
      // Ordenar arranca con todos los elementos colocados (en desorden), así que sí es comprobable.
      if (d.type !== 'order-sequence') {
        expect(
          bound.value.canSubmit(bound.value.emptyAnswer()),
          `${d.type}: la respuesta vacía no debe ser comprobable`,
        ).toBe(false);
      }
    }
  });
});
