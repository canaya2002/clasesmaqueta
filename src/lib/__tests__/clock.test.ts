/**
 * El reloj anclado, y las tres formas en que se rompió sin que nadie lo notara.
 */

import { describe, expect, it } from 'vitest';
import {
  HISTORY_DAYS,
  MS_PER_DAY,
  initClock,
  msUntilNextDayStart,
  orgEpochDay,
  todayIndex,
  dayKeyInZone,
  withClock,
} from '../clock';
import { buildActivityIndex, userHeatmap } from '@/mock/activity';
import { brand } from '@/lib/brand';

function localMidnight(offsetDays: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() + offsetDays * MS_PER_DAY;
}

describe('el ancla', () => {
  it('queda en medianoche LOCAL aunque el deslizamiento cruce un cambio de horario', () => {
    // El día del cambio de horario dura 23 o 25 horas. Sumar múltiplos exactos de 86.400.000 ms deja el
    // ancla corrida una hora PARA SIEMPRE, y con ella `toDayIndex(hoy)` devuelve 118 en vez de 119: el
    // heatmap pierde la columna de hoy. Se simula pasando un ancla ya desplazada una hora.
    const drift = initClock({ storedAnchorMs: localMidnight(-30) + 3_600_000, epochSeed: 'dst' });
    const d = new Date(drift.anchorMs);
    expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0, 0]);
  });

  it('rechaza una época monótona vacía', () => {
    // La cadena vacía es el centinela de "registro rehidratado" en mock/hearts.ts. Si además pudiera ser
    // una época viva, un registro del almacenamiento se creería de esta misma carga de documento y el
    // reloj monótono se compararía contra el origen de otra sesión.
    expect(() => initClock({ storedAnchorMs: null, epochSeed: '' })).toThrow(/epochSeed/);
  });

  it('hoy es siempre la última columna', () => {
    expect(todayIndex()).toBe(HISTORY_DAYS - 1);
  });
});

describe('sembrado por día absoluto', () => {
  it('deslizar el ancla un día NO vuelve a tirar la historia', () => {
    // La propiedad que sostiene la demo: la sesión de la tarde y la de la mañana siguiente enseñan la
    // MISMA historia. Con sembrado por índice relativo, la misma fecha real pasa de la columna `d` a la
    // `d-1` y saca otro número: los 120 días de los 1,247 usuarios se vuelven a tirar cada medianoche.
    // `initClock` ancla SIEMPRE a la medianoche de hoy, así que llamarlo dos veces no simula nada: el
    // segundo día hay que moverlo con `withClock`, que es para lo que existe.
    const hoy = localMidnight(0);
    initClock({ storedAnchorMs: hoy, epochSeed: 'dia-1' });

    const before = withClock(hoy, () => [...userHeatmap(buildActivityIndex(), 7)]);
    // Mañana el ancla se desliza una columna: lo que hoy es el día `d+1` mañana es el día `d`.
    const after = withClock(hoy + MS_PER_DAY, () => [...userHeatmap(buildActivityIndex(), 7)]);

    // Las 119 columnas que ambas ventanas comparten tienen que coincidir, desplazadas una posición.
    expect(after.slice(0, HISTORY_DAYS - 1)).toEqual(before.slice(1));
  });

  it('el ordinal absoluto de dos columnas consecutivas difiere en uno', () => {
    initClock({ storedAnchorMs: localMidnight(-10), epochSeed: 'abs' });
    const a = orgEpochDay(brand<number, 'DayIndex'>(50));
    const b = orgEpochDay(brand<number, 'DayIndex'>(51));
    expect(b - a).toBe(1);
  });
});

describe('el cruce de día', () => {
  it('el siguiente cruce cae dentro de las próximas 25 horas y cambia la clave', () => {
    initClock({ storedAnchorMs: localMidnight(0), epochSeed: 'cruce' });
    const now = Date.now();
    const ms = msUntilNextDayStart(now, 'America/Mexico_City');
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(25 * 3_600_000);
    expect(dayKeyInZone(now + ms, 'America/Mexico_City')).not.toBe(
      dayKeyInZone(now, 'America/Mexico_City'),
    );
  });
});
