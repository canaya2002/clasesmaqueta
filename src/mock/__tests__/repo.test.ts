import { writeFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import '@/content/dynamics/index';
import { BOOT_BUDGET_MS, boot, bootReport, resetWorld } from '../db';
import { clearContentCache } from '../content';
import * as analytics from '../repo/analytics';
import * as courses from '../repo/courses';
import * as users from '../repo/users';
import { latencyFor, resetTransport, transportConfig } from '../repo/transport';

/**
 * El arranque en FRÍO que sufre el usuario, con el JIT sin calentar.
 *
 * La promesa del producto son los `BOOT_BUDGET_MS` (50), y en una máquina ociosa se cumple: 40 ms medidos.
 * Pero con `pnpm dev` en otra terminal sube a 57-82, así que afirmar 50 aquí convierte la prueba en una
 * moneda al aire. El techo se dobla para sobrevivir a una máquina cargada —solo salta ante un desastre— y
 * la promesa real se sostiene con la medición en caliente, que sí es estable, más el número en frío que se
 * anota en el informe de fase.
 */
const COLD_BOOT_CEILING_MS = BOOT_BUDGET_MS * 2;
/** En caliente, mejor de tres. Estrecho y estable: es el que caza una regresión algorítmica. */
const WARM_BOOT_BUDGET_MS = 15;

describe('arranque del mundo', () => {
  beforeEach(() => {
    resetWorld();
    clearContentCache();
    resetTransport();
  });

  it('construye el mundo entero dentro del presupuesto de arranque', () => {
    // DOS mediciones, porque son dos preguntas distintas y confundirlas costó una tarde.
    //
    // La primera es la PROMESA: el arranque que sufre el usuario es en frío, con el JIT sin calentar, y
    // ese es el que tiene que caber en el presupuesto. Es ruidoso —depende de la carga de la máquina— así
    // que su techo es generoso y solo salta ante un desastre.
    //
    // La segunda es el DETECTOR DE REGRESIONES: el mejor de tres en caliente. El ruido de un
    // microbenchmark solo SUMA —una interrupción del planificador no puede hacer que el código corra más
    // rápido—, así que el mínimo es el estimador menos sesgado del coste real, y un techo estrecho ahí
    // caza un cambio algorítmico sin falsos positivos. Con una sola medición mezclada, esta prueba fallaba
    // cuatro de cada seis veces solo por tener `pnpm dev` abierto en otra terminal.
    resetWorld();
    boot();
    const cold = bootReport()?.totalMs ?? 999;

    let best = Number.POSITIVE_INFINITY;
    let last: ReturnType<typeof bootReport> = null;
    for (let i = 0; i < 3; i += 1) {
      resetWorld();
      boot();
      last = bootReport();
      best = Math.min(best, last?.totalMs ?? Number.POSITIVE_INFINITY);
    }
    writeFileSync(
      '/tmp/senda-boot.json',
      JSON.stringify({ ...last, coldMs: cold, bestOfThreeWarmMs: best }, null, 2),
      'utf8',
    );

    resetWorld();
    const w = boot();
    expect(w.users.users).toHaveLength(1247);
    expect(w.courses).toHaveLength(3);

    // El techo del arranque en frío: generoso a propósito, mide una máquina bajo carga desconocida.
    expect(cold).toBeLessThan(COLD_BOOT_CEILING_MS);
    // El detector de regresiones: estrecho, en caliente, estable.
    expect(best).toBeLessThan(WARM_BOOT_BUDGET_MS);
  });

  it('el segundo arranque es instantáneo: el mundo se construye una vez', () => {
    boot();
    const t0 = performance.now();
    boot();
    expect(performance.now() - t0).toBeLessThan(1);
  });
});

describe('transporte', () => {
  beforeEach(() => {
    resetTransport();
    transportConfig.simulateErrors = false;
    transportConfig.speedMultiplier = 0;
  });

  it('la latencia es DETERMINISTA por firma, no aleatoria', () => {
    // Cuesta lo mismo que Math.random y compra reproducibilidad de vídeo y estados de carga testeables.
    transportConfig.speedMultiplier = 1;
    expect(latencyFor('users.list:garcia')).toBe(latencyFor('users.list:garcia'));
    expect(latencyFor('users.list:garcia')).not.toBe(latencyFor('users.list:lopez'));
    const values = ['a', 'b', 'c', 'd', 'e'].map((s) => latencyFor(s));
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(80);
      expect(v).toBeLessThanOrEqual(260);
    }
    transportConfig.speedMultiplier = 0;
  });

  it('las lecturas dirigidas por teclado NO pagan latencia', async () => {
    // La especificación exige 80–260 ms en los repos Y menos de 30 ms de búsqueda: no caben en la misma
    // función. Es una desviación declarada, y esta prueba es lo que la mantiene honesta.
    transportConfig.speedMultiplier = 1;
    const t0 = performance.now();
    await users.list({ query: 'garcia', cohortSlug: null, offset: 0, limit: 50 });
    expect(performance.now() - t0).toBeLessThan(30);
    transportConfig.speedMultiplier = 0;
  });

  it('con SIMULATE_ERRORS el fallo es ENSAYABLE, no una ruleta', async () => {
    transportConfig.simulateErrors = true;
    const outcomes: boolean[] = [];
    for (let i = 0; i < 8; i += 1) {
      const r = await analytics.kpis();
      outcomes.push(r.ok);
    }
    resetTransport();
    const repeat: boolean[] = [];
    for (let i = 0; i < 8; i += 1) {
      const r = await analytics.kpis();
      repeat.push(r.ok);
    }
    // La misma secuencia de llamadas produce la misma secuencia de resultados: se puede ensayar la demo.
    expect(repeat).toStrictEqual(outcomes);
    expect(outcomes).toContain(false);
    transportConfig.simulateErrors = false;
  });
});

describe('repositorios', () => {
  beforeEach(() => {
    resetTransport();
    transportConfig.speedMultiplier = 0;
    transportConfig.simulateErrors = false;
  });

  it('lista usuarios con búsqueda plegada por acentos', async () => {
    const r = await users.list({ query: 'garcia', cohortSlug: null, offset: 0, limit: 20 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.total).toBeGreaterThan(10);
    expect(r.value.rows.length).toBeLessThanOrEqual(20);
    expect(r.value.rows[0]?.name.length).toBeGreaterThan(0);
  });

  it('filtra por cohorte y los conteos cuadran con la faceta', async () => {
    const facets = await users.cohortFacets();
    expect(facets.ok).toBe(true);
    if (!facets.ok) return;
    const recepcion = facets.value.find((f) => f.slug === 'recepcion-mx');
    expect(recepcion?.count).toBe(300);

    const page = await users.list({ query: '', cohortSlug: 'recepcion-mx', offset: 0, limit: 5 });
    expect(page.ok).toBe(true);
    if (!page.ok) return;
    expect(page.value.total).toBe(300);
  });

  it('un usuario inexistente devuelve un error tipado, no una excepción', async () => {
    // `usr_00000000` es el id REAL del ordinal 0: el padStart en base32 lo produce. Un id inexistente
    // de verdad tiene que estar fuera del rango de la plantilla.
    const r = await users.byId('usr_zzzzzzzz');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('not-found');
    expect(r.error.messageKey).toBe('repo.error.userNotFound');
  });

  it('los KPI salen del mismo bitset que el heatmap del alumno', async () => {
    const r = await analytics.kpis();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.dau).toBeLessThan(r.value.wau);
    expect(r.value.wau).toBeLessThan(r.value.mau);
    expect(r.value.enrolled).toBe(1247);
    expect(r.value.withStreak30).toBeGreaterThan(0);
  });

  it('el índice del camino se lee por curso y no materializa los pasos', async () => {
    const r = await courses.pathIndex('cobranza-con-dignidad');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(58);
  });

  it('una lección se puede pedir por id', async () => {
    const list = await courses.pathIndex('primer-contacto');
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    const first = list.value[0];
    expect(first).toBeDefined();
    const lesson = await courses.lessonById(`lsn_${(0).toString(32).padStart(8, '0')}`);
    expect(lesson.ok).toBe(true);
    if (!lesson.ok) return;
    expect(lesson.value.steps.length).toBe(11);
  });
});
