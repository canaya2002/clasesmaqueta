/**
 * SENDA — actividad histórica de 1,247 usuarios × 120 días.
 *
 * DOS CORRECCIONES DE FONDO respecto al diseño original, las dos señaladas por revisión adversarial:
 *
 * 1. **No es i.i.d. por día: es una cadena de Markov por usuario con estado absorbente.**
 *    Con `isActive(u,d) = u01(hash) < p·s` los días son independientes, y eso destruye las rachas:
 *    con p·s ≈ 0.35, P(racha vigente de 7 días) = 0.35^7 = 6.4e-4, o sea 0.8 usuarios de 1,247. En una app
 *    cuyo gancho emocional es la racha, el tablero toparía en 11 días y la mediana sería 4: la demo no
 *    podría enseñar su propia mecánica central. Una cadena con persistencia, resurrección y abandono
 *    absorbente produce rachas reales y cuesta lo mismo, porque el build ya recorre fila por usuario.
 *
 * 2. **Nada depende del ROSTER VIGENTE.**
 *    Un solver global de `scale[d]` que despeja contra Σp del roster actual acopla a todos: desactivar al
 *    usuario 812 mueve s_d y flipea ~120 celdas de OTROS usuarios, lo que falsifica la propiedad estrella
 *    del diseño ("crear el usuario 1248 no altera un bit"). Aquí los parámetros de cada usuario salen solo
 *    de su ordinal, y la estacionalidad es una tabla FIJA. El DAU resultante se parece al objetivo porque
 *    los parámetros se calibraron una vez, no porque se resuelva en cada arranque.
 */

import { mix32, u01 } from '@/lib/rng';
import { HISTORY_DAYS, orgEpochDay } from '@/lib/clock';
import { brand } from '@/lib/brand';

export const USER_COUNT = 1247;
const WORDS_PER_USER = Math.ceil(HISTORY_DAYS / 32); // 4
const WORDS_PER_DAY = Math.ceil(USER_COUNT / 32); // 39

/** Espacios de nombres del RNG. Separarlos evita que dos fan-outs compartan flujo por accidente. */
export const NS = {
  join: 0x5e11d001,
  persistence: 0x5e11d002,
  revival: 0x5e11d003,
  churn: 0x5e11d004,
  daily: 0x5e11d005,
  profile: 0x5e11d006,
} as const;

/**
 * Estacionalidad por día de la semana REAL, indexada de lunes a domingo.
 *
 * Decía "el día 0 de la ventana es un lunes por construcción del ancla" y era falso: el ancla es la
 * medianoche de HOY, sea martes o sábado. Con `d % 7` el hundimiento de fin de semana caía en dos días
 * arbitrarios y se movía uno cada noche — una gráfica de DAU cuyo valle no estaba en el fin de semana, en
 * una demo para un despacho que sabe perfectamente cómo se ve su propia semana.
 *
 * Fin de semana hundido, viernes flojo: es una plantilla corporativa, no una app de consumo.
 */
const WEEKDAY_FACTOR: readonly number[] = [1.12, 1.15, 1.1, 1.05, 0.82, 0.34, 0.28];

/**
 * Día de la semana con el lunes en 0, a partir del ordinal absoluto desde la época Unix.
 *
 * El 1 de enero de 1970 fue jueves, así que el desplazamiento es 3. Se calcula con aritmética y no con
 * `new Date().getDay()` porque `new Date` está prohibido por lint fuera de los archivos dueños del reloj,
 * y porque un `Date` por usuario y día son 149,640 objetos en el arranque.
 */
function weekdayMon0(absDay: number): number {
  return (((absDay + 3) % 7) + 7) % 7;
}

/**
 * El sorteo de abandono, PURO en el día absoluto.
 *
 * La corrección no es que sea aleatorio —siempre lo fue—, es que antes se sorteaba SOLO en los días
 * inactivos, así que dependía del camino. Bastaba con que la ventana empezara un día antes para que
 * alguien abandonara en otra fecha, y como el abandono es un estado ABSORBENTE, la cadena no lo olvidaba
 * nunca: por eso el 6% de divergencia que medí no decaía con el tiempo.
 *
 * Ahora se tira todos los días y solo depende de `(usuario, día absoluto)`. Va dentro del mismo bucle y no
 * en una pasada aparte: la pasada aparte costaba hasta 120 iteraciones más por usuario y sacó el arranque
 * del presupuesto de 50 ms —lo cazó la prueba de presupuesto, que para eso está—.
 */
function churnsOn(ordinal: number, hazard: number, absDay: number): boolean {
  return hazard > 0 && u01(mix32(NS.churn, ordinal, absDay)) < hazard;
}

/** Dos campañas de Recursos Humanos. Fijas: no dependen de cuánta gente haya en el roster. */
function campaignBoost(day: number): number {
  if (day >= 54 && day <= 60) return 1.35;
  if (day >= 96 && day <= 100) return 1.28;
  return 1;
}

/** Adopción: la plantilla no entra toda el día 0. */
function joinDay(ordinal: number): number {
  const r = u01(mix32(NS.join, ordinal, 0));
  // Curva de adopción: la mitad en las primeras tres semanas, cola larga.
  return Math.floor(HISTORY_DAYS * (1 - Math.pow(1 - r, 2.6)) * 0.55);
}

export interface UserActivityParams {
  readonly joinDay: number;
  /** P(activo hoy | activo ayer). Alta = rachas largas. */
  readonly persistence: number;
  /** P(activo hoy | inactivo ayer). Baja = huecos que rompen la racha. */
  readonly revival: number;
  /** Probabilidad diaria de abandonar definitivamente. Estado ABSORBENTE. */
  readonly churnHazard: number;
  /**
   * Cuánto le pega el fin de semana a quien YA viene encadenando.
   *
   * Esta es la corrección que hace que el modelo produzca rachas de verdad. Aplicar el factor de
   * estacionalidad por igual a la persistencia y a la resurrección es lo que mata toda racha: con un
   * sábado a 0.34, hasta el usuario más constante (0.86) cae a 0.29 y se rompe. Y es empíricamente falso:
   * el factor de fin de semana es un promedio de POBLACIÓN, no una ley por persona. Quien lleva veinte
   * días seguidos entra el sábado — eso es exactamente lo que la mecánica de racha provoca. A quien ya
   * está inactivo, en cambio, el fin de semana sí le cuesta volver.
   */
  readonly weekendSensitivity: number;
}

export function paramsFor(ordinal: number): UserActivityParams {
  const p = u01(mix32(NS.persistence, ordinal, 0));
  const r = u01(mix32(NS.revival, ordinal, 0));
  const c = u01(mix32(NS.churn, ordinal, 0));

  // Cuatro poblaciones, no tres. La cuarta —los devotos, 6% de la plantilla— es la que sostiene el
  // tablero de rachas y la que hace que congeladores e hitos de 30 días signifiquen algo.
  const persistence = p < 0.06 ? 0.985 : p < 0.26 ? 0.93 : p < 0.62 ? 0.68 : 0.36;
  return {
    joinDay: joinDay(ordinal),
    persistence,
    revival: 0.05 + r * 0.14,
    // La mayoría no abandona; una cola sí. Sin esto no hay retención que medir.
    churnHazard: c < 0.72 ? 0 : 0.0015 + (c - 0.72) * 0.01,
    // Cuanto más constante el usuario, menos le pesa el fin de semana.
    weekendSensitivity: persistence > 0.9 ? 0.12 : persistence > 0.6 ? 0.45 : 0.85,
  };
}

export interface ActivityIndex {
  /** Bit d del usuario u. 4 palabras por usuario. */
  readonly byUser: Uint32Array;
  /** La transpuesta: bit u del día d. 39 palabras por día. */
  readonly byDay: Uint32Array;
  readonly dau: Uint16Array;
  /** Racha vigente al día de hoy, por ordinal. Se calcula en la misma pasada. */
  readonly currentStreak: Uint16Array;
  readonly bestStreak: Uint16Array;
  readonly churnedAt: Int16Array;
  readonly buildMs: number;
}

/**
 * Construye el índice en UNA pasada por usuario.
 *
 * El bitset dual es el único índice analítico: DAU es lectura directa, WAU/MAU son OR de columnas y la
 * retención Dk es AND con máscara de cohorte. Pagar 39 KB por tener las dos orientaciones es una decisión
 * de índice de base de datos aplicada a una maqueta — y es lo que permite prometer 60 fps con filtros
 * facetados en vivo.
 */
export function buildActivityIndex(): ActivityIndex {
  const t0 = nowMs();
  const byUser = new Uint32Array(USER_COUNT * WORDS_PER_USER);
  const byDay = new Uint32Array(HISTORY_DAYS * WORDS_PER_DAY);
  const dau = new Uint16Array(HISTORY_DAYS);
  const currentStreak = new Uint16Array(USER_COUNT);
  const bestStreak = new Uint16Array(USER_COUNT);
  const churnedAt = new Int16Array(USER_COUNT).fill(-1);

  const absToday = orgEpochDay(brand<number, 'DayIndex'>(HISTORY_DAYS - 1));
  const absFirst = absToday - (HISTORY_DAYS - 1);

  for (let u = 0; u < USER_COUNT; u += 1) {
    const p = paramsFor(u);
    let churned = false;
    let active = false;
    let run = 0;
    let best = 0;

    for (let d = 0; d < HISTORY_DAYS; d += 1) {
      const abs = absFirst + d;
      if (d < p.joinDay || churned) {
        run = 0;
        continue;
      }
      if (churnsOn(u, p.churnHazard, abs)) {
        churned = true;
        churnedAt[u] = d;
        run = 0;
        continue;
      }

      const seasonal = (WEEKDAY_FACTOR[weekdayMon0(abs)] ?? 1) * campaignBoost(d);
      // La estacionalidad se aplica ENTERA a la resurrección y AMORTIGUADA a la persistencia.
      const pActive: number = active
        ? Math.min(0.995, p.persistence * (1 - (1 - seasonal) * p.weekendSensitivity))
        : Math.min(0.9, p.revival * seasonal);
      // Sembrado por día ABSOLUTO, no por el índice relativo de la columna. El ancla se desliza una
      // columna cada medianoche: con `d`, la misma fecha real saca otro número al día siguiente y los 120
      // días de historia de los 1,247 usuarios se vuelven a tirar enteros. La demo dejaría de ser la misma
      // demo entre una sesión de la tarde y otra de la mañana siguiente.
      const roll = u01(mix32(NS.daily, u, abs));
      active = roll < pActive;

      if (active) {
        const iUser = u * WORDS_PER_USER + (d >>> 5);
        // Asignación compuesta sobre un TypedArray: bajo noUncheckedIndexedAccess el operando izquierdo
        // TAMBIÉN se lee, así que `|=` a secas es un error de tipos que es fácil pasar por alto.
        byUser[iUser] = (byUser[iUser] ?? 0) | (1 << (d & 31));
        const iDay = d * WORDS_PER_DAY + (u >>> 5);
        byDay[iDay] = (byDay[iDay] ?? 0) | (1 << (u & 31));
        dau[d] = (dau[d] ?? 0) + 1;
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }

    currentStreak[u] = run;
    bestStreak[u] = best;
  }

  return { byUser, byDay, dau, currentStreak, bestStreak, churnedAt, buildMs: nowMs() - t0 };
}

/* ------------------------------------------------------------------ consultas */

function popcount(x: number): number {
  let v = x - ((x >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  v = (v + (v >>> 4)) & 0x0f0f0f0f;
  return (Math.imul(v, 0x01010101) >>> 24) & 0x3f;
}

export function wasActive(index: ActivityIndex, ordinal: number, day: number): boolean {
  const word = index.byUser[ordinal * WORDS_PER_USER + (day >>> 5)] ?? 0;
  return (word & (1 << (day & 31))) !== 0;
}

/** El heatmap de un alumno: 4 palabras, no 120 llamadas. */
export function userHeatmap(index: ActivityIndex, ordinal: number): Uint8Array {
  const out = new Uint8Array(HISTORY_DAYS);
  for (let d = 0; d < HISTORY_DAYS; d += 1) out[d] = wasActive(index, ordinal, d) ? 1 : 0;
  return out;
}

/** Usuarios activos en una ventana: OR de columnas y popcount. */
export function activeInWindow(index: ActivityIndex, fromDay: number, toDay: number): number {
  const acc = new Uint32Array(WORDS_PER_DAY);
  for (let d = Math.max(0, fromDay); d <= Math.min(HISTORY_DAYS - 1, toDay); d += 1) {
    for (let w = 0; w < WORDS_PER_DAY; w += 1) {
      acc[w] = (acc[w] ?? 0) | (index.byDay[d * WORDS_PER_DAY + w] ?? 0);
    }
  }
  let total = 0;
  for (let w = 0; w < WORDS_PER_DAY; w += 1) total += popcount(acc[w] ?? 0);
  return total;
}

export interface RetentionPoint {
  readonly day: number;
  /** `null` cuando la cohorte todavía no cumple k días: pintar 0% sería mentir. */
  readonly rate: number | null;
  readonly cohortSize: number;
}

/**
 * Retención Dk de la cohorte que se unió el día `joinDayIndex`.
 *
 * Devuelve `null` en vez de 0 cuando la ventana aún no alcanza: una cohorte que ingresó hace 3 días no
 * tiene retención D7, y pintar 0% es un dato falso que en un dashboard nadie cuestiona.
 */
export function retention(index: ActivityIndex, joinDayIndex: number, k: number): RetentionPoint {
  const target = joinDayIndex + k;
  const cohort: number[] = [];
  for (let u = 0; u < USER_COUNT; u += 1) {
    if (paramsFor(u).joinDay === joinDayIndex) cohort.push(u);
  }
  if (cohort.length === 0) return { day: k, rate: null, cohortSize: 0 };
  if (target > HISTORY_DAYS - 1) return { day: k, rate: null, cohortSize: cohort.length };

  let retained = 0;
  for (const u of cohort) if (wasActive(index, u, target)) retained += 1;
  return { day: k, rate: retained / cohort.length, cohortSize: cohort.length };
}

/* eslint-disable-next-line no-restricted-syntax -- medir el propio arranque es la razón del presupuesto */
const nowMs = (): number => (typeof performance === 'undefined' ? 0 : performance.now());

export { WORDS_PER_DAY, WORDS_PER_USER };
