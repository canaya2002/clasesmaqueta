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
 * 4. El ledger del usuario de la demo se SIEMBRA si está vacío, para que la primera pantalla no sea un
 *    camino en blanco con cero XP mientras el Studio afirma que 1,247 personas llevan cuatro meses usándolo.
 */

import { initClock, newEpochSeed, type ClockDrift } from '@/lib/clock';
import { read, write } from './persist';
import { boot, type World } from './db';
import { configureLedger, hasLedger, replaceLedger } from './ledger';
import { seedLedgerFor, unitSizesOf } from './ledger-seed';
import { userAt } from './seed';

/**
 * El usuario de la demo: Efraín Hernández Castillo, recepcionista en CDMX.
 *
 * El ordinal está ELEGIDO, no tomado al azar, y las tres razones importan:
 *
 * - Es RECEPCIONISTA, que es exactamente la persona a la que apunta el primer curso. Enseñar la app con un
 *   perfil de cobranza mientras la primera unidad habla de contestar el teléfono desconecta el argumento.
 * - Tiene racha de 21 días y 57 días activos de 120: la llama está viva —el HUD tiene algo que enseñar— y
 *   aun así hay huecos en el heatmap, que es lo que lo hace creíble. Un usuario con 120 de 120 parece
 *   sembrado, porque lo está.
 * - No ha terminado el catálogo: quedan unidades bloqueadas que enseñar en el camino.
 *
 * Se eligió recorriendo los 1,247 y filtrando por esos criterios, no a ojo.
 */
export const DEMO_USER_ORDINAL = 688;

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

  const world = boot();
  const me = userAt(DEMO_USER_ORDINAL);

  configureLedger({ zone: me.zone === 'America/Chicago' || me.zone === 'America/Phoenix' ? me.zone : 'America/Mexico_City', unitSizes: unitSizesOf(world.courses) });
  if (!hasLedger()) {
    replaceLedger(
      seedLedgerFor({
        ordinal: DEMO_USER_ORDINAL,
        index: world.activity,
        courses: world.courses,
        zone: 'America/Mexico_City',
      }),
    );
  }

  cached = { world, drift };
  return cached;
}

/** Solo para pruebas y para el botón "reiniciar demo" del Studio. */
export function resetClientBoot(): void {
  cached = null;
}
