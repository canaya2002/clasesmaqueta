'use client';

/**
 * SENDA — la ÚNICA puerta a localStorage y sessionStorage.
 *
 * `eslint.config.mjs` prohíbe el identificador `localStorage` en todo `src/` salvo aquí. La razón no es
 * pureza: es que la demo no puede morir en la laptop del cliente. Tres cosas que este archivo resuelve y
 * que un `setItem(JSON.stringify(store))` no:
 *
 * 1. **La cuota se cobra en UTF-16.** `new Blob([s]).size` cuenta bytes UTF-8 y subestima casi todo texto
 *    en español a la mitad. Aquí se mide `s.length * 2`, que es lo que el navegador realmente reserva.
 * 2. **Presupuesto por clave y orden de desalojo declarado.** Sin orden, el `QuotaExceededError` tira
 *    justo la entrada de publicación que hacía falta para revertir.
 * 3. **Safari en modo privado LANZA al escribir.** Todo acceso va envuelto, y el fallo es un valor de
 *    retorno, no una excepción que reviente el player a mitad de una lección.
 */

import type { AssertComplete } from '@/lib/brand';

const PREFIX = 'senda:v1:';

/** Claves con presupuesto. Añadir una clave sin entrada aquí no compila. */
export type BudgetKey =
  | 'meta'
  | 'settings'
  | 'boot-digest'
  | 'progress'
  | 'gamification'
  | 'branding'
  | 'content-overlay'
  | 'content-blobs'
  | 'content-snapshots'
  | 'content-drafts'
  | 'audit'
  | 'users-overlay';

/** Presupuesto en CARACTERES UTF-16. El total declarado son ~2.6 MB reales de cuota. */
export const BUDGET: Readonly<Record<BudgetKey, number>> = {
  meta: 512,
  settings: 512,
  'boot-digest': 512,
  progress: 300_000,
  gamification: 4_096,
  branding: 1_024,
  'content-overlay': 262_144,
  'content-blobs': 524_288,
  'content-snapshots': 131_072,
  'content-drafts': 131_072,
  audit: 131_072,
  'users-overlay': 49_152,
};

/**
 * Orden de desalojo. El primero se sacrifica primero.
 *
 * `audit` NO va primero pese a ser lo más voluminoso: la bitácora es la pantalla que responde "quién cambió
 * qué", y desalojarla justo antes de mostrarla es el peor resultado posible. Van primero los borradores y
 * los blobs, que se pueden regenerar publicando de nuevo.
 */
export const EVICTION_ORDER: readonly BudgetKey[] = [
  'content-drafts',
  'content-blobs',
  'content-snapshots',
  'users-overlay',
  'audit',
  'content-overlay',
];

/** Claves que NUNCA se desalojan: sin ellas la demo no arranca. */
const NEVER_EVICT: readonly BudgetKey[] = ['meta', 'settings', 'boot-digest', 'progress'];

export type Store = 'local' | 'session';

export type WriteResult =
  | { readonly kind: 'ok'; readonly chars: number }
  | { readonly kind: 'over-budget'; readonly chars: number; readonly limit: number }
  | { readonly kind: 'quota-exceeded'; readonly evicted: readonly BudgetKey[] }
  | { readonly kind: 'unavailable' };

/** Cuánto reserva el navegador para esta cadena. UTF-16, no UTF-8. */
export function charCost(s: string): number {
  return s.length * 2;
}

function backing(store: Store): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return store === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    // Safari privado y navegadores con almacenamiento deshabilitado lanzan al ACCEDER, no al escribir.
    return null;
  }
}

let unavailableReported = false;

export function isStorageAvailable(): boolean {
  const s = backing('local');
  if (s === null) return false;
  try {
    const probe = `${PREFIX}__probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function read(key: BudgetKey, store: Store = 'local'): string | null {
  const s = backing(store);
  if (s === null) return null;
  try {
    return s.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function write(key: BudgetKey, value: string, store: Store = 'local'): WriteResult {
  const s = backing(store);
  if (s === null) {
    unavailableReported = true;
    return { kind: 'unavailable' };
  }

  const cost = charCost(value);
  const limit = BUDGET[key];
  if (cost > limit) return { kind: 'over-budget', chars: cost, limit };

  try {
    s.setItem(PREFIX + key, value);
    return { kind: 'ok', chars: cost };
  } catch {
    // Desalojo en cascada, en el orden declarado, saltando lo que nunca se desaloja.
    const evicted: BudgetKey[] = [];
    for (const victim of EVICTION_ORDER) {
      if (victim === key || NEVER_EVICT.includes(victim)) continue;
      try {
        s.removeItem(PREFIX + victim);
        evicted.push(victim);
        s.setItem(PREFIX + key, value);
        return { kind: 'quota-exceeded', evicted };
      } catch {
        continue;
      }
    }
    return { kind: 'quota-exceeded', evicted };
  }
}

export function remove(key: BudgetKey, store: Store = 'local'): void {
  const s = backing(store);
  if (s === null) return;
  try {
    s.removeItem(PREFIX + key);
  } catch {
    /* nada que hacer: el almacenamiento no está disponible */
  }
}

/** La tupla y su comprobación de completitud: añadir una clave a BUDGET sin añadirla aquí NO compila. */
const BUDGET_KEYS = [
  'meta',
  'settings',
  'boot-digest',
  'progress',
  'gamification',
  'branding',
  'content-overlay',
  'content-blobs',
  'content-snapshots',
  'content-drafts',
  'audit',
  'users-overlay',
] as const;

const _budgetKeysComplete: AssertComplete<(typeof BUDGET_KEYS)[number], BudgetKey> = true;
void _budgetKeysComplete;

export interface UsageRow {
  readonly key: BudgetKey;
  readonly chars: number;
  readonly limit: number;
  readonly pct: number;
}

/** Lo consume la barra de "Espacio de borrador al 87% — compactar" del Studio. */
export function usage(): readonly UsageRow[] {
  return BUDGET_KEYS.map((key) => {
    const value = read(key) ?? '';
    const chars = charCost(value);
    const limit = BUDGET[key];
    return { key, chars, limit, pct: limit === 0 ? 0 : chars / limit };
  });
}

/**
 * "Reiniciar demo" barre los DOS almacenes.
 *
 * La impersonación vive en `sessionStorage` (para que cerrar la pestaña termine la sesión suplantada), así
 * que un reset que solo toca `localStorage` deja al presentador viendo la App como otra persona, con la
 * barra coral encima, delante del cliente. Y nunca es un reset suave: un `store.reset()` en memoria deja
 * vivo el AudioContext suspendido, los IntersectionObserver del camino anterior y el canal duplicado.
 */
export function resetDemo(): void {
  for (const store of ['local', 'session'] as const) {
    const s = backing(store);
    if (s === null) continue;
    try {
      const doomed: string[] = [];
      for (let i = 0; i < s.length; i += 1) {
        const k = s.key(i);
        if (k !== null && k.startsWith(PREFIX)) doomed.push(k);
      }
      for (const k of doomed) s.removeItem(k);
    } catch {
      continue;
    }
  }
}

export function storageWasUnavailable(): boolean {
  return unavailableReported;
}
