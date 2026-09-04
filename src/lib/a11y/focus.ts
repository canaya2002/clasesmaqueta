'use client';

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * Foco POR DIRECTIVA, no por montaje.
 *
 * `useEffect(() => heading.focus(), [])` dentro del paso enfoca cuando el nodo se monta, y hay al menos
 * cinco transiciones donde el foco tiene que moverse SIN que se monte nada: un paso re-encolado que React
 * reusa, el cierre de un modal cuyo origen ya se desmontó, la vuelta a la pestaña, el paso a resumen y la
 * resolución del chunk perezoso. Aquí el disparador es un TOKEN: cambia el token, se mueve el foco.
 *
 * `useLayoutEffect` y no `useEffect` a propósito: entre el commit y el efecto pasivo el navegador puede
 * pintar un frame con el foco ya en `body`, y un lector de pantalla que muestrea en ese hueco lee el
 * documento desde arriba.
 */
export function useFocusDirective(token: string, ref: RefObject<HTMLElement | null>): void {
  const last = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (last.current === token) return;
    last.current = token;
    ref.current?.focus({ preventScroll: true });
  }, [token, ref]);
}

/**
 * Red de seguridad: si el foco cae a `body`, devolverlo al ancla.
 *
 * No sustituye a la directiva, la respalda. Los casos que la provocan —un chip que se desmonta con el foco
 * dentro, un `<dialog>` que restaura a un nodo que ya no existe— son exactamente los que nadie enumera
 * completos, y el síntoma es siempre el mismo: el usuario de teclado vuelve al inicio del documento.
 *
 * Se comprueba en el frame SIGUIENTE porque durante el desmontaje `activeElement` pasa por `body` de forma
 * legítima antes de que React mueva el foco a donde toca.
 */
export function useBodyFocusGuard(ref: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const root = ref.current;
    if (root === null) return;

    let frame = 0;
    const onFocusOut = (event: FocusEvent): void => {
      if (event.relatedTarget !== null) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.activeElement === document.body) ref.current?.focus({ preventScroll: true });
      });
    };
    root.addEventListener('focusout', onFocusOut);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('focusout', onFocusOut);
    };
  }, [ref, enabled]);
}
