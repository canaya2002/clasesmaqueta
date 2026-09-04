'use client';

import { motion } from '@/design/m';
import { useVariant } from '@/design/MotionRoot';

/**
 * Contador que rueda dígito por dígito.
 *
 * `font-variant-numeric: tabular-nums` es el default y es insuficiente: funciona con algunas familias y
 * falla con la mitad de las display de Google Fonts. Aquí cada dígito vive en su propia caja de 1ch, y el
 * ancho se reserva por el valor MÁXIMO alcanzable, no por el actual: si no, el contador de XP empuja al de
 * gemas al cruzar un orden de magnitud.
 */
export function Odometer({
  value,
  max,
  label,
}: {
  readonly value: number;
  readonly max: number;
  readonly label?: string;
}) {
  const digit = useVariant('counterDigit');
  const width = String(Math.max(1, max)).length;
  const text = String(Math.max(0, Math.round(value))).padStart(width, ' ');

  return (
    <span className="u-counter" style={{ display: 'inline-flex' }} aria-label={label}>
      {[...text].map((ch, i) => (
        <motion.span
          key={`${String(i)}-${ch}`}
          variants={digit}
          initial="rest"
          animate="roll"
          style={{
            width: '1ch',
            display: 'inline-block',
            textAlign: 'center',
            overflow: 'hidden',
          }}
          aria-hidden="true"
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
      <span className="sr-only">{String(Math.round(value))}</span>
    </span>
  );
}
