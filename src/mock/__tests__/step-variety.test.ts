/**
 * El catálogo COMPLETO, ejercicio por ejercicio.
 *
 * Esta es la prueba que faltaba. El generador producía `multiple-choice` para los ~2,100 pasos y todo
 * estaba verde: compilaba, las pruebas pasaban, la app arrancaba. Seis de las siete dinámicas construidas
 * eran inalcanzables y nada lo decía. Un catálogo que no se recorre entero no está probado.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { materializeAll } from '../content';
import { prepareStep } from '@/content/engine/step';
import { initClock } from '@/lib/clock';
import '@/content/dynamics/index';
import type { Course } from '@/content/engine/schema';

let courses: readonly Course[];
let types: Map<string, number>;
let lessonsWith: Map<string, Set<string>>;
let total = 0;

beforeAll(() => {
  initClock({ storedAnchorMs: Date.parse('2026-03-02T10:00:00Z'), epochSeed: 'step-variety' });
  courses = materializeAll();
  types = new Map();
  lessonsWith = new Map();
  for (const course of courses) {
    for (const section of course.sections) {
      for (const unit of section.units) {
        for (const lesson of unit.lessons) {
          for (const step of lesson.steps) {
            types.set(step.type, (types.get(step.type) ?? 0) + 1);
            const seen = lessonsWith.get(step.type) ?? new Set<string>();
            seen.add(String(lesson.id));
            lessonsWith.set(step.type, seen);
            total += 1;
          }
        }
      }
    }
  }
});

const ALL_SEVEN = [
  'multiple-choice',
  'multiple-select',
  'true-false-swipe',
  'fill-blank',
  'word-bank',
  'match-pairs',
  'order-sequence',
] as const;

describe('variedad', () => {
  it('el catálogo tiene los ~2,100 ejercicios declarados', () => {
    expect(total).toBeGreaterThan(2000);
    expect(total).toBeLessThan(2200);
  });

  it('las SIETE dinámicas aparecen en el catálogo', () => {
    const missing = ALL_SEVEN.filter((t) => (types.get(t) ?? 0) === 0);
    expect(missing).toEqual([]);
  });

  it('ninguna dinámica domina el catálogo', () => {
    // El generador cae a opción múltiple cuando un hecho no puede producir el tipo pedido —una respuesta
    // de quince palabras no da un ejercicio de armar la frase—. La degradación es correcta; que se coma el
    // catálogo, no. Si esto falla es que el reparto dejó de funcionar y volvimos al punto de partida.
    expect((types.get('multiple-choice') ?? 0) / total).toBeLessThan(0.45);
  });

  it('cada dinámica aparece en al menos 30 lecciones DISTINTAS', () => {
    // La cobertura se mide en lecciones, no en porcentaje de pasos. `order-sequence` es 1.8% del catálogo
    // y está bien: solo aparece en las 37 lecciones de `test` y `checkpoint`, una vez en cada una, porque
    // hay UN procedimiento escrito por unidad. Subirlo repetiría el mismo ejercicio dentro de la unidad,
    // que es peor que ser escaso. Lo que sí importa es que ninguna dinámica quede en un rincón donde una
    // demo no la encuentre.
    const thin = ALL_SEVEN.filter((t) => (lessonsWith.get(t)?.size ?? 0) < 30);
    expect(thin).toEqual([]);
  });
});

describe('validez', () => {
  it('los ~2,100 ejercicios generados pasan `prepareStep` sin un solo defecto', () => {
    // Un `data` generado que no valida contra el schema de su dinámica se ve en la app como la tarjeta
    // "este ejercicio necesita una corrección" — en medio de una lección, delante del cliente.
    const broken: string[] = [];
    for (const course of courses) {
      for (const section of course.sections) {
        for (const unit of section.units) {
          for (const lesson of unit.lessons) {
            for (const step of lesson.steps) {
              const prepared = prepareStep(step, [
                { kind: 'lesson', id: lesson.id, index: 0, title: lesson.title },
              ]);
              if (!prepared.ok) {
                broken.push(`${String(lesson.id)}/${String(step.id)} (${step.type}): ${prepared.error.map((i) => i.message).join('; ')}`);
              }
            }
          }
        }
      }
    }
    expect(broken.slice(0, 8)).toEqual([]);
  });
});
