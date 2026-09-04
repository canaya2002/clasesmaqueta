/**
 * SENDA — el transporte de la capa mock.
 *
 * DOS NIVELES, y es una desviación declarada de "80–260 ms en toda función de repo": la especificación
 * también exige interacción por debajo de 16 ms y búsqueda por debajo de 30 ms, y las dos cosas no caben
 * en la misma función. Las lecturas dirigidas por TECLADO resuelven en microtask; las mutaciones y las
 * cargas de pantalla pagan latencia completa.
 *
 * Y la latencia es DETERMINISTA POR FIRMA DE LLAMADA, no aleatoria. Cuesta lo mismo que `Math.random()`
 * —que además está prohibido por lint— y compra tres cosas: reproducibilidad de vídeo, poder probar los
 * estados de carga sin fake timers, y convertir "simular errores" en un escenario ENSAYABLE en vez de una
 * ruleta: con `SIMULATE_ERRORS`, la cuarta carga de la misma pantalla falla siempre.
 */

import { fnv1a } from '@/lib/rng';
import type { Result } from '@/content/engine/primitives';
import { err, ok } from '@/content/engine/primitives';

export type Tier = 'instant' | 'network';

export type RepoErrorCode =
  | 'network'
  | 'timeout'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'quota'
  | 'aborted'
  | 'forbidden'
  | 'stale';

export interface RepoError {
  readonly code: RepoErrorCode;
  /** Clave i18n, NO texto armado: dos sistemas de mensajes en el mismo repo es uno de más. */
  readonly messageKey: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly retryable: boolean;
}

export function repoError(
  code: RepoErrorCode,
  messageKey: string,
  params: Readonly<Record<string, string | number>> = {},
): RepoError {
  return { code, messageKey, params, retryable: code === 'network' || code === 'timeout' };
}

export interface TransportConfig {
  /** 0 en pruebas, 1 en demo, 3 para enseñar los estados de carga en vivo. */
  speedMultiplier: number;
  simulateErrors: boolean;
}

export const transportConfig: TransportConfig = {
  speedMultiplier: typeof process !== 'undefined' && process.env['NODE_ENV'] === 'test' ? 0 : 1,
  simulateErrors: false,
};

const callCounts = new Map<string, number>();

export function latencyFor(signature: string): number {
  return (80 + (fnv1a(signature) % 181)) * transportConfig.speedMultiplier;
}

/** Solo para pruebas: el contador de llamadas es estado de módulo. */
export function resetTransport(): void {
  callCounts.clear();
}

/**
 * Envuelve una operación con su nivel de latencia.
 *
 * `Result` en vez de excepciones a propósito: el compilador OBLIGA a pintar el camino de error, y un error
 * sin diseñar se vuelve imposible de compilar. Es lo que hace verdadero el criterio de "ningún estado
 * vacío feo".
 */
export async function transport<T>(
  signature: string,
  tier: Tier,
  work: () => Result<T, RepoError>,
): Promise<Result<T, RepoError>> {
  const nth = (callCounts.get(signature) ?? 0) + 1;
  callCounts.set(signature, nth);

  if (tier === 'instant') {
    await Promise.resolve();
    return work();
  }

  const delay = latencyFor(signature);
  if (delay > 0) await new Promise<void>((resolve) => setTimeout(resolve, delay));

  if (transportConfig.simulateErrors) {
    // Determinista por firma Y por número de llamada: la cuarta carga de la misma pantalla falla siempre,
    // así que el fallo se puede ensayar en la demo en vez de esperar a que ocurra.
    const roll = fnv1a(`${signature}#${String(nth)}`) % 100;
    if (roll < 18) {
      return err(repoError('network', 'repo.error.network'));
    }
  }

  return work();
}

export { err, ok };
export type { Result };
