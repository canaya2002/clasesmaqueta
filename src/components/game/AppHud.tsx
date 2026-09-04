'use client';

import { memo } from 'react';
import { useEconomy } from '@/lib/hooks/useEconomy';
import { useBasis } from '@/lib/hooks/useGameState';
import { HeartsChip } from './HeartsChip';
import { GemIcon } from '@/components/ui/icons';
import { StreakFlame } from './StreakFlame';

/**
 * El encabezado de la App: racha, gemas, corazones.
 *
 * Cada pieza se suscribe a lo SUYO. El contenedor no lee nada, así que perder un corazón no lo repinta y
 * el camino que hay debajo tampoco se entera. Si el HUD leyera los tres valores y los pasara hacia abajo
 * como props, sería el HUD el que repintaría, y con él todo su subárbol — que es exactamente el fallo que
 * el criterio de aceptación mide.
 */
const GemChip = memo(function GemChip() {
  const econ = useEconomy();
  const basis = useBasis(econ);
  return (
    <div className="hud-chip">
      <GemIcon size={19} strokeWidth={2.4} className="hud-chip__icon" data-tone="gem" aria-hidden="true" />
      <span className="u-counter hud-chip__value">{basis === null ? '—' : String(basis.gems)}</span>
      <span className="sr-only">{String(basis?.gems ?? 0)} gemas</span>
    </div>
  );
});

export function AppHud() {
  return (
    <header className="app-hud">
      <StreakFlame />
      <GemChip />
      <div style={{ marginInlineStart: 'auto' }}>
        <HeartsChip />
      </div>
    </header>
  );
}
