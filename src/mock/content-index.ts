'use client';

/**
 * Índice inverso lección → unidad, construido una vez.
 *
 * El repositorio devuelve una lección suelta —es lo correcto: el reproductor no necesita el árbol— pero el
 * evento del ledger sí necesita saber a qué unidad pertenece, porque de ahí sale cuándo una unidad queda
 * completa y con ella el desbloqueo del camino. Recorrer las 190 lecciones en cada final de lección para
 * averiguarlo sería trabajo repetido en el peor momento: justo cuando corre el confeti.
 */

import { bootClient } from './boot-client';
import { brand } from '@/lib/brand';
import type { LessonId, UnitId } from '@/content/engine/primitives';

let index: ReadonlyMap<string, string> | null = null;

function build(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const course of bootClient().world.courses) {
    for (const section of course.sections) {
      for (const unit of section.units) {
        for (const lesson of unit.lessons) out.set(lesson.id, unit.id);
      }
    }
  }
  return out;
}

export function unitOf(lessonId: LessonId): UnitId | null {
  index ??= build();
  const found = index.get(lessonId);
  return found === undefined ? null : brand<string, 'UnitId'>(found);
}

export function resetContentIndexForTests(): void {
  index = null;
}
