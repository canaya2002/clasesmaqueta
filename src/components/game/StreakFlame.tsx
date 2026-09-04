'use client';

import { memo, useEffect } from 'react';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { useBasis } from '@/lib/hooks/useGameState';
import { StreakIcon } from '@/components/ui/icons';

export type StreakTemp = 'cold' | 'warm' | 'hot' | 'blaze';

export function temperature(days: number): StreakTemp {
  if (days >= 30) return 'blaze';
  if (days >= 7) return 'hot';
  if (days >= 3) return 'warm';
  return 'cold';
}

/**
 * La llama de la racha. Cuatro temperaturas, y nunca solo color: el número va al lado.
 *
 * El atributo `data-streak` tiene UN dueño: `<html>`. Lo escribe el script inline del arranque desde el
 * `BootDigest`, antes del primer paint, para que la llama no parpadee de fría a ardiendo en la primera
 * hidratación. Este componente lo ACTUALIZA cuando la racha cambia, pero no crea uno propio: dos elementos
 * con `data-streak` significan dos fuentes de verdad para el mismo color, y la que gane depende del orden
 * de las reglas CSS.
 */
export const StreakFlame = memo(function StreakFlame() {
  const basis = useBasis(DEFAULT_ECONOMY);
  const days = basis?.currentStreak ?? 0;
  const temp = temperature(days);

  useEffect(() => {
    document.documentElement.setAttribute('data-streak', temp);
  }, [temp]);

  return (
    <div className="hud-chip" data-streak-chip={temp}>
      {/* La llama se RELLENA cuando la racha está viva: contorno hueco a cero días, sólida a partir de
          tres. El relleno es la señal que sobrevive a la ceguera al color; el matiz solo la acompaña. */}
      <StreakIcon
        size={19}
        strokeWidth={2.4}
        className="hud-chip__icon"
        fill={days >= 3 ? 'var(--streak-ink)' : 'none'}
        color="var(--streak-ink)"
        aria-hidden="true"
      />
      <span className="u-counter hud-chip__value">{basis === null ? '—' : String(days)}</span>
      <span className="sr-only">
        {days === 0
          ? 'Sin racha. Termina una lección hoy para empezar una.'
          : `Racha de ${String(days)} ${days === 1 ? 'día' : 'días'}`}
      </span>
    </div>
  );
});
