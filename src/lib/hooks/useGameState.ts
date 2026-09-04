'use client';

/**
 * Las suscripciones ESTRECHAS. De aquí sale el criterio de aislamiento de render.
 *
 * El criterio literal de la fase: perder corazones repinta la barra de corazones y NADA más — ni el
 * camino, ni sus secciones. No se consigue con memos ni con `useCallback`: se consigue porque son dos
 * fuentes de estado DISTINTAS, cada una con sus suscriptores.
 *
 * - Los corazones viven en `mock/hearts.ts` y notifican solo cuando cambia algo observable.
 * - El progreso vive en el ledger y no se entera de que alguien falló un ejercicio.
 *
 * Un store único con un selector habría bastado en teoría y falla en la práctica: basta con que un
 * selector devuelva un objeto nuevo —lo más fácil de escribir— para que todo el árbol repinte, y el fallo
 * no se ve hasta que alguien lo mide.
 */

import { useSyncExternalStore } from 'react';
import type { EconomyConfig } from '@/content/engine/economy';
import type { Basis, FoldResult } from '@/game/types';
import type { HeartsSnapshot } from '@/content/engine/runtime';
import { getBasis, getFold, subscribeLedger } from '@/mock/ledger';
import { peekHearts, subscribeHearts } from '@/mock/hearts';

/**
 * En el servidor NO hay estado: el HUD se pinta con el esqueleto y se hidrata con el valor real.
 *
 * `getServerSnapshot` es obligatorio o React lanza al renderizar en servidor. Devolver aquí el valor del
 * cliente sería peor que no tenerlo: produciría un desajuste de hidratación silencioso, con el HTML
 * diciendo un número y el DOM otro.
 */
const serverBasis = (): Basis | null => null;

export function useBasis(econ: EconomyConfig): Basis | null {
  return useSyncExternalStore(subscribeLedger, () => getBasis(econ), serverBasis);
}

const serverFold = (): FoldResult | null => null;

export function useFold(econ: EconomyConfig): FoldResult | null {
  return useSyncExternalStore(subscribeLedger, () => getFold(econ), serverFold);
}

const serverHearts = (): HeartsSnapshot | null => null;

export function useHearts(econ: EconomyConfig): HeartsSnapshot | null {
  return useSyncExternalStore(subscribeHearts, () => peekHearts(econ), serverHearts);
}
