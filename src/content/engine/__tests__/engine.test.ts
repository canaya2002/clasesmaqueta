import { describe, expect, it } from 'vitest';
import '../../dynamics/index';
import { multipleChoice } from '../../dynamics/multiple-choice/meta';
import { multipleChoiceData } from '../../dynamics/multiple-choice/schema';
import { DEFAULT_ECONOMY, comboMultiplier, levelAt, levelThresholds, xpToNextLevel } from '../economy';
import { analyzePrereqs } from '../graph';
import { renderIssue } from '../issues';
import { formatContentPath, type ContentPath } from '../path';
import { policyFor } from '../policy';
import { asId, score, text, type StepId } from '../primitives';
import { findDynamic, listDynamics } from '../registry';
import { gradeLesson } from '../grade';
import {
  initMachine,
  machineReducer,
  progress,
  sessionReducer,
  initSession,
  type Attempt,
  type SessionState,
} from '../session';
import { rawStepSchema, type Lesson, type RawStep } from '../schema';
import { hash64, mix32, shuffle, splitmix32 } from '@/lib/rng';
import { foldForSearch, normalizeAnswer, normalizeEs, withinOneEdit } from '@/lib/text';

/* ============================================================ normalización es-MX */

describe('normalización es-MX', () => {
  it('despoja acentos pero JAMÁS la ñ', () => {
    expect(normalizeEs('José Muñoz')).toBe('jose muñoz');
    expect(normalizeEs('AÑO')).toBe('año');
    expect(normalizeEs('Año')).not.toBe('ano');
  });

  it('quita la diéresis, porque en español no distingue palabras', () => {
    expect(normalizeEs('Pingüino')).toBe('pinguino');
  });

  it('el plegado de BÚSQUEDA sí convierte la ñ en n', () => {
    // Técnicamente incorrecto, pragmáticamente correcto: nadie teclea la tilde al buscar a un compañero.
    expect(foldForSearch('Muñoz')).toBe('munoz');
    expect(foldForSearch('MUÑOZ')).toBe('munoz');
  });

  it('colapsa espacios y recorta', () => {
    expect(normalizeEs('  dos   palabras  ')).toBe('dos palabras');
  });

  it('normaliza números escritos, ordinales y separadores de miles', () => {
    expect(normalizeAnswer('Cinco')).toBe('5');
    expect(normalizeAnswer('5°')).toBe('5');
    expect(normalizeAnswer('1,200')).toBe('1200');
    expect(normalizeAnswer('¿Recepción?')).toBe('recepcion');
  });

  it('conserva la puntuación interior: "art. 5" no es "art 5"', () => {
    expect(normalizeAnswer('art. 5.')).toBe('art. 5');
  });

  it('tolera un typo solo en palabras largas', () => {
    expect(withinOneEdit('expediente', 'expedente')).toBe(true);
    expect(withinOneEdit('recepcion', 'recepcino')).toBe(true);
    expect(withinOneEdit('expediente', 'expedintes')).toBe(false);
    // En palabras cortas "voz" y "vos" son palabras distintas: la longitud mínima la aplica el llamante.
    expect(withinOneEdit('voz', 'vos')).toBe(true);
  });
});

/* =================================================================== el registro */

describe('registro de dinámicas y erasure', () => {
  it('la dinámica de referencia está registrada', () => {
    expect(listDynamics().map((d) => d.type)).toContain('multiple-choice');
    expect(findDynamic('multiple-choice')).not.toBeNull();
    expect(findDynamic('no-existe')).toBeNull();
  });

  it('bind parsea una vez y devuelve clausuras sin TData en la firma', () => {
    const bound = multipleChoice.bind(multipleChoice.defaultData);
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    expect(bound.value.type).toBe('multiple-choice');
    expect(bound.value.searchText().length).toBeGreaterThan(0);
    expect(bound.value.estimateSeconds()).toBeGreaterThan(0);
  });

  it('un data corrupto devuelve problemas, NUNCA lanza', () => {
    const bad = multipleChoice.bind({ prompt: '', options: [] });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    // La lista de problemas nunca puede estar vacía: `err([])` pintaría "hay errores" sin ninguno.
    expect(bad.error.length).toBeGreaterThan(0);
  });

  it('la solución del plugin califica 1.0 contra su propia calificación', () => {
    // Es la aserción que hace verdadera la promesa del arnés: un paso que pasa Zod y es irresoluble
    // llegaría al player y le quitaría corazones a 300 personas.
    const bound = multipleChoice.bind(multipleChoice.defaultData);
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    const graded = bound.value.grade(bound.value.solution());
    expect(graded.ok).toBe(true);
    if (!graded.ok) return;
    expect(graded.value.correct).toBe(true);
    expect(graded.value.score).toBe(1);
  });

  it('la respuesta vacía no lanza y califica 0', () => {
    const bound = multipleChoice.bind(multipleChoice.defaultData);
    if (!bound.ok) throw new Error('bind falló');
    const graded = bound.value.grade(bound.value.emptyAnswer());
    expect(graded.ok).toBe(true);
    if (!graded.ok) return;
    expect(graded.value.correct).toBe(false);
  });

  it('el EDITOR vive fuera de bind: un borrador a medias reporta sin bloquear', () => {
    // Un paso a medio escribir es inválido por construcción. Si el editor dependiera de bind, el parse
    // fallaría en cada pulsación y no habría superficie de la que colgarlo.
    const draft = { prompt: 'C', options: [], correctOptionId: null, shuffle: true, figure: null };
    const issues = multipleChoice.validateDraft(draft);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.code === 'unsolvable-step')).toBe(true);
    // Y sobre todo: no lanza.
    expect(() => multipleChoice.validateDraft({ basura: true })).not.toThrow();
  });

  it('validate detecta la opción correcta inexistente con el mensaje de la especificación', () => {
    const data = multipleChoiceData.parse({
      prompt: 'Enunciado',
      options: [
        { id: 'opt_aa01', text: 'Una' },
        { id: 'opt_aa02', text: 'Otra' },
      ],
      correctOptionId: 'opt_zz99',
      shuffle: false,
      figure: null,
    });
    const bound = multipleChoice.bind(data);
    if (!bound.ok) throw new Error('bind falló');
    const issues = bound.value.issues();
    expect(issues[0]?.message).toContain('falta la opción correcta');
  });

  it('facets deja agregar sin reimportar el answerSchema de la dinámica', () => {
    const bound = multipleChoice.bind(multipleChoice.defaultData);
    if (!bound.ok) throw new Error('bind falló');
    const f = bound.value.facets(bound.value.solution());
    expect(f['answered']).toBe(true);
    expect(f['optionCount']).toBe(2);
  });
});

/* ============================================================= rutas de dominio */

describe('rutas de dominio', () => {
  const path: ContentPath = [
    { kind: 'course', id: 'crs_00000001', index: 0, title: text('Primer Contacto') },
    { kind: 'section', id: 'sec_00000001', index: 0, title: text('Recepción') },
    { kind: 'unit', id: 'unt_00000001', index: 2, title: text('Llamada entrante') },
    { kind: 'lesson', id: 'lsn_00000001', index: 11, title: text('Guion de 5 preguntas') },
    { kind: 'step', id: 'stp_00000001', index: 3, title: text('') },
  ];

  it('produce LITERALMENTE el string que pide la especificación', () => {
    expect(formatContentPath(path, 'issue')).toBe('Unidad 3 › Lección 12 › Paso 4');
  });

  it('el estilo completo incluye los títulos reales, no solo los números', () => {
    expect(formatContentPath(path, 'full')).toContain('Unidad 3 “Llamada entrante”');
  });

  it('el estilo href hace clicable el error: clic y estás en el campo', () => {
    expect(formatContentPath(path, 'href')).toBe('/studio/lessons/lsn_00000001/edit?step=stp_00000001');
  });

  it('renderIssue compone el mensaje final', () => {
    expect(
      renderIssue({
        code: 'unsolvable-step',
        severity: 'error',
        message: 'falta la opción correcta',
        path,
        fixHint: null,
      }),
    ).toBe('Unidad 3 › Lección 12 › Paso 4: falta la opción correcta');
  });
});

/* ================================================================== el grafo */

describe('grafo de prerequisitos', () => {
  it('ordena topológicamente un DAG', () => {
    const g = new Map<string, readonly string[]>([
      ['a', []],
      ['b', ['a']],
      ['c', ['a', 'b']],
    ]);
    const r = analyzePrereqs(g);
    expect(r.cycles).toHaveLength(0);
    expect(r.order.indexOf('a')).toBeLessThan(r.order.indexOf('c'));
  });

  it('reporta el ciclo como una RUTA concreta, no como un booleano', () => {
    const g = new Map<string, readonly string[]>([
      ['a', ['c']],
      ['b', ['a']],
      ['c', ['b']],
    ]);
    const r = analyzePrereqs(g);
    expect(r.cycles).toHaveLength(1);
    expect(r.cycles[0]?.length).toBe(3);
  });

  it('detecta un prerequisito que no existe en el curso', () => {
    const g = new Map<string, readonly string[]>([['a', ['fantasma']]]);
    expect(analyzePrereqs(g).unreachable).toContain('a');
  });
});

/* ================================================================= economía */

describe('curva de niveles', () => {
  const econ = DEFAULT_ECONOMY;

  it('no pide 414,000 XP para el nivel 30', () => {
    // La exponencial x1.3 que copia todo el mundo dejaría al usuario semilla clavado en el nivel 9 y el
    // medidor de XP no se movería nunca durante la demo.
    const thresholds = levelThresholds(econ);
    const total = thresholds[thresholds.length - 1] ?? 0;
    expect(total).toBeGreaterThan(5_000);
    expect(total).toBeLessThan(20_000);
  });

  it('tiene techo: a partir de cierto nivel el costo es constante', () => {
    expect(xpToNextLevel(econ, 25)).toBe(econ.levelCap);
    expect(xpToNextLevel(econ, 29)).toBe(econ.levelCap);
  });

  it('levelAt es monótono y empieza en 1', () => {
    const t = levelThresholds(econ);
    expect(levelAt(t, 0)).toBe(1);
    expect(levelAt(t, 59)).toBe(1);
    expect(levelAt(t, 60)).toBe(2);
    let prev = 0;
    for (let xp = 0; xp < 9000; xp += 137) {
      const lvl = levelAt(t, xp);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });

  it('el combo escala por escalones y no continuamente', () => {
    expect(comboMultiplier(econ, 0)).toBe(1);
    expect(comboMultiplier(econ, 2)).toBe(1);
    expect(comboMultiplier(econ, 3)).toBe(1.25);
    expect(comboMultiplier(econ, 12)).toBe(2);
  });
});

/* =========================================================== máquina de sesión */

const STEPS: readonly StepId[] = ['stp_00000001', 'stp_00000002', 'stp_00000003'].map((s) =>
  asId<'StepId'>(s),
);

/** Un paso real en vez de un doble cast: si el schema cambia, esta prueba lo nota. */
function stubStep(): RawStep {
  return rawStepSchema.parse({
    id: 'stp_00000001',
    type: 'multiple-choice',
    data: multipleChoice.defaultData,
    hint: null,
    explanation: null,
    xpWeight: 1,
    assessmentWeight: 1,
    skills: ['skl_00000001'],
    tags: [],
  });
}

function lesson(kind: Lesson['kind']): Lesson {
  return {
    id: asId<'LessonId'>('lsn_00000001'),
    title: text('Lección'),
    kind,
    difficulty: 2,
    heartsEnabled: true,
    steps: [stubStep()],
  };
}

function start(kind: Lesson['kind'] = 'practice'): SessionState {
  return initSession({
    policy: policyFor(lesson(kind), DEFAULT_ECONOMY),
    stepIds: STEPS,
    hearts: 5,
    seed: 12345,
    atMs: 0,
  });
}

describe('máquina de sesión', () => {
  it('el progreso es MONÓTONO: re-encolar extiende, nunca retrocede', () => {
    // Con la barra dibujada como hechos/total, re-encolar hace crecer el denominador y la barra retrocede
    // en el MISMO frame en que dispara el rebote de avance. La peor combinación posible de señales.
    let s = start('practice');
    const before = progress(s);
    const [checking] = sessionReducer(s, { type: 'CHECK', atMs: 10 });
    const [graded] = sessionReducer(checking, {
      type: 'GRADED',
      epoch: checking.epoch,
      instanceId: 'stp_00000001#0',
      correct: false,
      score: score(0),
      weight: 2,
      atMs: 20,
    });
    s = graded;
    expect(s.plannedSlots).toBe(4);
    expect(s.progressIntent).toBe('extend');
    expect(progress(s)).toBeGreaterThanOrEqual(before);
  });

  it('en un EXAMEN no re-encola ni revela: sería exposición de reactivo', () => {
    const s = start('test');
    expect(s.policy.requeueOnWrong).toBe(false);
    expect(s.policy.revealOnWrong).toBe(false);
    const [checking] = sessionReducer(s, { type: 'CHECK', atMs: 10 });
    const [graded] = sessionReducer(checking, {
      type: 'GRADED',
      epoch: s.epoch,
      instanceId: 'stp_00000001#0',
      correct: false,
      score: score(0),
      weight: 2,
      atMs: 20,
    });
    expect(graded.plannedSlots).toBe(3);
    expect(graded.phase).toBe('wrong');
  });

  it('una calificación que aterriza TARDE se descarta en vez de aplicarse al paso equivocado', () => {
    const s = start();
    const [checking] = sessionReducer(s, { type: 'CHECK', atMs: 10 });
    const [stale] = sessionReducer(checking, {
      type: 'GRADED',
      epoch: s.epoch,
      instanceId: 'stp_00000099#0',
      correct: true,
      score: score(1),
      weight: 1,
      atMs: 20,
    });
    expect(stale.attempts).toHaveLength(0);
    expect(stale.phase).toBe('checking');
  });

  it('los comandos se deduplican por CLAVE ESTABLE: StrictMode no gasta dos corazones', () => {
    // Con un contador y un ref, StrictMode monta, limpia y vuelve a montar; el segundo montaje descarta el
    // comando por `seq` ya visto y la sesión se queda clavada. Con clave estable, aplicar dos veces el
    // mismo evento no encola dos veces el mismo efecto.
    let m = initMachine({
      policy: policyFor(lesson('practice'), DEFAULT_ECONOMY),
      stepIds: STEPS,
      hearts: 5,
      seed: 1,
      atMs: 0,
    });
    m = machineReducer(m, { type: 'CHECK', atMs: 10 });
    const gradedEvent = {
      type: 'GRADED' as const,
      epoch: 1,
      instanceId: 'stp_00000001#0',
      correct: false,
      score: score(0),
      weight: 1 as const,
      atMs: 20,
    };
    m = machineReducer(m, gradedEvent);
    const heartCmds = m.queue.filter((c) => c.t === 'SpendHeart');
    expect(heartCmds).toHaveLength(1);

    // El ejecutor confirma y el evento se repite (segundo montaje de StrictMode).
    m = machineReducer(m, { type: 'CMDS_APPLIED', keys: m.queue.map((c) => c.key) });
    m = machineReducer(m, gradedEvent);
    expect(m.queue.filter((c) => c.t === 'SpendHeart')).toHaveLength(0);
  });

  it('el reducer es PURO: no toca reloj, rng externo ni puerto', () => {
    // Dos ejecuciones del mismo evento sobre el mismo estado producen exactamente lo mismo. Si el rng
    // viviera en una clausura, React lo invocaría dos veces en desarrollo y la semilla avanzaría el doble.
    const s = start();
    const a = sessionReducer(s, { type: 'CHECK', atMs: 10 });
    const b = sessionReducer(s, { type: 'CHECK', atMs: 10 });
    expect(a[0]).toStrictEqual(b[0]);
    expect(a[1]).toStrictEqual(b[1]);
  });

  it('quedarse sin corazones abre el modal y anuncia en assertive', () => {
    let s = start();
    for (let i = 0; i < 5; i += 1) {
      const [checking] = sessionReducer(s, { type: 'CHECK', atMs: i * 100 });
      const slot = checking.slots[checking.cursor];
      const [graded] = sessionReducer(checking, {
        type: 'GRADED',
        epoch: checking.epoch,
        instanceId: slot?.instanceId ?? '',
        correct: false,
        score: score(0),
        weight: 1,
        atMs: i * 100 + 10,
      });
      s = sessionReducer(graded, { type: 'CONTINUE', atMs: i * 100 + 20 })[0];
      if (s.hearts === 0) break;
    }
    expect(s.hearts).toBe(0);
  });
});

/* ============================================================== calificación */

function attempt(over: Partial<Attempt>): Attempt {
  return {
    stepId: asId<'StepId'>('stp_00000001'),
    instanceId: 'stp_00000001#0',
    attemptIndex: 0,
    outcome: 'correct',
    score: score(1),
    weightAtTime: 1,
    usedHint: false,
    elapsedMs: 5_000,
    comboRunAfter: 1,
    ...over,
  };
}

describe('calificación de lección', () => {
  const base = {
    econ: DEFAULT_ECONOMY,
    policy: policyFor(lesson('practice'), DEFAULT_ECONOMY),
    difficulty: 2 as const,
    xpWeightByStep: new Map<string, 1 | 2 | 3>([['stp_00000001', 2]]),
    firstClear: false,
    estimatedSeconds: 60,
  };

  it('la precisión se calcula sobre PRIMEROS intentos', () => {
    const r = gradeLesson(
      [
        attempt({ outcome: 'revealed', score: score(0), comboRunAfter: 0 }),
        attempt({ attemptIndex: 1, instanceId: 'stp_00000001#1' }),
      ],
      base,
    );
    // Un solo primer intento, fallado: 0%. Contar el reintento daría 50% y es lo que hace que la precisión
    // de todas las apps ronde el 95% y no diga nada.
    expect(r.accuracy).toBe(0);
    expect(r.firstTryCount).toBe(1);
  });

  it('el peso viene CONGELADO en el intento, no del contenido vigente', () => {
    const r1 = gradeLesson([attempt({ weightAtTime: 1 })], base);
    const r2 = gradeLesson([attempt({ weightAtTime: 3 })], base);
    // La precisión es 100% en ambos: el peso solo cambia el denominador, y ambos son consistentes.
    expect(r1.accuracy).toBe(1);
    expect(r2.accuracy).toBe(1);
    // Y el XP NO cambia con el peso psicométrico: ese depende del peso de economía del contenido.
    expect(r1.xp).toBe(r2.xp);
  });

  it('un paso re-encolado otorga la fracción declarada, no el XP completo', () => {
    const full = gradeLesson([attempt({})], base);
    const replay = gradeLesson([attempt({ attemptIndex: 1, instanceId: 'stp_00000001#1' })], base);
    expect(replay.xpBreakdown.steps).toBeLessThan(full.xpBreakdown.steps);
  });

  it('la lección perfecta paga bono; una con un fallo, no', () => {
    const perfect = gradeLesson([attempt({}), attempt({ stepId: asId<'StepId'>('stp_00000002') })], base);
    expect(perfect.perfect).toBe(true);
    expect(perfect.xpBreakdown.perfect).toBe(DEFAULT_ECONOMY.bonusPerfectXp);

    const flawed = gradeLesson([attempt({}), attempt({ outcome: 'wrong', score: score(0) })], base);
    expect(flawed.perfect).toBe(false);
    expect(flawed.xpBreakdown.perfect).toBe(0);
  });
});

/* ================================================================== el RNG */

describe('aleatoriedad determinista', () => {
  it('mix32 es estable y bien distribuido', () => {
    expect(mix32(1, 2, 3)).toBe(mix32(1, 2, 3));
    expect(mix32(1, 2, 3)).not.toBe(mix32(1, 2, 4));
  });

  it('hash64 produce 16 hex: con 32 bits la colisión al hacer rollback sería del 0.67%', () => {
    expect(hash64('abc')).toHaveLength(16);
    expect(hash64('abc')).toBe(hash64('abc'));
    expect(hash64('abc')).not.toBe(hash64('abd'));
  });

  it('splitmix32 avanza como VALOR, no como estado oculto', () => {
    const [v1, s1] = splitmix32(42);
    const [v2] = splitmix32(42);
    expect(v1).toBe(v2);
    const [v3] = splitmix32(s1);
    expect(v3).not.toBe(v1);
  });

  it('el barajado es reproducible y no pierde elementos', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const [a] = shuffle(items, 7);
    const [b] = shuffle(items, 7);
    expect(a).toStrictEqual(b);
    expect([...a].sort((x, y) => x - y)).toStrictEqual(items);
  });
});
