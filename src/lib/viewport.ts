'use client';

import { useEffect } from 'react';

/**
 * El alto REAL disponible, y el hueco que deja el teclado virtual.
 *
 * `100dvh` no se encoge cuando aparece el teclado en iOS Safari: la unidad dinámica sigue las barras del
 * navegador, no el teclado. En un iPhone SE eso deja el input de "completar el espacio" literalmente debajo
 * del teclado, con el pie de página anclado a un borde que ya no se ve.
 *
 * `visualViewport` sí lo sabe. Se escriben dos variables CSS y el layout las usa; el listener va
 * amortiguado con `requestAnimationFrame` porque durante la animación del teclado dispara decenas de veces.
 */
export function useVisualViewportVars(ref: { current: HTMLElement | null }): void {
  useEffect(() => {
    const vv = window.visualViewport;
    const node = ref.current;
    if (vv === undefined || vv === null || node === null) return;

    let frame = 0;
    const apply = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        node.style.setProperty('--app-h', `${String(Math.round(vv.height))}px`);
        const inset = window.innerHeight - vv.height - vv.offsetTop;
        node.style.setProperty('--kb-inset', `${String(Math.max(0, Math.round(inset)))}px`);
      });
    };
    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
    };
  }, [ref]);
}
