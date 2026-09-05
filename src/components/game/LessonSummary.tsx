'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { motion } from '@/design/m';
import { Button3D } from '@/components/ui/Button3D';
import { Mascot } from '@/components/game/mascot/Mascot';
import { Odometer } from './Odometer';
import { useVariant } from '@/design/MotionRoot';
import * as fx from '@/design/fx';
import type { LessonResult } from '@/content/engine/grade';

/**
 * El resumen es un ESTADO del shell, no una ruta nueva.
 *
 * Con `router.push('/leccion/x/resumen')`, el gesto de atrás vuelve al último paso de una sesión que ya no
 * existe en memoria: pantalla en blanco o lección reiniciada. Y el App Router no mueve el foco al navegar,
 * así que el lector de pantalla se quedaría al inicio del documento justo en la pantalla de recompensa.
 */
export interface LessonSummaryProps {
  readonly result: LessonResult;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onContinue: () => void;
}

export function LessonSummary({ result, headingRef, onContinue }: LessonSummaryProps) {
  const cardIn = useVariant('stampIn');
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    // El confeti solo en lección perfecta. Celebrar el 60% de aciertos igual que el 100% le quita
    // significado a la celebración, que es lo único que la hace valer algo.
    if (result.perfect) void fx.confetti({ x: 0.5, y: 0.34 }, 2);
  }, [result.perfect]);

  const seconds = Math.round(result.elapsedMs / 1000);
  const stats: readonly { readonly label: string; readonly value: string }[] = [
    { label: 'Precisión', value: `${String(Math.round(result.accuracy * 100))}%` },
    { label: 'Combo máximo', value: String(result.maxCombo) },
    {
      label: 'Tiempo',
      value: `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`,
    },
  ];

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        alignContent: 'center',
        justifyItems: 'center',
        gap: 24,
        padding: 24,
        background: 'var(--bg-canvas)',
        textAlign: 'center',
      }}
    >
      <Mascot state={result.perfect ? 'celebrate' : 'correct'} size={96} />

      <h1 ref={headingRef} tabIndex={-1} style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--t-36)', margin: 0 }}>
        {result.perfect ? '¡Lección perfecta!' : '¡Lección completada!'}
      </h1>

      <motion.div
        variants={cardIn}
        initial="out"
        animate="in"
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          padding: '16px 28px',
          borderRadius: 'var(--r-xl)',
          background: 'var(--bg-primary-subtle)',
          color: 'var(--fg-primary)',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-36)',
        }}
      >
        <span aria-hidden="true">+</span>
        <Odometer value={result.xp} max={9999} />
        <span style={{ fontSize: 'var(--t-16)' }}>XP</span>
      </motion.div>

      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(88px, 1fr))',
          gap: 12,
          margin: 0,
          width: 'min(100%, 420px)',
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              padding: '12px 8px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--bg-paper)',
              boxShadow: 'var(--e1)',
            }}
          >
            <dt style={{ fontSize: 'var(--t-12)', color: 'var(--fg-muted)' }}>{s.label}</dt>
            <dd className="u-counter" style={{ margin: '2px 0 0', fontSize: 'var(--t-22)', fontWeight: 700 }}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <Button3D size="lg" variant="success" onClick={onContinue}>
        Continuar
      </Button3D>
    </main>
  );
}
