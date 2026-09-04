'use client';

import type { ReactNode } from 'react';

export type VerdictKind = 'correct' | 'wrong' | 'partial';

const LABEL: Readonly<Record<VerdictKind, string>> = {
  correct: 'Correcto',
  wrong: 'Revisa esto',
  partial: 'Casi',
};

const GLYPH: Readonly<Record<VerdictKind, string>> = {
  correct: 'M5 13l4 4L19 7',
  wrong: 'M6 6l12 12M18 6L6 18',
  partial: 'M5 12h14',
};

/**
 * Correcto / incorrecto NUNCA solo por color.
 *
 * Emite cuatro señales a la vez: color, ícono, texto y TRAMA (la trama vive en `[data-verdict]::before`).
 * Un 8% de los hombres no distingue el verde del rojo, y la trama además sobrevive a un proyector mal
 * calibrado — que es exactamente el proyector de una sala de juntas.
 */
export function Verdict({ kind, children }: { readonly kind: VerdictKind; readonly children?: ReactNode }) {
  const color =
    kind === 'correct' ? 'var(--fg-success)' : kind === 'wrong' ? 'var(--fg-danger)' : 'var(--fg-warning)';
  return (
    <p
      data-verdict={kind}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: 0,
        padding: '8px 12px',
        borderRadius: 'var(--r-md)',
        color,
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d={GLYPH[kind]} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span>{LABEL[kind]}</span>
      {children !== undefined && <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}>{children}</span>}
    </p>
  );
}
