'use client';

import { useCallback, useState } from 'react';

/**
 * Reordenar una lista con teclado, como PATRÓN DE LISTBOX.
 *
 * Una versión anterior hacía de cada ficha un `<button>` con dos botones de subir y bajar DENTRO. Eso es
 * HTML inválido —el parser cierra el botón externo y quedan tres hermanos— y además no funciona para el
 * usuario para el que se diseñó: en modo navegación de NVDA o JAWS, el cursor virtual se come las flechas y
 * el `keydown` del componente nunca las recibe.
 *
 * La forma correcta: la LISTA es el único tabstop, con `role="listbox"` y `aria-activedescendant` —que sí
 * dispara el modo foco automáticamente—, las fichas son `role="option"` NO enfocables, y los controles de
 * subir y bajar viven en un `role="toolbar"` FUERA de la lista. Enter y Espacio sí llegan al elemento
 * enfocado en los tres lectores principales, así que la barra de herramientas es la ruta garantizada y las
 * flechas son el acelerador.
 */
export interface UseGrabListOptions {
  readonly length: number;
  readonly onMove: (from: number, to: number) => void;
  readonly announce: (text: string) => void;
  readonly labelAt: (index: number) => string;
  readonly optionId: (index: number) => string;
  readonly disabled: boolean;
}

export interface UseGrabList {
  readonly activeIndex: number;
  readonly grabbed: boolean;
  readonly activeDescendant: string;
  readonly onKeyDown: (event: React.KeyboardEvent) => void;
  readonly setActiveIndex: (index: number) => void;
  readonly toggleGrab: () => void;
  readonly moveActive: (delta: number) => void;
}

export function useGrabList(opts: UseGrabListOptions): UseGrabList {
  const [activeIndex, setActiveIndex] = useState(0);
  const [grabbed, setGrabbed] = useState(false);
  const [origin, setOrigin] = useState<number | null>(null);

  const say = useCallback(
    (index: number) => {
      opts.announce(
        `${opts.labelAt(index)}, posición ${String(index + 1)} de ${String(opts.length)}.`,
      );
    },
    [opts],
  );

  const toggleGrab = useCallback(() => {
    if (opts.disabled) return;
    if (grabbed) {
      setGrabbed(false);
      setOrigin(null);
      opts.announce(`Soltaste ${opts.labelAt(activeIndex)} en la posición ${String(activeIndex + 1)}.`);
      return;
    }
    setGrabbed(true);
    setOrigin(activeIndex);
    opts.announce(`Tomaste ${opts.labelAt(activeIndex)}. Usa subir y bajar, o las flechas.`);
  }, [activeIndex, grabbed, opts]);

  const moveActive = useCallback(
    (delta: number) => {
      if (opts.disabled) return;
      const next = Math.min(opts.length - 1, Math.max(0, activeIndex + delta));
      if (next === activeIndex) return;
      if (grabbed) opts.onMove(activeIndex, next);
      setActiveIndex(next);
      say(next);
    },
    [activeIndex, grabbed, opts, say],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (opts.disabled) return;
      const key = event.key;

      if (key === ' ' || key === 'Enter') {
        // El scroll de página ocurre en keydown, no en keyup.
        event.preventDefault();
        if (!event.repeat) toggleGrab();
        return;
      }

      if (key === 'Escape' && grabbed) {
        event.preventDefault();
        if (origin !== null && origin !== activeIndex) {
          opts.onMove(activeIndex, origin);
          setActiveIndex(origin);
        }
        setGrabbed(false);
        setOrigin(null);
        opts.announce('Movimiento cancelado.');
        return;
      }

      const delta =
        key === 'ArrowDown' || key === 'ArrowRight' ? 1 : key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 0;
      if (delta !== 0) {
        event.preventDefault();
        // El autorepeat convierte una pulsación sostenida en ~30 movimientos por segundo: el movimiento se
        // aplica igual, pero el anuncio lo agrupa el `LiveAnnouncer` con su borde de salida.
        moveActive(delta);
        return;
      }

      if (key === 'Home' || key === 'End') {
        event.preventDefault();
        const next = key === 'Home' ? 0 : opts.length - 1;
        if (grabbed) opts.onMove(activeIndex, next);
        setActiveIndex(next);
        say(next);
      }
    },
    [activeIndex, grabbed, moveActive, opts, origin, say, toggleGrab],
  );

  return {
    activeIndex,
    grabbed,
    activeDescendant: opts.optionId(activeIndex),
    onKeyDown,
    setActiveIndex,
    toggleGrab,
    moveActive,
  };
}
