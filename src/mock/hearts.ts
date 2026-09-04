'use client';

/**
 * SENDA — el adaptador CON ESTADO de los corazones.
 *
 * Este archivo hace tres cosas y ninguna más: toma la muestra de reloj, guarda y rehidrata el registro, y
 * avisa a quien escuche. Toda la aritmética vive en `@/content/engine/hearts`, que es puro. La frontera
 * está donde está para que la prueba de "cambiar el reloj del Mac no regala corazones" no necesite tocar
 * este archivo ni instalar fake timers.
 */

import { mono, monoEpochId, nowReal } from '@/lib/clock';
import type { EconomyConfig } from '@/content/engine/economy';
import type { HeartsSnapshot } from '@/content/engine/runtime';
import {
  initialHearts,
  isUnlimited,
  msUntilNextHeart,
  reduceHearts,
  type ClockSample,
  type HeartsConfig,
  type HeartsEvent,
  type HeartsRecord,
} from '@/content/engine/hearts';
import { read, write } from './persist';

/** Cuántos corazones puede otorgar una recarga de página sin señal monótona. Ver `maxUntrustedGrant`. */
const MAX_UNTRUSTED_GRANT = 1;

export function configFrom(econ: EconomyConfig): HeartsConfig {
  return {
    maxHearts: econ.maxHearts,
    refillMs: econ.heartRefillMinutes * 60_000,
    maxUntrustedGrant: MAX_UNTRUSTED_GRANT,
  };
}

export function sampleNow(): ClockSample {
  return { realMs: nowReal(), monoMs: mono(), monoEpochId: monoEpochId() };
}

let cache: HeartsRecord | null = null;
const listeners = new Set<() => void>();

function num(source: Record<string, unknown>, key: string, fallback: number): number {
  const v = source[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function load(cfg: HeartsConfig, s: ClockSample): HeartsRecord {
  if (cache !== null) return cache;
  const raw = read('hearts');
  // Un registro corrupto con `lastAccrualRealMs` en 0 produce un delta de 1.7e12 ms. La inicialización
  // ausente no es un detalle: es la diferencia entre "empieza lleno" y "empieza lleno por accidente".
  if (raw === null) {
    cache = initialHearts(s, cfg);
    return cache;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      cache = initialHearts(s, cfg);
      return cache;
    }
    const record: Record<string, unknown> = { ...parsed };
    const unlimited = record['unlimitedUntilRealMs'];
    cache = {
      hearts: Math.min(cfg.maxHearts, Math.max(0, num(record, 'hearts', cfg.maxHearts))),
      lastAccrualRealMs: num(record, 'lastAccrualRealMs', s.realMs),
      lastAccrualMonoMs: num(record, 'lastAccrualMonoMs', s.monoMs),
      // La época NO se persiste con valor útil: si se rehidratara igual, dos pestañas se creerían la misma
      // carga de documento y el monótono de una mediría contra el de la otra.
      monoEpochId: '',
      unlimitedUntilRealMs:
        typeof unlimited === 'number' && Number.isFinite(unlimited) ? unlimited : null,
      untrustedGranted: Math.max(0, num(record, 'untrustedGranted', 0)),
    };
    return cache;
  } catch {
    cache = initialHearts(s, cfg);
    return cache;
  }
}

function persist(record: HeartsRecord): void {
  // La época viva jamás toca el almacenamiento.
  const { monoEpochId: _epoch, ...rest } = record;
  void _epoch;
  write('hearts', JSON.stringify(rest));
}

/** Despacha un evento contra UNA sola muestra y publica el resultado. */
export function dispatchHearts(econ: EconomyConfig, event: HeartsEvent): HeartsRecord {
  const cfg = configFrom(econ);
  const s = sampleNow();
  const before = load(cfg, s);
  const after = reduceHearts(before, event, s, cfg);
  cache = after;
  // Escribir solo cuando algo cambió: un `tick` que no otorga no debe tocar el almacenamiento.
  if (
    after.hearts !== before.hearts ||
    after.lastAccrualRealMs !== before.lastAccrualRealMs ||
    after.unlimitedUntilRealMs !== before.unlimitedUntilRealMs ||
    after.untrustedGranted !== before.untrustedGranted
  ) {
    persist(after);
    for (const fn of listeners) fn();
  }
  return after;
}

export function snapshot(econ: EconomyConfig): HeartsSnapshot {
  const cfg = configFrom(econ);
  const s = sampleNow();
  const record = dispatchHearts(econ, { type: 'tick' });
  const unlimited = isUnlimited(record, s);
  const until = msUntilNextHeart(record, s, cfg);
  return {
    enabled: cfg.maxHearts > 0,
    current: unlimited ? cfg.maxHearts : record.hearts,
    max: cfg.maxHearts,
    nextRefillAtRealMs: until === null ? null : s.realMs + until,
    unlimited,
  };
}

export function spendHeart(econ: EconomyConfig): void {
  dispatchHearts(econ, { type: 'spend' });
}

export function refillAll(econ: EconomyConfig): void {
  dispatchHearts(econ, { type: 'refillAll' });
}

export function grantUnlimited(econ: EconomyConfig, hours: number): void {
  dispatchHearts(econ, { type: 'grantUnlimited', hours });
}

export function subscribeHearts(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Solo para pruebas: el registro es estado de módulo. */
export function resetHeartsForTests(record: HeartsRecord | null): void {
  cache = record;
}
