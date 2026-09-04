'use client';

/**
 * La economía VIVA, editable desde el Studio.
 *
 * Hasta ahora cada pantalla importaba `DEFAULT_ECONOMY` directamente, que es correcto mientras nadie la
 * edite y falso en cuanto existe `/studio/gamification`: el criterio de aceptación dice que mover el XP
 * ahí cambia el HUD **sin recargar**, y una constante importada no cambia nunca.
 *
 * El `version` no es decorativo: es la clave de caché del fold. Sin incrementarlo, el basis derivado se
 * queda con el valor anterior y el HUD no se entera de nada aunque el número sí haya cambiado.
 */

import { DEFAULT_ECONOMY, economySchema, type EconomyConfig } from '@/content/engine/economy';
import { read, write } from './persist';

let current: EconomyConfig = DEFAULT_ECONOMY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): EconomyConfig {
  if (loaded) return current;
  loaded = true;
  const raw = read('gamification');
  if (raw === null) return current;
  try {
    // Parse, no confianza: el Studio escribe aquí pero el almacenamiento se edita a mano en la demo, y una
    // economía con `xpBase: "mucho"` propagaría NaN a todos los números del producto.
    const parsed = economySchema.safeParse(JSON.parse(raw));
    if (parsed.success) current = parsed.data;
  } catch {
    current = DEFAULT_ECONOMY;
  }
  return current;
}

export function getEconomy(): EconomyConfig {
  return load();
}

export function subscribeEconomy(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export type EconomyPatch = Partial<EconomyConfig>;

/** Aplica un cambio. Devuelve el error de validación en vez de lanzarlo: el formulario lo pinta. */
export function updateEconomy(patch: EconomyPatch): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const next = economySchema.safeParse({
    ...load(),
    ...patch,
    // Cada cambio sube la versión, que es la clave de caché del fold. Sin esto el basis se queda cacheado
    // y el HUD sigue enseñando el número viejo aunque la economía ya sea otra.
    version: load().version + 1,
  });
  if (!next.success) {
    return { ok: false, reason: next.error.issues[0]?.message ?? 'Valor fuera de rango' };
  }
  current = next.data;
  write('gamification', JSON.stringify(current));
  for (const fn of listeners) fn();
  return { ok: true };
}

export function resetEconomy(): void {
  current = DEFAULT_ECONOMY;
  write('gamification', JSON.stringify(current));
  for (const fn of listeners) fn();
}

export function resetEconomyForTests(): void {
  current = DEFAULT_ECONOMY;
  loaded = false;
}
