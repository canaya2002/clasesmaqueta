'use client';

import { memo } from 'react';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { useBasis } from '@/lib/hooks/useGameState';
import { HeartsChip } from './HeartsChip';
import { StreakFlame } from './StreakFlame';

/**
 * El encabezado de la App: racha, gemas, corazones.
 *
 * Cada pieza se suscribe a lo SUYO. El contenedor no lee nada, así que perder un corazón no lo repinta y
 * el camino que hay debajo tampoco se entera. Si el HUD leyera los tres valores y los pasara hacia abajo
 * como props, sería el HUD el que repintaría, y con él todo su subárbol — que es exactamente el fallo que
 * el criterio de aceptación mide.
 */
function HudChip({ glyph, value, label }: { readonly glyph: string; readonly value: string; readonly label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>
        {glyph}
      </span>
      <span className="u-counter" style={{ fontWeight: 800, fontSize: 'var(--t-16)' }}>
        {value}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

const GemChip = memo(function GemChip() {
  const basis = useBasis(DEFAULT_ECONOMY);
  return (
    <HudChip
      glyph="◆"
      value={basis === null ? '—' : String(basis.gems)}
      label={`${String(basis?.gems ?? 0)} gemas`}
    />
  );
});

export function AppHud() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 16px',
        background: 'var(--bg-paper)',
        borderBottom: '1px solid var(--border-default)',
        position: 'sticky',
        top: 0,
        zIndex: 4,
      }}
    >
      <StreakFlame />
      <GemChip />
      <div style={{ marginInlineStart: 'auto' }}>
        <HeartsChip />
      </div>
    </header>
  );
}
