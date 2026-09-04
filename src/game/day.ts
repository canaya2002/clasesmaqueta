/**
 * Aritmética de calendario SIN `Date`.
 *
 * `src/game/**` no puede importar el reloj —el "hoy" entra como argumento— y `new Date` está prohibido por
 * lint fuera de los archivos dueños del tiempo. Pero el fold necesita contar huecos entre dos claves de día
 * para saber si una racha se rompió, y "restar dos cadenas YYYY-MM-DD" no es una resta.
 *
 * El algoritmo es el de Howard Hinnant (`days_from_civil`): exacto para todo el rango del calendario
 * gregoriano proléptico, sin tablas y sin bisiestos escritos a mano. Marzo como primer mes del año interno
 * es lo que hace que el 29 de febrero caiga al final y desaparezca el caso especial.
 */

export interface Civil {
  readonly y: number;
  readonly m: number;
  readonly d: number;
}

export function parseDayKey(key: string): Civil | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (m === null) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export function daysFromCivil({ y, m, d }: Civil): number {
  const year = y - (m <= 2 ? 1 : 0);
  const era = Math.floor(year / 400);
  const yoe = year - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/**
 * La inversa: del ordinal absoluto a la fecha civil.
 *
 * Existe para no llamar a `new Date` fuera de los archivos dueños del reloj —está prohibido por lint— y
 * para que dibujar 120 celdas de heatmap no cueste 120 objetos `Date` por render.
 */
export function civilFromDays(z: number): Civil {
  const shifted = z + 719468;
  const era = Math.floor(shifted / 146097);
  const doe = shifted - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: y + (m <= 2 ? 1 : 0), m, d };
}

export function dayKeyFromEpochDay(z: number): string {
  const { y, m, d } = civilFromDays(z);
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Ordinal absoluto del día, o `null` si la clave no es una fecha. */
export function epochDayOf(key: string): number | null {
  const civil = parseDayKey(key);
  return civil === null ? null : daysFromCivil(civil);
}
