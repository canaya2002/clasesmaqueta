'use client';

import Link from 'next/link';
import { motion } from '@/design/m';
import { useVariant } from '@/design/MotionRoot';
import type { NodeState } from '@/game/path';

const LABEL: Readonly<Record<NodeState, string>> = {
  done: 'completada',
  current: 'empieza aquí',
  available: 'disponible',
  locked: 'bloqueada',
};

export interface PathNodeProps {
  readonly lessonId: string;
  readonly title: string;
  readonly state: NodeState;
  readonly kind: string;
  /** Desplazamiento horizontal del nodo, en píxeles. El camino serpentea. */
  readonly offset: number;
}

/**
 * Un nodo del camino.
 *
 * Una lección bloqueada usa `aria-disabled` y NO `disabled`: sigue siendo enfocable, así que un usuario de
 * teclado puede recorrer el camino entero y enterarse de qué viene después. Un `disabled` la saca del
 * orden de tabulación y el camino se vuelve una lista de tres elementos con un abismo detrás.
 *
 * Y al pulsarla no se queda muda: dice qué falta. Un control que no responde es indistinguible de uno roto.
 */
export function PathNode({ lessonId, title, state, kind, offset }: PathNodeProps) {
  const pop = useVariant('optionPick');
  const locked = state === 'locked';
  const label = `${title}. ${LABEL[state]}`;

  const body = (
    <motion.span
      variants={pop}
      initial="rest"
      {...(locked ? {} : { whileTap: 'picked' })}
      className="path-node__disc"
      data-state={state}
      aria-hidden="true"
    >
      {state === 'done' ? '✓' : locked ? '🔒' : kind === 'checkpoint' ? '★' : '◆'}
    </motion.span>
  );

  if (locked) {
    return (
      <div className="path-node" style={{ transform: `translateX(${String(offset)}px)` }}>
        <button
          type="button"
          aria-disabled="true"
          aria-label={label}
          className="path-node__hit"
          onClick={(e) => {
            e.preventDefault();
            e.currentTarget.setAttribute('data-nudge', 'true');
            window.setTimeout(() => e.currentTarget.removeAttribute('data-nudge'), 400);
          }}
        >
          {body}
        </button>
      </div>
    );
  }

  return (
    <div className="path-node" style={{ transform: `translateX(${String(offset)}px)` }}>
      <Link href={`/leccion/${lessonId}`} aria-label={label} className="path-node__hit" data-mi="03">
        {body}
      </Link>
    </div>
  );
}
