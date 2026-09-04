'use client';

import type { ReactNode } from 'react';
import { Mascot } from '@/components/game/mascot/Mascot';
import type { MascotState } from '@/components/game/mascot/types';

/**
 * El estándar de estado vacío. TRES elementos, ni uno más:
 *
 * 1. Cuati en un estado CONCRETO —no siempre el mismo—, porque el estado del mascota es lo que distingue
 *    "todavía no hay nada" de "algo salió mal".
 * 2. Una frase con voz de marca que diga qué pasa y qué sigue. No "No hay datos".
 * 3. UNA acción. Dos acciones en una pantalla vacía es no haber decidido cuál es la siguiente.
 *
 * Existe como componente y no como convención porque una convención no se puede auditar en un PR. Aquí, un
 * estado vacío que no pasa por este componente se ve en el diff.
 */
export interface EmptyStateProps {
  readonly mood: MascotState;
  readonly title: string;
  readonly body: string;
  /** La única acción. `null` solo cuando de verdad no hay nada que el usuario pueda hacer todavía. */
  readonly action: ReactNode | null;
  readonly compact?: boolean;
}

export function EmptyState({ mood, title, body, action, compact = false }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'grid',
        justifyItems: 'center',
        alignContent: 'center',
        gap: compact ? 10 : 16,
        padding: compact ? '24px 16px' : '48px 24px',
        textAlign: 'center',
      }}
    >
      <Mascot state={mood} size={compact ? 48 : 96} />
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: compact ? 'var(--t-16)' : 'var(--t-22)',
          color: 'var(--fg-default)',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: 0,
          maxWidth: 'var(--measure)',
          color: 'var(--fg-muted)',
          fontSize: 'var(--t-14)',
          lineHeight: 'var(--lh-14)',
        }}
      >
        {body}
      </p>
      {action}
    </div>
  );
}
