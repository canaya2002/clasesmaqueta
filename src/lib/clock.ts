/**
 * SENDA — la única fuente de tiempo. `Date.now`, `new Date` y `performance.now` están PROHIBIDOS fuera de
 * este archivo por `eslint.config.mjs`.
 *
 * Hay TRES relojes, y la razón de que sean tres es concreta:
 *
 * - `now()` es el reloj ANCLADO y deslizante. Lo usan racha, ligas, heatmap, misiones y la publicación
 *   programada. La demo debe verse "de hoy" y a la vez ser reproducible, así que el contenido usa una
 *   semilla fija y el tiempo un ancla persistida que avanza por días COMPLETOS. Avanzar por días completos
 *   y no por milisegundos es lo que mantiene intacta la estacionalidad de fin de semana.
 * - `nowReal()` es el reloj de pared sin ancla. Lo usan los corazones, los potenciadores de 24h y la
 *   expiración de la sesión suspendida. Si colgaran del ancla, "Re-anclar demo a hoy" regalaría vidas.
 * - `mono()` es monótono dentro de la pestaña. La recarga de corazones lo usa mientras el documento vive;
 *   entre recargas cae al reloj de pared. Si colgara solo del reloj de pared, adelantar el reloj del Mac
 *   —lo primero que hace alguien inspeccionando una maqueta de gamificación— regalaría vidas igual.
 */

import { brand, type Branded } from './brand';

export type DayIndex = Branded<number, 'DayIndex'>;

export const MS_PER_DAY = 86_400_000;

/** Ventana histórica de la demo. */
export const HISTORY_DAYS = 120;

/** Zonas de oficina. La frontera de día NO es la del navegador: es la de la oficina del usuario. */
export type OfficeZone = 'America/Mexico_City' | 'America/Chicago' | 'America/Phoenix';

/**
 * El día del usuario termina a las 04:00, no a medianoche.
 *
 * Con oficinas en dos países y reglas de horario de verano divergentes, la medianoche local del dispositivo
 * rompe la racha de gente que trabaja de noche y desincroniza las misiones diarias entre oficinas. La MISMA
 * frontera gobierna racha, misiones y semana de liga (lunes 04:00). Se declara en /ajustes.
 */
export const DAY_START_HOUR = 4;

interface ClockState {
  /** Medianoche local del "hoy" de la demo, ya deslizada. */
  anchorMs: number;
  /** Identidad de la época monótona: cambia en cada carga de documento. */
  monoEpochId: string;
  monoOrigin: number;
}

const state: ClockState = {
  anchorMs: 0,
  monoEpochId: '',
  monoOrigin: 0,
};

let initialized = false;

function wallNow(): number {
  return Date.now();
}

function monotonicNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function midnightOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface ClockInit {
  /** Ancla persistida, o `null` en el primer arranque. */
  readonly storedAnchorMs: number | null;
  /** Semilla del id de época monótona: se pasa para no llamar a `Math.random` (prohibido por lint). */
  readonly epochSeed: string;
}

export interface ClockDrift {
  readonly anchorMs: number;
  readonly driftDays: number;
  /** `true` si el reloj del sistema fue movido hacia atrás respecto al ancla. */
  readonly wentBackwards: boolean;
  /** `true` si la deriva es tan grande que se re-ancló en vez de deslizar. */
  readonly reanchored: boolean;
}

/** Deriva máxima que se desliza. Por encima, se re-ancla: una máquina en 2030 no debe deslizar 4 años. */
export const MAX_DRIFT_DAYS = 400;

/**
 * Semilla de época monótona para esta carga de documento.
 *
 * `crypto.getRandomValues` y no `Math.random` —prohibido por lint— ni un contador: dos pestañas abiertas a
 * la vez tienen que verse como épocas DISTINTAS, o el reloj monótono de una se compararía contra el origen
 * de la otra. Un contador determinista les daría el mismo valor.
 */
export function newEpochSeed(): string {
  const buf = new Uint32Array(2);
  globalThis.crypto.getRandomValues(buf);
  return `e${(buf[0] ?? 0).toString(36)}${(buf[1] ?? 0).toString(36)}`;
}

export function initClock(init: ClockInit): ClockDrift {
  // Una época vacía es indistinguible de "sin inicializar", y `mock/hearts.ts` usa exactamente la cadena
  // vacía como centinela de "este registro viene del almacenamiento". Si las dos coinciden, un registro
  // rehidratado se cree de la MISMA carga de documento y el reloj monótono se compara contra un origen de
  // otra sesión: los corazones vuelven a ser vulnerables al reloj del sistema, que es justo lo que la
  // Fase 4 fue a resolver.
  if (init.epochSeed === '') throw new Error('initClock: `epochSeed` no puede ser la cadena vacía.');

  const todayMidnight = midnightOf(wallNow());
  state.monoEpochId = init.epochSeed;
  state.monoOrigin = monotonicNow();
  initialized = true;

  if (init.storedAnchorMs === null) {
    state.anchorMs = todayMidnight;
    return { anchorMs: todayMidnight, driftDays: 0, wentBackwards: false, reanchored: false };
  }

  const rawDrift = Math.round((todayMidnight - init.storedAnchorMs) / MS_PER_DAY);

  // Reloj del sistema movido hacia atrás: el ancla quedaría en el futuro y `toDayIndex` devolvería null,
  // así que el heatmap y la racha aparecerían vacíos. Se re-ancla a hoy y se reporta.
  if (rawDrift < 0) {
    state.anchorMs = todayMidnight;
    return { anchorMs: todayMidnight, driftDays: 0, wentBackwards: true, reanchored: true };
  }

  if (rawDrift > MAX_DRIFT_DAYS) {
    state.anchorMs = todayMidnight;
    return { anchorMs: todayMidnight, driftDays: rawDrift, wentBackwards: false, reanchored: true };
  }

  // Re-normalizar a medianoche LOCAL después de deslizar. Sumar múltiplos exactos de 86.400.000 ms
  // atraviesa el cambio de horario —el día del cambio dura 23 o 25 horas— y deja el ancla corrida una hora
  // para siempre. En Houston y Chicago eso basta para que `toDayIndex(hoy)` devuelva 118 en vez de 119 y
  // el heatmap pierda la columna de hoy. Las tres oficinas cruzan cambio de horario.
  state.anchorMs = midnightOf(init.storedAnchorMs + rawDrift * MS_PER_DAY);
  return { anchorMs: state.anchorMs, driftDays: rawDrift, wentBackwards: false, reanchored: false };
}

function assertInit(): void {
  if (!initialized) {
    throw new Error(
      'clock.ts no inicializado: llama initClock() en el arranque del cliente antes de leer el tiempo.',
    );
  }
}

/** El reloj anclado. Avanza como el de pared, pero su "hoy" es el día del ancla. */
export function now(): number {
  assertInit();
  return state.anchorMs + (wallNow() - midnightOf(wallNow()));
}

/** El reloj de pared, sin ancla. Corazones, potenciadores y expiración de sesión. */
export function nowReal(): number {
  return wallNow();
}

/** Monótono dentro de la pestaña. Inmune a que muevan el reloj del sistema. */
export function mono(): number {
  return monotonicNow() - state.monoOrigin;
}

/**
 * Cambia en cada carga de documento: si no coincide con el persistido, hubo recarga.
 *
 * Exige inicialización igual que `now()`. Sin el `assertInit`, olvidar `initClock()` en el arranque no
 * fallaba: devolvía la cadena vacía en silencio, que es el mismo valor con el que se rehidrata un registro
 * de corazones. Un centinela que coincide con el valor real es peor que no tener centinela.
 */
export function monoEpochId(): string {
  assertInit();
  return state.monoEpochId;
}

export function anchorMs(): number {
  assertInit();
  return state.anchorMs;
}

/** Índice de día dentro de la ventana histórica: 0 = el más antiguo, HISTORY_DAYS-1 = hoy. */
export function toDayIndex(ms: number): DayIndex | null {
  assertInit();
  const days = Math.floor((midnightOf(ms) - state.anchorMs) / MS_PER_DAY) + (HISTORY_DAYS - 1);
  if (days < 0 || days > HISTORY_DAYS - 1) return null;
  return brand<number, 'DayIndex'>(days);
}

export function dayIndexToMs(day: DayIndex): number {
  assertInit();
  return state.anchorMs - (HISTORY_DAYS - 1 - day) * MS_PER_DAY;
}

/**
 * Hoy es SIEMPRE la última columna: el ancla se desliza, la rejilla no.
 *
 * Por eso este valor es una constante, y por eso NO se puede congelar en ningún dato persistido. Un evento
 * que guarde `todayIndex()` guarda 119 hoy y sigue significando "hoy" mañana: una racha comparada así no se
 * puede romper nunca. Lo que se persiste es tiempo absoluto (`nowReal()`), y el índice se deriva al leer.
 */
export function todayIndex(): DayIndex {
  return brand<number, 'DayIndex'>(HISTORY_DAYS - 1);
}

/**
 * El ordinal ABSOLUTO de una columna del heatmap, contado desde la época Unix.
 *
 * Es lo que hace falta para sembrar contenido determinista por día. Sembrar con el índice RELATIVO —0 a
 * 119— parece equivalente y no lo es: el ancla se desliza una columna cada medianoche, así que la misma
 * fecha real pasa de la columna `d` a la `d-1` y saca otro número. La historia entera de los 1,247
 * usuarios se vuelve a tirar cada noche: la racha de 23 días que se enseñó ayer es otra hoy, y el heatmap
 * es otro dibujo. Con el ordinal absoluto, la fecha real conserva su sorteo.
 */
export function orgEpochDay(day: DayIndex): number {
  assertInit();
  return Math.round(dayIndexToMs(day) / MS_PER_DAY);
}

/** Milisegundos hasta el próximo cruce de día en esa zona. Para re-derivar la racha sin recargar. */
export function msUntilNextDayStart(ms: number, zone: OfficeZone): number {
  const key = dayKeyInZone(ms, zone);
  let probe = ms + 3_600_000;
  // Como mucho 25 saltos de una hora: un día dura 23, 24 o 25 horas según el cambio de horario.
  for (let i = 0; i < 26; i += 1) {
    if (dayKeyInZone(probe, zone) !== key) {
      // Afinado al minuto dentro de la hora que cruza.
      let lo = probe - 3_600_000;
      for (let m = 0; m < 60; m += 1) {
        if (dayKeyInZone(lo + 60_000, zone) !== key) return Math.max(0, lo + 60_000 - ms);
        lo += 60_000;
      }
      return Math.max(0, probe - ms);
    }
    probe += 3_600_000;
  }
  return MS_PER_DAY;
}

const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Día del calendario en la zona de la OFICINA, desplazado a las 04:00.
 *
 * El `Map` de formateadores no es una micro-optimización: construir un `Intl.DateTimeFormat` cuesta ~0.3ms,
 * y el calendario mensual más el heatmap de 120 días crearían cientos por render y tirarían el frame.
 */
export function dayKeyInZone(ms: number, zone: OfficeZone): string {
  let fmt = zoneFormatters.get(zone);
  if (fmt === undefined) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    zoneFormatters.set(zone, fmt);
  }
  return fmt.format(new Date(ms - DAY_START_HOUR * 3_600_000));
}

/** Para tests: congela el estado y lo restaura, sin fake timers globales que compartan estado. */
export function withClock<T>(anchor: number, fn: () => T): T {
  const prevAnchor = state.anchorMs;
  const prevInit = initialized;
  state.anchorMs = anchor;
  initialized = true;
  try {
    return fn();
  } finally {
    state.anchorMs = prevAnchor;
    initialized = prevInit;
  }
}
