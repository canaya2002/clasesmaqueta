'use client';

import Link from 'next/link';
import { motion } from '@/design/m';
import { useVariant } from '@/design/MotionRoot';
import type { NodeState } from '@/game/path';
import { CheckpointIcon, DoneIcon, LockedIcon, StartIcon } from '@/components/ui/icons';

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
      {state === 'done' ? (
        <DoneIcon size={26} strokeWidth={3.2} aria-hidden="true" />
      ) : locked ? (
        <LockedIcon size={22} strokeWidth={2.6} aria-hidden="true" />
      ) : kind === 'checkpoint' ? (
        <CheckpointIcon size={26} strokeWidth={2.6} fill="currentColor" aria-hidden="true" />
      ) : (
        <StartIcon size={24} strokeWidth={3} fill="currentColor" aria-hidden="true" />
      )}
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
      {/* La burbuja marca el ÚNICO nodo actual del catálogo. Sin ella, veinte discos disponibles se ven
          igual de invitantes y el alumno tiene que decidir por dónde seguir, que es trabajo que el
          producto debería haberle ahorrado. */}
      {state === 'current' && (
        <span className="path-node__bubble" aria-hidden="true">
          EMPEZAR
        </span>
      )}
      <Link href={`/leccion/${lessonId}`} aria-label={label} className="path-node__hit">
        {body}
      </Link>
    </div>
  );
}
