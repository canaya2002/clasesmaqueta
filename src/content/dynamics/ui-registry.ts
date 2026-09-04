'use client';

/**
 * Registro de INTERFAZ, construido en tiempo de módulo.
 *
 * El `lazy()` se crea AQUÍ, una sola vez, no dentro de un componente ni dentro de un `useMemo`. Es la
 * diferencia entre que funcione y que falle de forma intermitente: React puede descartar la caché de un
 * `useMemo` —lo hace con árboles fuera de pantalla— y basta un repintado con caché fría para que el tipo de
 * elemento sea nuevo. Eso desmonta el player entero: se pierde el foco del teclado, se pierde el elemento
 * tomado si había uno, y el `Suspense` vuelve a suspender mostrando el esqueleto encima de un ejercicio que
 * el alumno ya contestó.
 *
 * Crear el `lazy` en módulo NO descarga el chunk: solo lo descarga renderizarlo. El code-splitting queda
 * intacto y cada UI sigue siendo su propio archivo.
 */

import { lazy, type ComponentType } from 'react';
import type { ErasedEditorProps, ErasedPlayerProps } from '../engine/ui';
import type { DynamicType } from '../engine/registry.types';

export const playerRegistry: { readonly [K in DynamicType]: ComponentType<ErasedPlayerProps> } = {
  'multiple-choice': lazy(async () => ({ default: (await import('./multiple-choice/ui')).ui.Player })),
  'multiple-select': lazy(async () => ({ default: (await import('./multiple-select/ui')).ui.Player })),
  'true-false-swipe': lazy(async () => ({ default: (await import('./true-false-swipe/ui')).ui.Player })),
  'fill-blank': lazy(async () => ({ default: (await import('./fill-blank/ui')).ui.Player })),
  'word-bank': lazy(async () => ({ default: (await import('./word-bank/ui')).ui.Player })),
  'match-pairs': lazy(async () => ({ default: (await import('./match-pairs/ui')).ui.Player })),
  'order-sequence': lazy(async () => ({ default: (await import('./order-sequence/ui')).ui.Player })),
};

export const editorRegistry: { readonly [K in DynamicType]: ComponentType<ErasedEditorProps> } = {
  'multiple-choice': lazy(async () => ({ default: (await import('./multiple-choice/ui')).ui.Editor })),
  'multiple-select': lazy(async () => ({ default: (await import('./multiple-select/ui')).ui.Editor })),
  'true-false-swipe': lazy(async () => ({ default: (await import('./true-false-swipe/ui')).ui.Editor })),
  'fill-blank': lazy(async () => ({ default: (await import('./fill-blank/ui')).ui.Editor })),
  'word-bank': lazy(async () => ({ default: (await import('./word-bank/ui')).ui.Editor })),
  'match-pairs': lazy(async () => ({ default: (await import('./match-pairs/ui')).ui.Editor })),
  'order-sequence': lazy(async () => ({ default: (await import('./order-sequence/ui')).ui.Editor })),
};

export function playerFor(type: string): ComponentType<ErasedPlayerProps> | null {
  const table: Readonly<Record<string, ComponentType<ErasedPlayerProps> | undefined>> = playerRegistry;
  return table[type] ?? null;
}
