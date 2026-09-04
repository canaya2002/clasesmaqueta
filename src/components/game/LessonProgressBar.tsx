'use client';

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from '@/design/m';
import { useIsReducedMotion, useSpringT } from '@/design/MotionRoot';

/**
 * La barra NUNCA retrocede.
 *
 * Re-encolar un paso hace crecer el denominador, así que una barra dibujada como hechos/total encoge en el
 * MISMO frame en que dispara el rebote de avance: la peor combinación posible de señales. El estado publica
 * una INTENCIÓN y la barra anima distinto según cuál — al extender, el riel crece y el relleno se queda.
 *
 * Y anima `scaleX`, no `width`: la segunda dispara layout en cada frame. El brillo se CONTRA-ESCALA para no
 * verse estirado, que es el detalle que nadie hace y que hace que el 100% no se vea barato.
 */
export function LessonProgressBar({
  value,
  intent,
  label,
}: {
  readonly value: number;
  readonly intent: 'advance' | 'extend' | 'none';
  readonly label: string;
}) {
  const reduced = useIsReducedMotion();
  const pop = useSpringT('pop');
  const sx = useMotionValue(value);
  const shineScale = useTransform(sx, (v) => (v === 0 ? 1 : 1 / v));

  useEffect(() => {
    void animate(sx, value, reduced ? { duration: 0.12 } : pop);
  }, [value, sx, pop, reduced]);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-label={label}
      style={{
        position: 'relative',
        height: 12,
        flex: 1,
        borderRadius: 'var(--r-full)',
        background: 'var(--border-default)',
        overflow: 'hidden',
      }}
      data-intent={intent}
    >
      <motion.div
        style={{
          scaleX: sx,
          transformOrigin: '0% 50%',
          height: '100%',
          borderRadius: 'var(--r-full)',
          background: 'var(--bg-xp-solid)',
        }}
      >
        {value >= 1 && (
          <motion.span
            aria-hidden="true"
            style={{
              scaleX: shineScale,
              display: 'block',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgb(255 255 255 / 0.6), transparent)',
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
