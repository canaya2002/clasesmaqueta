/**
 * Analítica.
 *
 * Todo sale del MISMO bitset que alimenta el heatmap de un alumno. El agregado y el detalle no pueden
 * divergir porque son la misma construcción: es la propiedad que hace que, cuando el comprador filtre por
 * cohorte y sume la columna, el número cuadre.
 */

import { HISTORY_DAYS } from '@/lib/clock';
import { activeInWindow, retention, type RetentionPoint } from '../activity';
import { boot } from '../db';
import { transport, ok, type RepoError, type Result } from './transport';

export interface Kpis {
  readonly dau: number;
  readonly wau: number;
  readonly mau: number;
  readonly enrolled: number;
  readonly withStreak7: number;
  readonly withStreak30: number;
}

export function kpis(): Promise<Result<Kpis, RepoError>> {
  return transport('analytics.kpis', 'network', () => {
    const w = boot();
    const streaks = w.activity.currentStreak;
    let s7 = 0;
    let s30 = 0;
    for (const s of streaks) {
      if (s >= 7) s7 += 1;
      if (s >= 30) s30 += 1;
    }
    return ok({
      dau: w.activity.dau[HISTORY_DAYS - 1] ?? 0,
      wau: activeInWindow(w.activity, HISTORY_DAYS - 7, HISTORY_DAYS - 1),
      mau: activeInWindow(w.activity, HISTORY_DAYS - 30, HISTORY_DAYS - 1),
      enrolled: w.users.users.length,
      withStreak7: s7,
      withStreak30: s30,
    });
  });
}

export function dailyActive(): Promise<Result<readonly number[], RepoError>> {
  return transport('analytics.dailyActive', 'network', () => ok([...boot().activity.dau]));
}

export function retentionCurve(joinDay: number): Promise<Result<readonly RetentionPoint[], RepoError>> {
  return transport(`analytics.retention:${String(joinDay)}`, 'network', () => {
    const w = boot();
    return ok([1, 7, 30].map((k) => retention(w.activity, joinDay, k)));
  });
}
