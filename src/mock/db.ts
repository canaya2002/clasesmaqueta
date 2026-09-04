'use client';

/**
 * SENDA — el mundo en memoria.
 *
 * **El mundo se REGENERA desde la semilla en cada arranque.** `localStorage` guarda solo el registro de
 * mutaciones. La razón buena no es el presupuesto de cuota: es que `isActive` y los agregados salen de la
 * MISMA construcción, así que el dashboard y el drawer de un alumno no pueden divergir. Con dos caminos
 * separados —números bonitos arriba, datos aleatorios abajo—, en la primera demo alguien filtra por cohorte,
 * suma la columna y no cuadra.
 *
 * Este módulo es CLIENT-ONLY. Estado de módulo en un componente de servidor se comparte entre peticiones, y
 * el síntoma —el segundo visitante ve la racha del primero— solo aparece en producción con dos usuarios
 * reales, es decir, en la sala de venta.
 */

import { buildActivityIndex, type ActivityIndex } from './activity';
import { materializeAll } from './content';
import { buildSearchIndex, buildUsers, type SearchIndex, type UserSlice } from './seed';
import { COHORTS } from './fixtures/org';
import type { Course } from '@/content/engine/schema';

export interface World {
  readonly users: UserSlice;
  readonly search: SearchIndex;
  readonly activity: ActivityIndex;
  readonly courses: readonly Course[];
  readonly bootMs: number;
  readonly cohorts: typeof COHORTS;
}

let world: World | null = null;

export interface BootReport {
  readonly totalMs: number;
  readonly parts: Readonly<Record<string, number>>;
  /** El presupuesto es duro: por encima se escribe un aviso visible en vez de degradar en silencio. */
  readonly overBudget: boolean;
}

export const BOOT_BUDGET_MS = 50;

let lastReport: BootReport | null = null;

export function boot(): World {
  if (world !== null) return world;

  const t0 = nowMs();
  const activity = buildActivityIndex();
  const tActivity = nowMs();
  const users = buildUsers();
  const tUsers = nowMs();
  const search = buildSearchIndex(users.users);
  const tSearch = nowMs();
  const courses = materializeAll();
  const tContent = nowMs();

  const totalMs = tContent - t0;
  lastReport = {
    totalMs,
    parts: {
      actividad: +(tActivity - t0).toFixed(2),
      usuarios: +(tUsers - tActivity).toFixed(2),
      busqueda: +(tSearch - tUsers).toFixed(2),
      contenido: +(tContent - tSearch).toFixed(2),
    },
    overBudget: totalMs > BOOT_BUDGET_MS,
  };

  world = { users, search, activity, courses, bootMs: totalMs, cohorts: COHORTS };
  return world;
}

export function bootReport(): BootReport | null {
  return lastReport;
}

export function resetWorld(): void {
  world = null;
  lastReport = null;
}

/* eslint-disable-next-line no-restricted-syntax -- medir el arranque es la razón del presupuesto */
const nowMs = (): number => (typeof performance === 'undefined' ? 0 : performance.now());
