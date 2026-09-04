/**
 * SENDA — el LEDGER y el estado derivado. Los trece sistemas cuelgan de aquí.
 *
 * ## La regla que decide qué se congela y qué se deriva
 *
 * El contenido guarda `xpWeight`, no XP, para que mover la economía en el Studio mueva los números al
 * instante. Pero "derivarlo todo" rompe las gemas, y "congelarlo todo" rompe el criterio de aceptación. La
 * línea, escrita una vez:
 *
 * - **Se DERIVA lo que es monótono y no tiene cargos**: XP y nivel. Un total que solo sube se puede
 *   recalcular entero con la economía vigente sin contradecir nada de lo que el usuario ya vio.
 * - **Se CONGELA lo que participa en un SALDO**: gemas. Un saldo es créditos menos cargos, y re-tarifar
 *   los dos lados con factores distintos produce saldos negativos por compras que ya se hicieron. Ninguna
 *   economía re-tarifa una transacción cerrada.
 * - **Se congela también lo que hizo el USUARIO** —combo, reintentos, pista, acierto, tiempo— porque es un
 *   hecho histórico, no un precio.
 *
 * ## Lo que NUNCA entra en un evento
 *
 * `DayIndex`. Es una coordenada en una rejilla que se desliza una columna cada medianoche a propósito;
 * congelarla significa que el evento sigue diciendo "hoy" mañana, y una racha comparada así no se puede
 * romper jamás. Los eventos llevan tiempo ABSOLUTO (`atRealMs`) y la clave de día ya resuelta en la zona de
 * la oficina del usuario (`dayKey`), que es lo que `dayKeyInZone` produce aplicando `DAY_START_HOUR`.
 */

import type { Branded } from '@/lib/brand';
import type { EconomyConfig } from '@/content/engine/economy';
import type { BadgeId, LessonId, UnitId } from '@/content/engine/primitives';

/** `YYYY-MM-DD` en la zona de la oficina, con el corte de día a las 04:00. */
export type DayKey = Branded<string, 'DayKey'>;

/** `YYYY-Www` en la zona de la organización. La semana de liga. */
export type WeekKey = Branded<string, 'WeekKey'>;

export type GemSource = 'perfect-lesson' | 'quest' | 'level-up' | 'chest';

export type ShopItemId = 'heart-refill' | 'streak-freeze' | 'unlimited-hearts';

/**
 * Un hecho ocurrido. Append-only, nunca se reescribe.
 *
 * `seq` es el orden de escritura y desempata dos eventos del mismo milisegundo; `atRealMs` es el reloj de
 * pared REAL, no el anclado: re-anclar la demo a hoy no puede reordenar la historia.
 */
export interface LedgerBase {
  readonly seq: number;
  readonly atRealMs: number;
  readonly dayKey: DayKey;
}

export type LedgerEvent =
  | (LedgerBase & {
      readonly t: 'lesson-complete';
      readonly lessonId: LessonId;
      readonly unitId: UnitId;
      readonly difficulty: 1 | 2 | 3 | 4 | 5;
      /** El XP de pasos con el precio factorizado fuera. Ver `LessonResult.xpUnitsMilli`. */
      readonly xpUnitsMilli: number;
      /** Precisión de primeros intentos, en milésimas. Congelada: es conducta. */
      readonly accuracyMilli: number;
      readonly weightTotal: number;
      readonly perfect: boolean;
      readonly firstClear: boolean;
      readonly paceBonusEarned: boolean;
      readonly maxCombo: number;
      readonly elapsedMs: number;
      /** Gemas OTORGADAS, en firme. Ver la regla del saldo arriba. */
      readonly gemsGranted: number;
      /**
       * `false` cuando la sesión corrió en modo práctica sin corazones.
       *
       * Va en el evento y no se decide al leer: el modo se activa a mitad de lección, así que solo el
       * evento sabe bajo qué reglas se jugó. Reescribir el pasado al leer es lo que hace que una métrica
       * histórica cambie sola.
       */
      readonly countsForProgress: boolean;
    })
  | (LedgerBase & {
      readonly t: 'gems-granted';
      readonly source: GemSource;
      readonly amount: number;
    })
  | (LedgerBase & {
      readonly t: 'shop-purchase';
      readonly item: ShopItemId;
      /** El precio PAGADO. Bajar el precio en el Studio no reembolsa a nadie. */
      readonly pricePaid: number;
    })
  | (LedgerBase & {
      readonly t: 'quest-claimed';
      readonly questId: string;
      readonly gemsGranted: number;
    })
  | (LedgerBase & {
      readonly t: 'chest-opened';
      readonly tier: 1 | 2 | 3;
      readonly gemsGranted: number;
    })
  | (LedgerBase & {
      readonly t: 'league-enrolled';
      readonly weekKey: WeekKey;
      readonly division: number;
    })
  | (LedgerBase & {
      readonly t: 'badge-seen';
      readonly badgeId: BadgeId;
    });

/**
 * Los contadores derivados. Ninguno se persiste.
 *
 * `gems` es la única entrada que puede BAJAR, y por eso vive fuera del subconjunto que las insignias
 * pueden mirar: una insignia de "1,000 gemas" que se revoca al comprar un congelador es una insignia rota.
 */
export interface Basis {
  readonly totalMilliXp: number;
  readonly level: number;
  readonly gems: number;
  readonly gemsEarnedTotal: number;
  readonly lessonsCompleted: number;
  readonly perfectLessons: number;
  readonly firstClears: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly activeDays: number;
  readonly unitsCompleted: number;
  readonly maxCombo: number;
  readonly totalSeconds: number;
  readonly weightedScoreMilli: number;
  readonly weightTotal: number;
  readonly questsClaimed: number;
  readonly chestsOpened: number;
  readonly freezesOwned: number;
  readonly freezesUsed: number;
  readonly heartRefillsBought: number;
  readonly xpToday: number;
}

/**
 * Los contadores que una insignia PUEDE mirar: monótonos no decrecientes.
 *
 * Fuera quedan `gems` (baja al comprar), `currentStreak` (se reinicia a cero) y `level` (se mueve en los
 * dos sentidos cuando el admin retoca la economía). Una insignia sobre cualquiera de los tres se
 * DESBLOQUEA y luego DESAPARECE, que es la peor forma de tratar una recompensa.
 */
export const MONOTONE_COUNTERS = [
  'totalMilliXp',
  'gemsEarnedTotal',
  'lessonsCompleted',
  'perfectLessons',
  'firstClears',
  'longestStreak',
  'activeDays',
  'unitsCompleted',
  'maxCombo',
  'totalSeconds',
  'questsClaimed',
  'chestsOpened',
  'heartRefillsBought',
  // `satisfies` y no una aserción aparte: comprueba que cada nombre sea una clave REAL de `Basis`
  // conservando los tipos literales. Una comprobación de completitud contra el propio tuple —que fue el
  // primer intento— es trivialmente cierta, porque `MonotoneCounter` se define a partir de él: verde para
  // siempre, exactamente el fallo que ya apareció una vez en la Fase 1.
] as const satisfies readonly (keyof Basis)[];

export type MonotoneCounter = (typeof MONOTONE_COUNTERS)[number];

/**
 * Lo que el fold devuelve además de los escalares.
 *
 * Tres de los trece sistemas no caben en un número: los prerrequisitos necesitan SABER QUÉ unidades se
 * completaron (el grafo es por ids, no por conteo), el test-out necesita la puntuación por unidad, y la
 * meta diaria necesita el XP por día. Se construyen en la MISMA pasada, así que no cuestan otra.
 */
/** Lo hecho HOY. Las misiones diarias se miden contra esto y no contra los totales. */
export interface TodayStats {
  readonly xp: number;
  readonly lessons: number;
  readonly perfect: number;
  readonly maxCombo: number;
  readonly weightedScoreMilli: number;
  readonly weightTotal: number;
}

export interface FoldResult {
  readonly basis: Basis;
  readonly today: TodayStats;
  /** El "hoy" con el que se plegó. Quien lea el resultado no puede volver a preguntarle al reloj. */
  readonly todayKey: DayKey;
  readonly todayEpochDay: number;
  readonly completedUnits: ReadonlySet<string>;
  readonly clearedLessons: ReadonlyMap<string, { readonly times: number; readonly bestAccuracyMilli: number }>;
  readonly xpByDayKey: ReadonlyMap<string, number>;
  readonly activeDayKeys: readonly string[];
  readonly seenBadges: ReadonlySet<string>;
  /** Misiones ya cobradas. El id lleva el día dentro, así que no hace falta filtrar por fecha. */
  readonly claimedQuests: ReadonlySet<string>;
}

/**
 * Lo que el fold necesita del CATÁLOGO, pasado como argumento.
 *
 * `src/game/**` no importa el contenido: si lo hiciera, probar la racha exigiría materializar 190
 * lecciones, y el día que el catálogo cambie de forma se caerían las pruebas de gamificación. Lo único que
 * hace falta es cuántas lecciones tiene cada unidad, para decidir si está completa.
 */
export interface FoldOptions {
  readonly econ: EconomyConfig;
  readonly asOf: AsOf;
  readonly unitSizes: ReadonlyMap<string, number>;
}

/** El "hoy" entra como ARGUMENTO. `src/game/**` tiene prohibido por lint importar el reloj. */
export interface AsOf {
  readonly todayKey: DayKey;
  /** Ordinal absoluto del día de hoy: permite contar huecos entre claves sin volver a parsear fechas. */
  readonly todayEpochDay: number;
}
