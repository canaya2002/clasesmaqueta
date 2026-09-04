'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LessonShell } from '@/components/game/LessonShell';
// El barril de metadatos de las dinamicas. Va AQUI y no en el layout raiz: cada `meta` pesa unos 5 KB
// comprimidos, y el reproductor es la unica pantalla que necesita poder montar cualquier tipo de ejercicio.
import '@/content/dynamics/index';
import { createSessionRuntime } from '@/mock/runtime';
import { lessonById } from '@/mock/repo/courses';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import type { Lesson } from '@/content/engine/schema';
import type { LessonResult } from '@/content/engine/grade';

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly lesson: Lesson }
  | { readonly kind: 'missing' };

export function LessonScreen({ lessonId }: { readonly lessonId: string }) {
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const econ = DEFAULT_ECONOMY;

  // El runtime se crea UNA vez por montaje: recrearlo en cada render volvería a tomar el snapshot de
  // corazones y el efecto de comandos del shell se re-dispararía con cada tick del contador.
  const runtime = useMemo(() => createSessionRuntime({ econ }), [econ]);

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

  if (load.kind === 'loading') {
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

  const onFinish = (result: LessonResult): void => {
    void result;
  };

  return (
    <LessonShell
      lesson={load.lesson}
      runtime={runtime}
      econ={econ}
      onExit={() => router.replace('/')}
      onFinish={onFinish}
    />
  );
}
