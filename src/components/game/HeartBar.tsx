'use client';

import { useEffect, useRef, useState } from 'react';
import type { EconomyConfig } from '@/content/engine/economy';
import { startHeartsTicker } from '@/mock/hearts-ticker';

/**
 * La cuenta regresiva vive AQUÍ, en una hoja, y escribe por `textContent`.
 *
 * Un temporizador dentro del store del jugador repintaría el camino de 190 nodos y el paso en curso una vez
 * por segundo, y arruinaría cualquier medición de 60 fps hecha delante del cliente. Aquí no hay ni siquiera
 * un `setState` por tick: el ticker entrega los milisegundos y el nodo se escribe directamente. React no se
 * entera de que pasa el tiempo.
 *
 * El nodo visible va `aria-hidden` y a su lado hay un texto que solo cambia de MINUTO: una región viva que
 * anuncie cada segundo convierte el lector de pantalla en un metrónomo inutilizable.
 */
export function HeartBar({
  econ,
  current,
  infinite,
  badge,
}: {
  readonly econ: EconomyConfig;
  readonly current: number;
  readonly infinite: boolean;
  readonly badge: boolean;
}) {
  const clockRef = useRef<HTMLSpanElement | null>(null);
  const [minuteLabel, setMinuteLabel] = useState('');

  useEffect(() => {
    if (infinite) return;
    const lastMinute = { value: -1 };
    return startHeartsTicker(econ, (msLeft) => {
      const node = clockRef.current;
      if (msLeft === null) {
        if (node !== null) node.textContent = '';
        setMinuteLabel('');
        lastMinute.value = -1;
        return;
      }
      const mm = Math.floor(msLeft / 60_000);
      const ss = Math.floor((msLeft % 60_000) / 1000);
      if (node !== null) node.textContent = `${String(mm)}:${String(ss).padStart(2, '0')}`;
      if (mm !== lastMinute.value) {
        lastMinute.value = mm;
        setMinuteLabel(mm === 0 ? 'menos de un minuto' : `${String(mm)} minutos`);
      }
    });
  }, [econ, infinite]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="sr-only">
        {infinite
          ? 'Corazones ilimitados'
          : `${String(current)} de ${String(econ.maxHearts)} corazones`}
        {minuteLabel === '' ? '' : `. Siguiente en ${minuteLabel}`}
        {badge ? '. Modo practica: no cuenta para tu progreso' : ''}
      </span>

      {infinite ? (
        <span aria-hidden="true" style={{ color: 'var(--fg-danger)', fontFamily: 'var(--font-display)' }}>
          ♥ ∞
        </span>
      ) : (
        <span aria-hidden="true" style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: econ.maxHearts }, (_, i) => (
            <svg key={i} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 20s-7-4.5-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.5 12 20 12 20Z"
                fill={i < current ? 'var(--bg-danger-solid)' : 'transparent'}
                stroke={i < current ? 'var(--fg-danger)' : 'var(--border-strong)'}
                strokeWidth="2"
              />
            </svg>
          ))}
        </span>
      )}

      {!infinite && (
        <span
          ref={clockRef}
          className="u-counter"
          aria-hidden="true"
          style={{ fontSize: 'var(--t-12)', color: 'var(--fg-muted)', minWidth: '4ch' }}
        />
      )}

      {badge && (
        <span
          aria-hidden="true"
          style={{
            fontSize: 'var(--t-12)',
            padding: '2px 8px',
            borderRadius: 'var(--r-full)',
            background: 'var(--bg-warning-subtle)',
            color: 'var(--ink-fixed)',
          }}
        >
          Práctica
        </span>
      )}
    </div>
  );
}
