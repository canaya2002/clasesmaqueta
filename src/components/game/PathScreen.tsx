'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Button3D } from '@/components/ui/Button3D';
import { EmptyState } from '@/components/ui/EmptyState';
import { PathSection, type PathUnit } from './PathSection';
import { pathStates, type PathUnitInput } from '@/game/path';
import { useFold } from '@/lib/hooks/useGameState';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { bootClient } from '@/mock/boot-client';
import type { Course } from '@/content/engine/schema';

interface Loaded {
  readonly sections: readonly { readonly title: string; readonly units: readonly PathUnit[] }[];
  readonly units: readonly PathUnitInput[];
  readonly titleById: ReadonlyMap<string, string>;
}

function shape(courses: readonly Course[]): Loaded {
  const sections: { title: string; units: PathUnit[] }[] = [];
  const units: PathUnitInput[] = [];
  const titleById = new Map<string, string>();

  for (const course of courses) {
    for (const section of course.sections) {
      const su: PathUnit[] = [];
      for (const unit of section.units) {
        units.push({
          unitId: unit.id,
          lessonIds: unit.lessons.map((l) => l.id),
          prerequisites: [...unit.prerequisites],
        });
        su.push({
          id: unit.id,
          title: unit.title,
          icon: unit.icon,
          lessons: unit.lessons.map((l) => {
            titleById.set(l.id, l.title);
            return { id: l.id, title: l.title, kind: l.kind };
          }),
        });
      }
      sections.push({ title: section.title, units: su });
    }
  }
  return { sections, units, titleById };
}

/**
 * El catálogo se transforma UNA vez, en el ámbito del módulo.
 *
 * No en un efecto con `setState`: `bootClient()` es idempotente y cacheado, así que el efecto solo añadía
 * un render en cascada y un frame de esqueleto que no hacía falta. Y no durante el render a secas, porque
 * un componente cliente TAMBIÉN se renderiza en el servidor para el HTML inicial, y ahí `bootClient` toca
 * `localStorage`. `useSyncExternalStore` con instantánea de servidor `null` es el patrón que el resto del
 * proyecto ya usa para exactamente esto.
 *
 * La identidad estable del resultado no es un extra: es lo que hace que el `memo` de `PathSection` sirva
 * de algo.
 */
let catalogCache: Loaded | null = null;

const subscribeCatalog = (): (() => void) => () => undefined;

function readCatalog(): Loaded {
  catalogCache ??= shape(bootClient().world.courses);
  return catalogCache;
}

const serverCatalog = (): Loaded | null => null;

/**
 * EL CAMINO.
 *
 * Son 190 lecciones y 26 unidades: rehacer el árbol en cada render anularía el `memo` de las secciones,
 * que es donde vive el criterio de aislamiento.
 */
export function PathScreen() {
  const loaded = useSyncExternalStore(subscribeCatalog, readCatalog, serverCatalog);
  const fold = useFold(DEFAULT_ECONOMY);
  const scrolled = useRef(false);

  const path = useMemo(() => {
    if (loaded === null || fold === null) return null;
    return pathStates(loaded.units, new Set(fold.clearedLessons.keys()), fold.completedUnits);
  }, [loaded, fold]);

  // Aterrizar arriba del todo obliga a desplazarse por 119 lecciones hechas para llegar a la siguiente.
  useEffect(() => {
    if (scrolled.current || path?.currentLessonId == null) return;
    scrolled.current = true;
    const node = document.querySelector(`[href="/leccion/${path.currentLessonId}"]`);
    node?.scrollIntoView({ block: 'center' });
  }, [path?.currentLessonId]);

  if (loaded === null || path === null) {
    return (
      <div style={{ display: 'grid', gap: 16, padding: 24 }}>
        <span className="sr-only" role="status">
          Cargando tu camino
        </span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 60, width: 60, borderRadius: 999, justifySelf: 'center' }} />
        ))}
      </div>
    );
  }

  if (path.currentLessonId === null) {
    return (
      <EmptyState
        mood="celebrate"
        title="Terminaste el catálogo entero"
        body="Las 190 lecciones, completas. La práctica inteligente sigue trayéndote lo que más se te olvida."
        action={
          <Link href="/practica">
            <Button3D size="lg" variant="success">
              Ir a practicar
            </Button3D>
          </Link>
        }
      />
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      {loaded.sections.map((s, i) => (
        <PathSection key={s.title + String(i)} title={s.title} units={s.units} states={path.lessonState} index={i} />
      ))}
    </div>
  );
}
