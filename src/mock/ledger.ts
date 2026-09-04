'use client';

/**
 * SENDA — el ledger CON ESTADO: persistencia, suscripción y el basis cacheado.
 *
 * Toda la aritmética vive en `src/game/**`, que es puro y no puede importar ni el reloj ni esta capa. Aquí
 * pasan las tres cosas que no son puras:
 *
 * 1. **El reloj se muestrea UNA vez** y entra al fold como `asOf`. El fold no puede leer la hora por
 *    dentro: la racha vale 12 a las 03:59 y 0 a las 04:01 sin que haya entrado ningún evento, así que
 *    `fold(eventos, economía)` no es una función y memoizarla congelaría el 12 para siempre.
 * 2. **El basis se cachea con identidad estable.** `useSyncExternalStore` exige que `getSnapshot` devuelva
 *    el MISMO objeto mientras nada cambie; devolver un literal nuevo hace que `Object.is` falle siempre y
 *    React entra en bucle. La clave del caché son las tres cosas de las que el basis depende: la revisión
 *    del ledger, la versión de la economía y qué día es hoy.
 * 3. **Se re-deriva al cruzar el día.** Sin esto, una sesión abierta a las 03:50 sigue enseñando la racha
 *    de ayer a las 04:10, y la demo de la mañana empieza con un número que ya no es cierto.
 */

import { fold } from '@/game/fold';
import { epochDayOf } from '@/game/day';
import type { Basis, DayKey, FoldResult, LedgerEvent } from '@/game/types';
import type { EconomyConfig } from '@/content/engine/economy';
import { dayKeyInZone, msUntilNextDayStart, nowReal, type OfficeZone } from '@/lib/clock';
import { ledgerEventSchema } from '@/game/schema';
import { brand } from '@/lib/brand';
import { read, write } from './persist';

/** Cuántos eventos se conservan antes de compactar. Con ~540 caracteres por lección, cabe holgado. */
const MAX_EVENTS = 600;

interface LedgerState {
  readonly events: readonly LedgerEvent[];
  readonly rev: number;
}

let state: LedgerState = { events: [], rev: 0 };
let loaded = false;
let zone: OfficeZone = 'America/Mexico_City';
let unitSizes: ReadonlyMap<string, number> = new Map();

const listeners = new Set<() => void>();
let cache: { key: string; result: FoldResult } | null = null;
let dayTimer: ReturnType<typeof setTimeout> | null = null;

/* ------------------------------------------------------------------ configuración */

export function configureLedger(input: {
  readonly zone: OfficeZone;
  readonly unitSizes: ReadonlyMap<string, number>;
}): void {
  zone = input.zone;
  unitSizes = input.unitSizes;
  cache = null;
}

/* -------------------------------------------------------------------- persistencia */

function load(): void {
  if (loaded) return;
  loaded = true;
  const raw = read('ledger');
  if (raw === null) return;
  try {
    // Parse, no cast: en una maqueta cuyo argumento de venta es que todo el estado se puede inspeccionar,
    // el almacenamiento SE edita a mano durante la demo. Un `xpUnitsMilli: "mucho"` produciría un XP `NaN`
    // que se propaga a todo el HUD sin lanzar en ningún sitio. Los eventos que no validan se descartan
    // uno a uno: un evento corrupto no puede borrar la historia entera.
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const events: LedgerEvent[] = [];
    for (const item of parsed) {
      const one = ledgerEventSchema.safeParse(item);
      if (one.success) events.push(one.data);
    }
    state = { events, rev: 1 };
  } catch {
    state = { events: [], rev: 0 };
  }
}

function persist(): void {
  write('ledger', JSON.stringify(state.events.slice(-MAX_EVENTS)));
}

/* ------------------------------------------------------------------------- lectura */

function todayKey(): DayKey {
  return brand<string, 'DayKey'>(dayKeyInZone(nowReal(), zone));
}

/** El basis derivado, con IDENTIDAD ESTABLE mientras la clave del caché no cambie. */
export function getFold(econ: EconomyConfig): FoldResult {
  load();
  const key = todayKey();
  const cacheKey = `${String(state.rev)}:${String(econ.version)}:${key}`;
  if (cache !== null && cache.key === cacheKey) return cache.result;

  const day = epochDayOf(key);
  const result = fold(state.events, {
    econ,
    asOf: { todayKey: key, todayEpochDay: day ?? 0 },
    unitSizes,
  });
  cache = { key: cacheKey, result };
  armDayTimer();
  return result;
}

export function getBasis(econ: EconomyConfig): Basis {
  return getFold(econ).basis;
}

/**
 * Un temporizador al próximo cruce de día.
 *
 * No es un tick: dispara UNA vez, en el instante exacto en que la racha puede cambiar de valor. Un
 * intervalo de un minuto haría lo mismo 1,440 veces al día para acertar una.
 */
function armDayTimer(): void {
  if (dayTimer !== null || listeners.size === 0) return;
  const wait = msUntilNextDayStart(nowReal(), zone) + 1000;
  dayTimer = setTimeout(() => {
    dayTimer = null;
    cache = null;
    for (const fn of listeners) fn();
  }, wait);
}

export function subscribeLedger(fn: () => void): () => void {
  listeners.add(fn);
  armDayTimer();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && dayTimer !== null) {
      clearTimeout(dayTimer);
      dayTimer = null;
    }
  };
}

/* ------------------------------------------------------------------------ escritura */

/**
 * El evento SIN los campos que pone esta capa.
 *
 * El `Omit` es DISTRIBUTIVO (`T extends unknown ? ... : never`) a propósito: un `Omit` normal sobre una
 * unión discriminada la colapsa en un solo objeto con todas las propiedades opcionales, y entonces
 * `{ t: 'chest-opened', pricePaid: 5 }` compila.
 */
type WithoutBase<T> = T extends unknown ? Omit<T, 'seq' | 'atRealMs' | 'dayKey'> : never;

export type NewEvent = WithoutBase<LedgerEvent> & { readonly atRealMs?: number };

/** Añade un hecho. El `seq`, el instante y la clave de día los pone esta capa, nunca quien llama. */
export function appendEvent(event: NewEvent): void {
  load();
  const at = event.atRealMs ?? nowReal();
  // El parse vuelve a ser la fábrica: el evento sale de aquí ya validado, con `dayKey` marcada, y sin
  // que ninguna llamada pueda inventarse un campo que el esquema no admita.
  const parsed = ledgerEventSchema.safeParse({
    ...event,
    seq: state.events.length,
    atRealMs: at,
    dayKey: dayKeyInZone(at, zone),
  });
  if (!parsed.success) return;

  state = { events: [...state.events, parsed.data], rev: state.rev + 1 };
  cache = null;
  persist();
  for (const fn of listeners) fn();
}

/** ¿Hay historia guardada? Distinto de "el ledger está vacío": un usuario nuevo de verdad también lo está. */
export function hasLedger(): boolean {
  return read('ledger') !== null;
}

/** Escribe el ledger completo. Solo la siembra inicial y el "reiniciar demo" del Studio la usan. */
export function replaceLedger(events: readonly LedgerEvent[]): void {
  state = { events: [...events], rev: state.rev + 1 };
  loaded = true;
  cache = null;
  persist();
  for (const fn of listeners) fn();
}

export function replaceLedgerForTests(events: readonly LedgerEvent[]): void {
  state = { events, rev: state.rev + 1 };
  loaded = true;
  cache = null;
}

export function resetLedgerForTests(): void {
  state = { events: [], rev: 0 };
  loaded = false;
  cache = null;
  if (dayTimer !== null) {
    clearTimeout(dayTimer);
    dayTimer = null;
  }
}
