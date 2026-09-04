'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import type { MotionStyle } from 'motion/react';
import { useIsReducedMotion, useSpringT } from '@/design/MotionRoot';
import {
  BLINK_MAX_MS,
  BLINK_MIN_MS,
  BREATHE_MS,
  CHOREO,
  ORIGIN,
  POSE_STILL,
  PUPIL_MAX_UNITS,
  TAIL_SWAY_MS,
} from './choreography';
import type { LayerId, MascotState, MouthShape } from './types';

/** LCG determinista para el parpadeo: `Math.random` está prohibido por lint y la demo debe ser idéntica. */
let blinkSeed = 0x2f6e2b1;
function nextBlinkDelay(): number {
  blinkSeed = (blinkSeed * 1664525 + 1013904223) >>> 0;
  return BLINK_MIN_MS + (blinkSeed / 0xffffffff) * (BLINK_MAX_MS - BLINK_MIN_MS);
}

/** El trazo de la cola. La MISMA cadena Bézier que consume el trazo serpenteante del Camino. */
export const TAIL_SPINE = 'M58 150C42 122 54 90 38 64C30 50 26 38 28 26';
const TAIL_TIP = 'M28 48C27 40 27 32 28 26';

const MOUTHS: Readonly<Record<MouthShape, string>> = {
  smile: 'M104 92C108 97 114 97 118 92',
  open: 'M104 91C108 100 116 100 119 91C114 94 109 94 104 91Z',
  flat: 'M105 93H118',
  frown: 'M104 96C108 91 114 91 118 96',
};

// `MotionStyle` y no `React.CSSProperties`: bajo exactOptionalPropertyTypes las dos no son compatibles,
// porque `x` existe en ambas con significados distintos (atributo SVG vs. transform de motion).
function layerStyle(id: LayerId): MotionStyle {
  return { transformBox: 'view-box', transformOrigin: ORIGIN[id] };
}

interface RigProps {
  readonly state: MascotState;
  readonly trackPointer: boolean;
}

export function MascotRig({ state, trackPointer }: RigProps): React.ReactElement {
  const reduced = useIsReducedMotion();
  const soft = useSpringT('soft');
  const pop = useSpringT('pop');
  const choreo = reduced && state === 'idle' ? POSE_STILL : CHOREO[state];
  const L = choreo.layers;

  /* --- pupilas: disco de radio 4.2u con clamp RADIAL, no rectangular ---------------------------- */
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const px = useSpring(rawX, { stiffness: 180, damping: 22 });
  const py = useSpring(rawY, { stiffness: 180, damping: 22 });

  useEffect(() => {
    if (!trackPointer || reduced) {
      rawX.set(L.pupils.x);
      rawY.set(L.pupils.y);
      return;
    }
    const onMove = (e: PointerEvent): void => {
      const node = svgRef.current;
      if (node === null) return;
      const r = node.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width * 0.52)) / (r.width * 0.9);
      const dy = (e.clientY - (r.top + r.height * 0.34)) / (r.height * 0.9);
      const mag = Math.hypot(dx, dy);
      // Clamp radial: con clamp por eje las pupilas alcanzan las esquinas del rectángulo y bizquean.
      const k = mag > 1 ? 1 / mag : 1;
      rawX.set(dx * k * PUPIL_MAX_UNITS);
      rawY.set(dy * k * PUPIL_MAX_UNITS);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [trackPointer, reduced, rawX, rawY, L.pupils.x, L.pupils.y]);

  /* --- parpadeo: cambio de estado discreto de 60ms, se conserva con movimiento reducido -------- */
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    let timer = 0;
    const schedule = (): void => {
      timer = window.setTimeout(() => {
        setBlinking(true);
        window.setTimeout(() => setBlinking(false), 60);
        schedule();
      }, nextBlinkDelay());
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  const ambient = choreo.ambient && !reduced;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 160 200"
      className="mascot-svg"
      style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }}
      // `paint-order: stroke` es lo que evita que el contorno de 8u se coma el relleno en las curvas.
      paintOrder="stroke"
    >
      {/* sombra sólida: una elipse, jamás blur. Es lo que da peso al salto. */}
      <motion.g
        style={layerStyle('shadow')}
        animate={{ scaleX: L.shadow.scaleX, opacity: L.shadow.opacity }}
        transition={soft}
      >
        <ellipse cx="86" cy="189" rx="40" ry="7" fill="var(--mascot-ground)" />
      </motion.g>

      {/* torso-anchor: carga SOLO la traslación del salto. Sin este grupo, el cuerpo se mueve y abre una
          costura en la base de la cola, porque la cola no debe heredar el squash. */}
      <motion.g
        style={{ transformBox: 'view-box', transformOrigin: '86px 178px' }}
        animate={{ y: L.body.y }}
        transition={pop}
      >
        {/* cola: el canal expresivo primario. A tamaño chip es lo único legible. */}
        <motion.g
          style={layerStyle('tail')}
          animate={
            ambient
              ? { rotate: [L.tail.rotate - 3, L.tail.rotate + 3, L.tail.rotate - 3] }
              : { rotate: L.tail.rotate, scaleY: L.tail.scaleY }
          }
          transition={
            ambient
              ? { duration: TAIL_SWAY_MS / 1000, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
              : soft
          }
        >
          <path d={TAIL_SPINE} stroke="var(--mascot-700)" strokeWidth="30" strokeLinecap="round" fill="none" />
          <path d={TAIL_SPINE} stroke="var(--mascot-500)" strokeWidth="22" strokeLinecap="round" fill="none" />
          <path
            d={TAIL_SPINE}
            stroke="var(--mascot-700)"
            strokeWidth="22"
            strokeLinecap="butt"
            fill="none"
            strokeDasharray="7 20"
          />
          {/* La punta ES el estado de la racha. Se pinta con --streak-ink, un token que resuelve desde
              data-streak en <html>: así un tick de racha no re-renderiza el árbol de la mascota. */}
          <path
            className="mascot-tail-tip"
            d={TAIL_TIP}
            stroke="var(--streak-ink)"
            strokeWidth="22"
            strokeLinecap="round"
            fill="none"
          />
        </motion.g>

        {/* morral: la puerta de recompensas. Las gemas nacen aquí con layoutId hacia el HUD, no del centro
            de la pantalla. El coatí es animal de banda que carga: no es adorno, es la mecánica. */}
        <g style={{ transformBox: 'view-box', transformOrigin: '45px 118px' }}>
          <rect x="32" y="118" width="26" height="22" rx="9" fill="var(--mascot-600)" stroke="var(--mascot-700)" strokeWidth="5" />
          <path d="M34 124H56" stroke="var(--mascot-700)" strokeWidth="4" strokeLinecap="round" />
        </g>

        <ellipse cx="70" cy="180" rx="15" ry="9" fill="var(--mascot-600)" stroke="var(--mascot-700)" strokeWidth="5" />
        <ellipse cx="102" cy="180" rx="15" ry="9" fill="var(--mascot-600)" stroke="var(--mascot-700)" strokeWidth="5" />

        {/* cuerpo: la ÚNICA capa que se deforma. Origen en la planta para que el squash comprima hacia abajo. */}
        <motion.g
          style={layerStyle('body')}
          animate={
            ambient
              ? { scaleY: [1, 1.035, 1], scaleX: [1, 0.985, 1] }
              : { scaleX: L.body.scaleX, scaleY: L.body.scaleY }
          }
          transition={
            ambient
              ? { duration: BREATHE_MS / 1000, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
              : pop
          }
        >
          <path
            d="M86 98C62 98 52 122 52 148C52 172 66 182 86 182C106 182 120 172 120 148C120 122 110 98 86 98Z"
            fill="var(--mascot-500)"
            stroke="var(--mascot-700)"
            strokeWidth="8"
          />
          <ellipse cx="86" cy="152" rx="22" ry="26" fill="var(--mascot-200)" stroke="var(--mascot-700)" strokeWidth="3" />
        </motion.g>

        <motion.g style={layerStyle('armLeft')} animate={{ rotate: L.armLeft.rotate }} transition={pop}>
          <rect x="44" y="126" width="16" height="34" rx="8" fill="var(--mascot-500)" stroke="var(--mascot-700)" strokeWidth="6" />
        </motion.g>
        <motion.g style={layerStyle('armRight')} animate={{ rotate: L.armRight.rotate }} transition={pop}>
          <rect x="112" y="126" width="16" height="34" rx="8" fill="var(--mascot-500)" stroke="var(--mascot-700)" strokeWidth="6" />
        </motion.g>

        {/* ruff: pelo dorsal eréctil. Es el shake táctil sin mover layout, y el medidor de combo. */}
        <motion.g style={layerStyle('ruff')} animate={{ scaleY: L.ruff.scaleY }} transition={pop}>
          <path
            d="M62 108C68 96 78 92 87 92C96 92 106 96 112 108Z"
            fill="var(--mascot-700)"
          />
        </motion.g>

        {/* bandana: la ÚNICA capa que hereda el color de marca. Cambiar el primario cambia una prenda,
            no convierte al coatí en un coatí violeta. */}
        <motion.g
          style={layerStyle('scarf')}
          animate={{ rotate: L.scarf.rotate, y: L.scarf.y }}
          transition={{ ...soft, delay: 0.06 }}
        >
          <path d="M60 100C70 108 104 108 114 100C114 108 106 114 87 114C68 114 60 108 60 100Z" fill="var(--bg-primary)" stroke="var(--brand-shadow)" strokeWidth="4" />
        </motion.g>

        {/* cabeza: origen en la base del cuello. El shake de `wrong` vive AQUÍ, no en el root. */}
        <motion.g
          style={layerStyle('head')}
          animate={
            state === 'wrong' && !reduced
              ? { rotate: [0, -4, 4, -3, 0] }
              : { rotate: L.head.rotate, x: L.head.x, y: L.head.y }
          }
          transition={state === 'wrong' && !reduced ? { duration: 0.32 } : soft}
        >
          <motion.g style={layerStyle('earLeft')} animate={{ rotate: L.earLeft.rotate }} transition={{ ...pop, delay: 0.06 }}>
            <circle cx="58" cy="46" r="14" fill="var(--mascot-500)" stroke="var(--mascot-700)" strokeWidth="7" />
            <circle cx="58" cy="46" r="6" fill="var(--mascot-200)" />
          </motion.g>
          <motion.g style={layerStyle('earRight')} animate={{ rotate: L.earRight.rotate }} transition={{ ...pop, delay: 0.1 }}>
            <circle cx="104" cy="44" r="14" fill="var(--mascot-500)" stroke="var(--mascot-700)" strokeWidth="7" />
            <circle cx="104" cy="44" r="6" fill="var(--mascot-200)" />
          </motion.g>

          <circle cx="82" cy="66" r="31" fill="var(--mascot-500)" stroke="var(--mascot-700)" strokeWidth="8" />
          <ellipse cx="82" cy="70" rx="26" ry="21" fill="var(--mascot-200)" stroke="var(--mascot-700)" strokeWidth="3" />

          {/* trompa prensil: reemplaza a la boca como órgano expresivo principal. */}
          <motion.g style={layerStyle('snout')} animate={{ rotate: L.snout.rotate, scaleX: L.snout.scaleX }} transition={soft}>
            <path
              d="M100 74C112 73 123 78 126 85C123 92 112 95 100 93C104 87 104 80 100 74Z"
              fill="var(--mascot-200)"
              stroke="var(--mascot-700)"
              strokeWidth="6"
            />
            <ellipse cx="123" cy="85" rx="6" ry="5" fill="var(--mascot-ink)" />
            <path
              d={MOUTHS[choreo.mouth]}
              stroke="var(--mascot-ink)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill={choreo.mouth === 'open' ? 'var(--mascot-ink)' : 'none'}
            />
          </motion.g>

          <motion.g style={layerStyle('eyes')} animate={{ scaleY: blinking ? 0.08 : L.eyes.scaleY }} transition={{ duration: 0.06 }}>
            <ellipse cx="70" cy="60" rx="9" ry="10" fill="var(--mascot-sclera)" stroke="var(--mascot-700)" strokeWidth="3.5" />
            <ellipse cx="94" cy="58" rx="9" ry="10" fill="var(--mascot-sclera)" stroke="var(--mascot-700)" strokeWidth="3.5" />
            {/* Las pupilas se mueven por TRANSFORM, no por los atributos x/y del SVG: el atributo
                dispara layout del subárbol, el transform se compone. */}
            <motion.g style={{ ...layerStyle('pupils'), x: px, y: py }} animate={{ scale: L.pupils.scaleX }}>
              <circle cx="70" cy="60" r="4.6" fill="var(--mascot-ink)" />
              <circle cx="94" cy="58" r="4.6" fill="var(--mascot-ink)" />
            </motion.g>
          </motion.g>

          {/* cejas independientes: si el estado emocional dependiera de los ojos, comprar unos anteojos
              rompería `think`, `wrong` y `sad`. Por eso son capa propia. */}
          <motion.g style={layerStyle('brows')} animate={{ rotate: L.brows.rotate, y: L.brows.y }} transition={pop}>
            <path d="M62 44C66 41 72 41 76 43" stroke="var(--mascot-700)" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M88 42C92 40 98 40 102 43" stroke="var(--mascot-700)" strokeWidth="4" strokeLinecap="round" fill="none" />
          </motion.g>
        </motion.g>
      </motion.g>
    </svg>
  );
}
