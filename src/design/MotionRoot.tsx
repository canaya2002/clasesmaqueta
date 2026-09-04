'use client';

/**
 * La ÚNICA rama del sistema de movimiento.
 *
 * Los componentes no preguntan por `prefers-reduced-motion`: piden el catálogo activo y no saben en qué
 * modo están. Con un `useReducedMotion()` por componente, 27 micro-interacciones × N componentes son N
 * puntos de fallo y ninguna forma de auditarlo en un PR.
 *
 * Encima va `<MotionConfig reducedMotion="user">` para lo que la librería maneja internamente (`layoutId`,
 * `drag`, `layout`), que el intercambio de catálogo no alcanza.
 */

import { createContext, useContext, useEffect, useMemo } from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';
import type { Transition, Variants } from 'motion/react';
import { CATALOG, CHANNEL_ACTIVE_WHEN_REDUCED, REDUCED_FADE, resolveVariant, spring } from './motion';
import type { MotionChannel, SpringName, VariantName } from './motion';
import { refreshReducedMotion } from './fx';
import { audioBus } from '@/lib/audio/synth';

interface MotionState {
  readonly reduced: boolean;
}

const MotionCtx = createContext<MotionState>({ reduced: false });

export function MotionRoot({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced === true;

  const value = useMemo<MotionState>(() => ({ reduced }), [reduced]);

  useEffect(() => {
    // Ya no se EMPUJA el valor —`fx` lo resuelve solo—, solo se invalida su lectura cacheada cuando el
    // medio cambia en caliente. Empujarlo desde aquí llegaba tarde: los efectos de los hijos corren antes.
    refreshReducedMotion();
  }, [reduced]);

  useEffect(() => {
    // El desbloqueo del audio se engancha aquí y no en el import: en el servidor no hay `window`, y crear
    // el AudioContext fuera de un gesto lo deja suspendido para siempre en Safari.
    audioBus.install();
  }, []);

  return (
    <MotionCtx.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </MotionCtx.Provider>
  );
}

/**
 * Un variant nombrado, ya degradado si hace falta. El componente no sabe en qué modo está.
 * Es la única API de animación declarativa que un componente puede usar.
 */
export function useVariant(name: VariantName): Variants {
  return resolveVariant(name, useContext(MotionCtx).reduced);
}

/** Un spring nombrado, ya degradado si hace falta. Ningún componente escribe un `transition` inline. */
export function useSpringT(name: SpringName): Transition {
  const { reduced } = useContext(MotionCtx);
  return reduced ? REDUCED_FADE : spring[name];
}

/** ¿Está vivo este canal? Lo usan los loops `ambient`, que además llevan compuerta de viewport. */
export function useChannel(channel: MotionChannel): boolean {
  const { reduced } = useContext(MotionCtx);
  return reduced ? CHANNEL_ACTIVE_WHEN_REDUCED[channel] : true;
}

export function useIsReducedMotion(): boolean {
  return useContext(MotionCtx).reduced;
}

/** El canal declarado de un variant, para que un test pueda cruzarlo con la matriz de las 27. */
export function channelOf(name: VariantName): MotionChannel {
  return CATALOG[name].channel;
}
