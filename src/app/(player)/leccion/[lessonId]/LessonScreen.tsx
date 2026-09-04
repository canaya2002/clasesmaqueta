'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { LessonShell } from '@/components/game/LessonShell';
// El barril de metadatos de las dinamicas. Va AQUI y no en el layout raiz: cada `meta` pesa unos 5 KB
// comprimidos, y el reproductor es la unica pantalla que necesita poder montar cualquier tipo de ejercicio.
import '@/content/dynamics/index';
import { createSessionRuntime } from '@/mock/runtime';
import { recordLesson } from '@/mock/actions';
import { unitOf } from '@/mock/content-index';
import { lessonById } from '@/mock/repo/courses';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import type { Lesson } from '@/content/engine/schema';
import type { LessonResult } from '@/content/engine/grade';

/** Sin fuente externa: solo distingue servidor de cliente sin caer en un `setState` dentro de un efecto. */
const noopSubscribe = (): (() => void) => () => undefined;

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly lesson: Lesson }
  | { readonly kind: 'missing' };

export function LessonScreen({ lessonId }: { readonly lessonId: string }) {
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const econ = DEFAULT_ECONOMY;

  /*
   * El runtime se crea SOLO en el cliente, y esto no es una precaución teórica.
   *
   * Un componente 'use client' TAMBIÉN se renderiza en el servidor para el HTML inicial, y esta ruta es
   * dinámica. `createSessionRuntime` lee los corazones, que leen el reloj, que exige `initClock()` — algo
   * que solo ocurre en el arranque del cliente. En producción eso era un 500 en la ruta más importante del
   * producto.
   *
   * Lo encontró la guarda que añadí al reloj en la fase 5. Antes de ella, el mismo código devolvía la
   * cadena vacía y seguía adelante con un reloj sin anclar: fallaba igual, pero en silencio y con números
   * equivocados. Un error que rompe el build es más barato que uno que no.
   */
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const runtime = useMemo(() => (hydrated ? createSessionRuntime({ econ }) : null), [hydrated, econ]);

  const onFinish = useCallback(
    (result: LessonResult): void => {
      if (load.kind !== 'ready') return;
      // Se busca la unidad a la que pertenece la lección: el evento la necesita para saber cuándo una
      // unidad queda completa, y el reproductor recibe la lección suelta.
      const unitId = unitOf(load.lesson.id);
      if (unitId === null) return;
      recordLesson(econ, {
        lessonId: load.lesson.id,
        unitId,
        difficulty: load.lesson.difficulty,
        result,
        // El modo práctica sin corazones NO cuenta para progreso, y la decisión viaja congelada en el
        // evento: se activa a mitad de lección, así que solo el evento sabe bajo qué reglas se jugó.
        countsForProgress: runtime?.awardsProgress ?? false,
      });
    },
    [load, econ, runtime],
  );

  useEffect(() => {
    let alive = true;
    void lessonById(lessonId).then((res) => {
      if (!alive) return;
      setLoad(res.ok ? { kind: 'ready', lesson: res.value } : { kind: 'missing' });
    });
    return () => {
      alive = false;
    };
  }, [lessonId]);

  if (load.kind === 'loading' || runtime === null) {
    return (
      <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--bg-canvas)' }}>
        <div className="skeleton" style={{ width: 'min(88vw, 560px)', height: 240 }} />
        <span className="sr-only" role="status">
          Cargando la lección
        </span>
      </main>
    );
  }

  // Ninguna ruta lleva a una pantalla vacía: si la lección no existe, se dice y se ofrece la salida.
  if (load.kind === 'missing') {
    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          alignContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: 'var(--bg-canvas)',
        }}
      >
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-28)', margin: 0 }}>
          Esta lección ya no existe
        </h1>
        <p style={{ color: 'var(--fg-muted)', margin: 0, maxWidth: 'var(--measure)' }}>
          Puede que se haya despublicado desde el Studio. El resto del curso sigue disponible.
        </p>
        <a href="/" style={{ color: 'var(--fg-primary)', fontWeight: 700 }}>
          Volver al inicio
        </a>
      </main>
    );
  }

  return (
    <LessonShell
      lesson={load.lesson}
      runtime={runtime}
      econ={econ}
      onExit={() => router.replace('/aprende')}
      onFinish={onFinish}
    />
  );
}
