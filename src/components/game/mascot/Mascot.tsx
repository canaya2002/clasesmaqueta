'use client';

import { useCallback, useState } from 'react';
import * as fx from '@/design/fx';
import { MascotChip } from './MascotChip';
import { MascotRig } from './MascotRig';
import type { MascotProps } from './types';

/**
 * Cuati — coatí de nariz blanca.
 *
 * Se eligió DESDE LA LISTA DE CAPAS que se querían animar y después se buscó qué animal las tiene todas:
 * dos orejas independientes, una cola más larga que el cuerpo con origen dentro del torso, pelo dorsal
 * eréctil y trompa articulada. El default es al revés —elegir un animal simpático y descubrir que solo le
 * puedes animar los ojos— y produce mascotas que se mueven como calcomanías.
 *
 * Silueta ASIMÉTRICA (asta de cola a la izquierda, trompa a la derecha): casi toda mascota es bilateralmente
 * simétrica de frente, y esa asimetría es el gancho de los cinco segundos.
 */
export function Mascot({
  state,
  size,
  trackPointer = false,
  onPoke,
  className,
  label,
}: MascotProps): React.ReactElement {
  const [poked, setPoked] = useState(false);

  const handlePoke = useCallback(() => {
    if (onPoke === undefined) return;
    setPoked(true);
    fx.play('tap');
    window.setTimeout(() => setPoked(false), 320);
    onPoke();
  }, [onPoke]);

  const isChip = size <= 48;
  const interactive = onPoke !== undefined;

  // Sin etiqueta va `aria-hidden`: el texto adyacente ya nombra a la mascota, y sin esto el lector de
  // pantalla anuncia dos veces cada cambio de estado.
  const a11y =
    label === undefined
      ? ({ 'aria-hidden': true } as const)
      : ({ role: 'img', 'aria-label': label } as const);

  const content = isChip ? (
    <MascotChip />
  ) : (
    <MascotRig state={poked ? 'celebrate' : state} trackPointer={trackPointer} />
  );

  const style = { width: size, height: (size * 200) / 160 } as const;

  if (!interactive) {
    return (
      <div
        className={className === undefined ? 'mascot-root' : `mascot-root ${className}`}
        data-wrong={state === 'wrong' ? 'true' : 'false'}
        style={style}
        {...a11y}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className === undefined ? 'mascot-root' : `mascot-root ${className}`}
      data-wrong={state === 'wrong' ? 'true' : 'false'}
      style={{ ...style, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
      onClick={handlePoke}
      aria-label={label ?? 'Saludar a Cuati'}
    >
      {content}
    </button>
  );
}

export { MascotChip } from './MascotChip';
export { MascotSolid } from './MascotSolid';
export type { MascotProps, MascotState, MascotSize } from './types';
