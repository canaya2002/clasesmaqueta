/**
 * SENDA — el registro de dinámicas en runtime.
 *
 * Guarda superficies ERASADAS. Nadie fuera de `defineDynamic` ve un `DataOf<K>`, y por eso el player, la
 * preview, el editor y la analítica funcionan con cualquier dinámica registrada sin cambiar una línea.
 */

import type { ErasedDynamic } from './dynamic';
import type { DynamicType } from './registry.types';

const registry = new Map<string, ErasedDynamic>();

export function registerDynamic(dynamic: ErasedDynamic): void {
  const existing = registry.get(dynamic.type);
  if (existing !== undefined && existing !== dynamic) {
    throw new Error(`Dinámica duplicada en el registro: "${dynamic.type}"`);
  }
  registry.set(dynamic.type, dynamic);
}

/**
 * Devuelve `null` en vez de lanzar.
 *
 * El contenido puede venir de un JSON importado a mano por un administrador, así que "esta dinámica no
 * existe" es un estado ESPERADO del producto —se pinta como una tarjeta de error legible con su ruta de
 * dominio— y no una excepción que reviente el player a media lección.
 */
export function findDynamic(type: string): ErasedDynamic | null {
  return registry.get(type) ?? null;
}

/** Para código que ya validó el tipo contra el registro. Lanza si no existe: sería un bug del motor. */
export function getDynamic(type: DynamicType): ErasedDynamic {
  const found = registry.get(type);
  if (found === undefined) throw new Error(`Dinámica no registrada: "${type}"`);
  return found;
}

export function listDynamics(): readonly ErasedDynamic[] {
  return [...registry.values()];
}

export function registeredTypes(): readonly string[] {
  return [...registry.keys()];
}

/** Solo para las pruebas: el registro es estado de módulo y las suites deben poder aislarse. */
export function clearRegistryForTests(): void {
  registry.clear();
}
