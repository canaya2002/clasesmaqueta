import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import '@/content/dynamics/index';
import { contentHash } from '@/content/engine/canonicalize';
import { diffTree, summarizeDiff, type DiffNode } from '@/content/engine/diff';
import { renderIssue } from '@/content/engine/issues';
import { listDynamics } from '@/content/engine/registry';
import { walkSteps } from '@/content/engine/schema';
import { exportCourse, importCourse } from '@/content/engine/serialize';
import { validateCourse } from '@/content/engine/validate';
import { COURSES, LESSONS, TOTAL_LESSONS } from '@/content/seed/catalog';
import { UNITS } from '@/content/seed/corpus';
import { SKILL_IDS } from '@/content/seed/skills';
import { clearContentCache, materializeAll, materializeCourse } from '../content';

const courses = materializeAll();

/** `Array.isArray` no estrecha bien un `readonly Json[]`, así que el guard se escribe explícito. */
function promptOf(data: unknown): string | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)['prompt'];
  return typeof value === 'string' ? value : null;
}
const knownSkills = new Set<string>(SKILL_IDS);
const dynamicVersions = new Map(listDynamics().map((d) => [d.type, d.version]));

describe('el catálogo semilla', () => {
  it('tiene 3 cursos, 26 unidades y 190 lecciones', () => {
    expect(COURSES).toHaveLength(3);
    expect(UNITS).toHaveLength(26);
    expect(TOTAL_LESSONS).toBe(190);
    expect(LESSONS).toHaveLength(190);
  });

  it('produce alrededor de 2,100 ejercicios', () => {
    let steps = 0;
    for (const c of courses) for (const _ of walkSteps(c)) steps += 1;
    expect(steps).toBeGreaterThan(2_000);
    expect(steps).toBeLessThan(2_200);
  });

  it('los enunciados NO se repiten palabra por palabra', () => {
    // 182 hechos x 4 plantillas = 728 enunciados distintos. El número se declara, no se promete.
    const prompts = new Set<string>();
    let total = 0;
    for (const c of courses) {
      for (const loc of walkSteps(c)) {
        const p = promptOf(loc.step.data);
        if (p !== null) {
          prompts.add(p);
          total += 1;
        }
      }
    }
    expect(prompts.size).toBeGreaterThan(600);
    // Cada enunciado aparece unas 3 veces a lo largo del catálogo completo, en lecciones distintas.
    expect(total / prompts.size).toBeLessThan(4);
  });

  it('los 20 hechos jurídicos van etiquetados como contenido de ejemplo', () => {
    let legalSteps = 0;
    for (const c of courses) {
      for (const loc of walkSteps(c)) {
        if (loc.step.tags.includes('contenido-de-ejemplo')) legalSteps += 1;
      }
    }
    // El comprador son abogados migratorios: lo estrictamente jurídico va acotado y marcado.
    expect(legalSteps).toBeGreaterThan(0);
    expect(legalSteps / 2_090).toBeLessThan(0.2);
  });

  it('TODO el contenido semilla pasa el validador, incluida la prueba de resolubilidad', () => {
    // Es la pasada que ejecuta la solución de cada plugin contra su propia calificación. Un paso que pasa
    // Zod y es irresoluble llegaría al player y le quitaría corazones a 300 personas.
    const lines: string[] = [];
    for (const course of courses) {
      const report = validateCourse(course, { knownMedia: new Set(), knownSkills, dynamicVersions });
      for (const i of report.issues.filter((x) => x.severity === 'error')) lines.push(renderIssue(i));
      expect(report.errorCount, `${course.title}: ${lines.slice(0, 3).join(' | ')}`).toBe(0);
    }
  });

  it('los objetivos de unidad son contratos verificables, no descripciones', () => {
    // "En esta unidad aprenderás sobre el teléfono" no es auditable ni medible.
    for (const u of UNITS) {
      expect(/\d/.test(u.objective), `sin criterio medible: ${u.title}`).toBe(true);
    }
  });

  it('cada paso declara habilidades del catálogo cerrado', () => {
    for (const c of courses) {
      for (const loc of walkSteps(c)) {
        expect(loc.step.skills.length).toBeGreaterThan(0);
        for (const s of loc.step.skills) expect(knownSkills.has(s)).toBe(true);
      }
    }
  });
});

describe('determinismo del contenido', () => {
  it('dos materializaciones producen el MISMO ContentHash', () => {
    // Criterio de aceptación de la fase: dos arranques en dos máquinas producen el mismo hash.
    const a = courses.map((c) => contentHash(JSON.parse(JSON.stringify(c)) as never));
    clearContentCache();
    const b = materializeAll().map((c) => contentHash(JSON.parse(JSON.stringify(c)) as never));
    expect(a).toStrictEqual(b);
    writeFileSync('/tmp/senda-hashes.json', JSON.stringify({ hashes: a }, null, 2), 'utf8');
  });

  it('el contenido se materializa dentro del presupuesto', () => {
    // Mejor de tres, por la misma razón que el arranque: la suite levanta 26 entornos jsdom en paralelo y
    // una medición suelta salta a 138 ms por carga de la máquina, no por el código. El mínimo es el
    // estimador menos sesgado, porque el ruido de un microbenchmark solo puede sumar.
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 3; i += 1) {
      clearContentCache();
      const t0 = performance.now();
      materializeAll();
      best = Math.min(best, performance.now() - t0);
    }
    expect(best).toBeLessThan(120);
  });
});

describe('exportar, borrar, reimportar', () => {
  it('produce un checksum idéntico: el criterio se DEMUESTRA, no se afirma', () => {
    const course = materializeCourse('cobranza-con-dignidad');
    const pkg = exportCourse(course, { at: 1_700_000_000_000, dynamicVersions });
    const result = importCourse(pkg, { mode: 'replace', at: 1_700_000_000_001, localDynamicVersions: dynamicVersions });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.report.hashAfter).toBe(result.value.report.hashBefore);
    expect(result.value.report.counts.lessons).toBe(58);
  });

  it('rechaza un paquete creado con un motor más nuevo, con un mensaje legible', () => {
    const course = materializeCourse('primer-contacto');
    const pkg = { ...exportCourse(course, { at: 0, dynamicVersions }), engineVersion: 99 };
    const result = importCourse(pkg, { mode: 'replace', at: 0, localDynamicVersions: dynamicVersions });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.issues[0]?.message).toContain('versión más nueva');
  });

  it('un paquete corrupto devuelve problemas con ruta de dominio, no una excepción', () => {
    const result = importCourse({ format: 'senda.course', course: { id: 'malo' } }, {
      mode: 'replace',
      at: 0,
      localDynamicVersions: dynamicVersions,
    });
    expect(result.ok).toBe(false);
  });
});

describe('diff estructural', () => {
  const node = (id: string, title: string, children: readonly DiffNode[] = []): DiffNode => ({
    id,
    kind: 'lesson',
    title,
    payload: { title },
    children,
  });

  it('insertar al inicio reporta UN movimiento, no diecinueve', () => {
    // Es el defecto que el LIS existe para evitar, y "añadir paso" está en el guion de demo: la
    // probabilidad de que ocurra delante del comprador es 1.
    const kids = Array.from({ length: 20 }, (_, i) => node(`s${String(i)}`, `Paso ${String(i)}`));
    const before: DiffNode = { id: 'l', kind: 'lesson', title: 'L', payload: {}, children: kids };
    const after: DiffNode = {
      id: 'l',
      kind: 'lesson',
      title: 'L',
      payload: {},
      children: [node('nuevo', 'Paso nuevo'), ...kids],
    };
    const summary = summarizeDiff(diffTree(before, after));
    expect(summary.added).toBe(1);
    expect(summary.moved).toBe(0);
  });

  it('mover un elemento reporta exactamente un movimiento', () => {
    const kids = Array.from({ length: 6 }, (_, i) => node(`s${String(i)}`, `Paso ${String(i)}`));
    const reordered = [kids[5], ...kids.slice(0, 5)].filter((n): n is DiffNode => n !== undefined);
    const before: DiffNode = { id: 'l', kind: 'lesson', title: 'L', payload: {}, children: kids };
    const after: DiffNode = { id: 'l', kind: 'lesson', title: 'L', payload: {}, children: reordered };
    expect(summarizeDiff(diffTree(before, after)).moved).toBe(1);
  });

  it('dos árboles idénticos no producen ninguna operación', () => {
    const t: DiffNode = { id: 'l', kind: 'lesson', title: 'L', payload: { a: 1 }, children: [node('s1', 'A')] };
    expect(summarizeDiff(diffTree(t, t)).identical).toBe(true);
  });

  it('un cambio de título no arrastra a los hijos', () => {
    const kids = [node('s1', 'A'), node('s2', 'B')];
    const before: DiffNode = { id: 'l', kind: 'lesson', title: 'Antes', payload: { title: 'Antes' }, children: kids };
    const after: DiffNode = { id: 'l', kind: 'lesson', title: 'Después', payload: { title: 'Después' }, children: kids };
    const summary = summarizeDiff(diffTree(before, after));
    expect(summary.changed).toBe(1);
    expect(summary.added + summary.removed + summary.moved).toBe(0);
  });
});
