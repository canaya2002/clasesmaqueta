'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { EmptyState } from '@/components/ui/EmptyState';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { useFold } from '@/lib/hooks/useGameState';
import { bootClient } from '@/mock/boot-client';

/**
 * Práctica: la lección peor resuelta, primero.
 *
 * La cola de repetición espaciada con sus cuatro modos es de la Fase 7. Esto NO es un marcador de posición:
 * es la mitad que ya se puede sostener con los datos que existen —la precisión congelada en cada intento—
 * y hace algo real. Una ruta enlazada desde la navegación que llevara a "próximamente" es exactamente la
 * pantalla vacía que el proyecto prohíbe.
 */
interface Titles {
  readonly byLesson: ReadonlyMap<string, string>;
}

let cache: Titles | null = null;

function readTitles(): Titles {
  if (cache !== null) return cache;
  const byLesson = new Map<string, string>();
  for (const course of bootClient().world.courses) {
    for (const section of course.sections) {
      for (const unit of section.units) {
        for (const lesson of unit.lessons) byLesson.set(lesson.id, `${unit.title} · ${lesson.title}`);
      }
    }
  }
  cache = { byLesson };
  return cache;
}

const subscribe = (): (() => void) => () => undefined;
const server = (): Titles | null => null;

export function PracticeScreen() {
  const fold = useFold(DEFAULT_ECONOMY);
  const titles = useSyncExternalStore(subscribe, readTitles, server);

  if (fold === null || titles === null) return <div className="skeleton" style={{ height: 300 }} />;

  const weakest = [...fold.clearedLessons.entries()]
    .map(([id, r]) => ({ id, accuracy: r.bestAccuracyMilli, title: titles.byLesson.get(id) ?? id }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 6);

  if (weakest.length === 0) {
    return (
      <EmptyState
        mood="think"
        title="Todavía no hay nada que repasar"
        body="La práctica se arma con lo que ya contestaste. Termina una lección y aquí aparecerá lo que peor te salió."
        action={
          <Link href="/aprende">
            <Button3D size="lg" variant="primary">
              Ir a tu camino
            </Button3D>
          </Link>
        }
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {weakest.map((w, i) => (
        <div key={w.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            aria-hidden="true"
            className="u-counter"
            style={{ width: 44, fontWeight: 800, color: i === 0 ? 'var(--fg-danger)' : 'var(--fg-muted)' }}
          >
            {String(Math.round(w.accuracy / 10))}%
          </span>
          <span style={{ flex: 1, fontSize: 'var(--t-14)' }}>{w.title}</span>
          <Link href={`/leccion/${w.id}`}>
            <Button3D size="md" variant={i === 0 ? 'primary' : 'ghost'}>
              Repasar
            </Button3D>
          </Link>
        </div>
      ))}
    </div>
  );
}
