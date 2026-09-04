'use client';

/**
 * SENDA — la secuencia de arranque del cliente. UN orden, escrito una vez.
 *
 * El orden importa y no es evidente, así que va aquí y no repartido por los componentes:
 *
 * 1. `initClock` ANTES que nada. `boot()` construye 120 días de actividad y necesita el ancla; leer el
 *    reloj sin inicializar lanzaba, y durante toda la Fase 2 no lanzó porque nadie llamaba a `initClock` y
 *    las funciones que sí lo exigían no estaban en el camino. Nueve pruebas pasaban leyendo un reloj sin
 *    inicializar.
 * 2. El ancla se LEE del almacenamiento y se vuelve a ESCRIBIR ya deslizada. Sin el segundo paso, la deriva
 *    se recalcula desde el mismo punto cada arranque y el "re-anclar demo a hoy" del Studio no persiste.
 * 3. `boot()` al final, cuando el reloj ya es correcto.
 */

import { initClock, newEpochSeed, type ClockDrift } from '@/lib/clock';
import { read, write } from './persist';
import { boot, type World } from './db';

interface StoredMeta {
  readonly anchorMs: number;
}

export interface ClientBoot {
  readonly world: World;
  readonly drift: ClockDrift;
}

let cached: ClientBoot | null = null;

function readAnchor(): number | null {
  const raw = read('meta');
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const meta: Record<string, unknown> = { ...parsed };
    const anchor = meta['anchorMs'];
    return typeof anchor === 'number' && Number.isFinite(anchor) ? anchor : null;
  } catch {
    return null;
  }
}

export function bootClient(): ClientBoot {
  if (cached !== null) return cached;

  const drift = initClock({ storedAnchorMs: readAnchor(), epochSeed: newEpochSeed() });
  const meta: StoredMeta = { anchorMs: drift.anchorMs };
  write('meta', JSON.stringify(meta));

  cached = { world: boot(), drift };
  return cached;
}

/** Solo para pruebas y para el botón "reiniciar demo" del Studio. */
export function resetClientBoot(): void {
  cached = null;
}
