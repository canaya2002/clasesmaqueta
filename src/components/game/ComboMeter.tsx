'use client';

import { motion } from '@/design/m';
import { useVariant } from '@/design/MotionRoot';

const SEGMENTS = 5;

/**
 * El combo se comunica por FORMA, GLIFO y TEXTO antes que por color.
 *
 * El default del género es una llama que pasa de ámbar a rojo. Para un 8% de los hombres es la misma llama.
 * Aquí hay segmentos discretos que se llenan, un número tabular, una etiqueta y un glifo distinto por nivel.
 */
export function ComboMeter({ run, multiplier }: { readonly run: number; readonly multiplier: number }) {
  const pulse = useVariant('comboPulse');
  const filled = Math.min(SEGMENTS, run);
  const blaze = run >= 5;

  if (run < 2) return null;

  return (
    <motion.div
      variants={pulse}
      initial="rest"
      animate={run >= 3 ? 'pulse' : 'rest'}
      data-verdict={blaze ? 'partial' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        borderRadius: 'var(--r-full)',
        color: blaze ? 'var(--fg-warning)' : 'var(--fg-primary)',
      }}
    >
      <span aria-hidden="true" style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 14,
              borderRadius: 2,
              background: i < filled ? 'currentColor' : 'var(--border-default)',
            }}
          />
        ))}
      </span>
      <span className="u-counter" style={{ fontWeight: 600 }}>
        ×{multiplier.toFixed(2).replace(/0$/, '')}
      </span>
      <span style={{ fontSize: 'var(--t-12)' }}>
        {blaze ? 'En llamas' : `Racha de ${String(run)}`}
      </span>
    </motion.div>
  );
}
