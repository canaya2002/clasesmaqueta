'use client';

/**
 * El ledger INICIAL del usuario de la demo, derivado de su propia historia de actividad.
 *
 * Sin esto, la primera pantalla que ve el comprador es un camino con la primera lección desbloqueada, cero
 * XP, cero racha y un heatmap en blanco — y todo el argumento de "1,247 personas usándolo desde hace
 * cuatro meses" se cae en la pantalla uno. El requisito de "ningún estado vacío feo" empieza aquí.
 *
 * La clave es que NO se inventa una historia paralela: se deriva del MISMO bitset de actividad que alimenta
 * la analítica del Studio. Si el modelo dice que esta persona estuvo activa 83 de los últimos 120 días, el
 * ledger tiene lecciones en esos 83 días y en ningún otro. Agregado y detalle no pueden discrepar porque
 * salen de la misma fuente — la misma decisión que ya gobierna el índice dual de la analítica.
 */

import { mix32, u01 } from '@/lib/rng';
import { HISTORY_DAYS, dayIndexToMs, dayKeyInZone, type OfficeZone } from '@/lib/clock';
import { brand } from '@/lib/brand';
import type { LedgerEvent } from '@/game/types';
import type { Course } from '@/content/engine/schema';
import { userHeatmap, type ActivityIndex } from './activity';

const NS_SEED = 0x5e11e001;

interface FlatLesson {
  readonly lessonId: string;
  readonly unitId: string;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly steps: number;
}

export function flattenLessons(courses: readonly Course[]): readonly FlatLesson[] {
  const out: FlatLesson[] = [];
  for (const course of courses) {
    for (const section of course.sections) {
      for (const unit of section.units) {
        for (const lesson of unit.lessons) {
          out.push({
            lessonId: lesson.id,
            unitId: unit.id,
            difficulty: lesson.difficulty,
            steps: lesson.steps.length,
          });
        }
      }
    }
  }
  return out;
}

export function unitSizesOf(courses: readonly Course[]): ReadonlyMap<string, number> {
  const sizes = new Map<string, number>();
  for (const course of courses) {
    for (const section of course.sections) {
      for (const unit of section.units) sizes.set(unit.id, unit.lessons.length);
    }
  }
  return sizes;
}

/**
 * Construye el ledger de un usuario a partir de sus días activos.
 *
 * El avance es EN ORDEN de catálogo: una persona no completa la lección 40 antes que la 12, y el camino
 * dibujaría un absurdo. Cuántas lecciones caen en cada día activo se sortea entre 1 y 3, determinista por
 * `(ordinal, día absoluto)`, para que dos sesiones de demo en días distintos cuenten la misma historia.
 */
export function seedLedgerFor(input: {
  readonly ordinal: number;
  readonly index: ActivityIndex;
  readonly courses: readonly Course[];
  readonly zone: OfficeZone;
}): readonly LedgerEvent[] {
  const heat = userHeatmap(input.index, input.ordinal);
  const lessons = flattenLessons(input.courses);
  const events: LedgerEvent[] = [];

  let cursor = 0;
  let seq = 0;

  for (let d = 0; d < HISTORY_DAYS; d += 1) {
    if ((heat[d] ?? 0) === 0) continue;

    const perDay = 1 + Math.floor(u01(mix32(NS_SEED, input.ordinal, d)) * 3);
    // Se reparte a lo largo de la jornada laboral: importa porque de las horas salen dos insignias
    // ("Madrugador", "Trasnochador") y porque el corte de día son las 04:00, no la medianoche.
    const dayMs = dayIndexToMs(brand<number, 'DayIndex'>(d));

    for (let k = 0; k < perDay; k += 1) {
      const lesson = lessons[cursor];
      if (lesson === undefined) break;
      cursor += 1;

      const r = (salt: number): number => u01(mix32(NS_SEED, input.ordinal * 131 + d, k * 17 + salt));
      const accuracy = 0.55 + r(1) * 0.45;
      // Una de cada once lecciones sale perfecta. Con el umbral en 0.985 salían CERO en 46 lecciones, y la
      // insignia "Impecable" quedaba inalcanzable en la demo: una recompensa que nadie puede ver es una
      // recompensa que no existe.
      const perfect = accuracy > 0.96;
      const atRealMs = dayMs + (8 + Math.floor(r(2) * 11)) * 3_600_000 + Math.floor(r(3) * 3_600_000);

      events.push({
        t: 'lesson-complete',
        seq,
        atRealMs,
        dayKey: brand<string, 'DayKey'>(dayKeyInZone(atRealMs, input.zone)),
        lessonId: brand<string, 'LessonId'>(lesson.lessonId),
        unitId: brand<string, 'UnitId'>(lesson.unitId),
        difficulty: lesson.difficulty,
        // Unidades de XP: peso medio 1.2 por paso, con el combo ya incorporado en la conducta.
        xpUnitsMilli: Math.round(lesson.steps * 1200 * (0.8 + r(4) * 0.9)),
        accuracyMilli: Math.round(accuracy * 1000),
        weightTotal: lesson.steps,
        perfect,
        firstClear: true,
        paceBonusEarned: r(5) < 0.22,
        maxCombo: 2 + Math.floor(r(6) * (lesson.steps - 1)),
        elapsedMs: Math.round((60 + r(7) * 180) * 1000),
        gemsGranted: perfect ? 5 : 0,
        countsForProgress: true,
      });
      seq += 1;
    }

    // Misiones diarias cumplidas en la mitad de los días activos. Sin esto el saldo de gemas es cero y la
    // tienda —una de las trece mecánicas— no se puede enseñar: se abre y no hay con qué comprar nada.
    if (u01(mix32(NS_SEED, input.ordinal + 7919, d)) < 0.5) {
      const atRealMs = dayMs + 20 * 3_600_000;
      events.push({
        t: 'quest-claimed',
        seq,
        atRealMs,
        dayKey: brand<string, 'DayKey'>(dayKeyInZone(atRealMs, input.zone)),
        questId: `qst_${String(d).padStart(3, '0')}`,
        // Importe CONGELADO: es una transacción cerrada. Ver la regla del saldo en game/types.ts.
        gemsGranted: 10,
      });
      seq += 1;
    }
  }

  return events;
}
