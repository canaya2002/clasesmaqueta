'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_ECONOMY, type EconomyConfig } from '@/content/engine/economy';
import { getEconomy, subscribeEconomy } from '@/mock/economy-store';

/**
 * La economía vigente, suscrita.
 *
 * En el servidor devuelve la por defecto y no `null`: a diferencia del ledger o los corazones, la economía
 * NO es estado del usuario —es configuración del producto— así que renderizarla en el servidor no filtra
 * nada ni desajusta la hidratación mientras nadie la haya editado. Y evita que cada pantalla tenga que
 * pintar un esqueleto para enseñar un precio.
 */
const server = (): EconomyConfig => DEFAULT_ECONOMY;

export function useEconomy(): EconomyConfig {
  return useSyncExternalStore(subscribeEconomy, getEconomy, server);
}
