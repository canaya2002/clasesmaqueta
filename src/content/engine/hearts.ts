/**
 * SENDA — el núcleo de corazones. PURO, sin un solo `import` de reloj.
 *
 * Que no importe el reloj es el punto entero del archivo. El criterio de aceptación de esta fase —"cambiar
 * el reloj del Mac no regala corazones"— no se puede demostrar con fake timers sin acabar probando el mock
 * en vez del código. Aquí la muestra de reloj ENTRA como argumento, así que la prueba es aritmética: dos
 * objetos literales y una aserción de igualdad.
 *
 * Dos reglas que ordenan todo lo demás:
 *
 * 1. **Una sola muestra por transición.** Antes, perder un corazón leía el reloj en el reducer y recargarlo
 *    lo leía en el ticker; si los dos ocurrían en el mismo milisegundo con el contador en 1, el resultado
 *    dependía de cuál corría primero. Con `reduceHearts(rec, ev, s, cfg)` los dos eventos se serializan
 *    sobre la MISMA `s`.
 * 2. **Siempre acumular antes de consumir.** En el empate exacto —vence la recarga en el mismo instante en
 *    que el alumno falla— el orden acumular→consumir resuelve a "le queda uno" en vez de "se quedó sin
 *    vidas". Es la respuesta amable y, sobre todo, es la determinista.
 */

/** Lo único que el núcleo sabe del tiempo. Tres números, ninguna función. */
export interface ClockSample {
  /** Reloj de pared REAL (no el anclado de la demo). */
  readonly realMs: number;
  /** Reloj monótono. Solo comparable contra otra muestra con el mismo `monoEpochId`. */
  readonly monoMs: number;
  /** Identidad de la carga de documento. Cambia en cada recarga; nunca se persiste. */
  readonly monoEpochId: string;
}

export interface HeartsConfig {
  readonly maxHearts: number;
  readonly refillMs: number;
  /**
   * Techo de corazones otorgables SIN señal monótona (es decir, a través de una recarga de página).
   *
   * Sin este techo, el exploit es de dos pasos y lo encuentra cualquiera que inspeccione una maqueta de
   * gamificación: adelantar el reloj del sistema y pulsar F5. El tope de 24 h no lo impide, porque 24 h ya
   * son más recargas que el máximo. Esto sí: la barra libre cuesta una recarga por corazón y como máximo
   * `maxUntrustedGrant` antes de tener que esperar de verdad.
   */
  readonly maxUntrustedGrant: number;
}

export interface HeartsRecord {
  readonly hearts: number;
  readonly lastAccrualRealMs: number;
  readonly lastAccrualMonoMs: number;
  readonly monoEpochId: string;
  readonly unlimitedUntilRealMs: number | null;
  /** Corazones ya otorgados por la vía no confiable desde la última vez que estuvieron llenos. */
  readonly untrustedGranted: number;
}

export type HeartsEvent =
  | { readonly type: 'tick' }
  | { readonly type: 'spend' }
  | { readonly type: 'refillAll' }
  | { readonly type: 'grantUnlimited'; readonly hours: number };

/** Techo de tiempo acreditable de una sola vez. Volver tras dos semanas da lo mismo que volver mañana. */
export const MAX_OFFLINE_MS = 86_400_000;

/**
 * Crédito por suspensión: CERO, y es una decisión, no un olvido.
 *
 * Con la pestaña viva el reloj monótono manda. Si la laptop se suspende 8 horas y el navegador congela
 * `performance.now()`, esas 8 horas no se acreditan mientras la pestaña siga siendo la misma. Se acreditan
 * en la siguiente recarga, por la vía de pared, que es la que ya está topada y auditada. Subir esta
 * constante equivale a abrir exactamente ese margen al reloj del sistema.
 */
export const SLEEP_GRACE_MS = 0;

export interface Elapsed {
  readonly ms: number;
  /** `true` si la medida viene del reloj monótono, inmune a que muevan el del sistema. */
  readonly trusted: boolean;
}

export function elapsedFor(record: HeartsRecord, s: ClockSample): Elapsed {
  const wall = s.realMs - record.lastAccrualRealMs;
  if (record.monoEpochId === s.monoEpochId) {
    const monotonic = s.monoMs - record.lastAccrualMonoMs;
    // El mínimo de los dos: mover el reloj hacia adelante no puede superar al monótono, y una suspensión
    // que congela el monótono no puede superar al de pared. Cualquiera de los dos negativo cae al piso.
    const ms = Math.min(wall, monotonic + SLEEP_GRACE_MS);
    return { ms: Math.min(Math.max(ms, 0), MAX_OFFLINE_MS), trusted: true };
  }
  return { ms: Math.min(Math.max(wall, 0), MAX_OFFLINE_MS), trusted: false };
}

/**
 * Acumulación. Devuelve el registro con los corazones ya otorgados y los sellos REBASADOS.
 *
 * El rebase se escribe como `muestra - residuo` y no como `sello + consumido` a propósito: la segunda forma
 * conserva el residuo pero deja el sello monótono apuntando a la carga de documento ANTERIOR, y en la
 * siguiente lectura —ya con la época coincidiendo— el delta monótono sale absurdo. Restar el residuo de la
 * muestra actual conserva el residuo Y rebasa las dos escalas a la vez.
 */
function accrue(record: HeartsRecord, s: ClockSample, cfg: HeartsConfig): HeartsRecord {
  const { ms, trusted } = elapsedFor(record, s);
  const room = Math.max(0, cfg.maxHearts - record.hearts);
  let granted = Math.min(Math.floor(ms / cfg.refillMs), room);
  if (!trusted) {
    granted = Math.min(granted, Math.max(0, cfg.maxUntrustedGrant - record.untrustedGranted));
  }
  const hearts = record.hearts + granted;

  // Llegar al máximo MATA el banco. La comprobación va al final, sobre el resultado, y no al principio
  // sobre la entrada: recargar de 4 a 5 llena el contador igual que empezar lleno, y si el residuo
  // sobreviviera, el siguiente corazón perdido volvería en segundos con el tiempo que quedó guardado.
  if (hearts >= cfg.maxHearts) {
    return {
      ...record,
      hearts: cfg.maxHearts,
      lastAccrualRealMs: s.realMs,
      lastAccrualMonoMs: s.monoMs,
      monoEpochId: s.monoEpochId,
      untrustedGranted: 0,
    };
  }

  const residue = ms - granted * cfg.refillMs;
  return {
    ...record,
    hearts,
    lastAccrualRealMs: s.realMs - residue,
    lastAccrualMonoMs: s.monoMs - residue,
    monoEpochId: s.monoEpochId,
    untrustedGranted: trusted ? record.untrustedGranted : record.untrustedGranted + granted,
  };
}

export function isUnlimited(record: HeartsRecord, s: ClockSample): boolean {
  return record.unlimitedUntilRealMs !== null && record.unlimitedUntilRealMs > s.realMs;
}

/** El ÚNICO punto de entrada. Acumula primero, aplica el evento después. */
export function reduceHearts(
  record: HeartsRecord,
  event: HeartsEvent,
  s: ClockSample,
  cfg: HeartsConfig,
): HeartsRecord {
  const base = accrue(record, s, cfg);
  switch (event.type) {
    case 'tick':
      return base;
    case 'spend':
      if (isUnlimited(base, s)) return base;
      return { ...base, hearts: Math.max(0, base.hearts - 1) };
    case 'refillAll':
      return {
        ...base,
        hearts: cfg.maxHearts,
        lastAccrualRealMs: s.realMs,
        lastAccrualMonoMs: s.monoMs,
        untrustedGranted: 0,
      };
    case 'grantUnlimited':
      // Contra el reloj de PARED, nunca contra el anclado: re-anclar la demo a hoy no puede caducar ni
      // prorrogar un potenciador que el comprador acaba de comprar en pantalla.
      return { ...base, unlimitedUntilRealMs: s.realMs + event.hours * 3_600_000 };
  }
}

/** Milisegundos hasta el siguiente corazón. `null` si están llenos, apagados o hay potenciador. */
export function msUntilNextHeart(
  record: HeartsRecord,
  s: ClockSample,
  cfg: HeartsConfig,
): number | null {
  if (cfg.maxHearts <= 0 || record.hearts >= cfg.maxHearts || isUnlimited(record, s)) return null;
  const { ms } = elapsedFor(record, s);
  return cfg.refillMs - (ms % cfg.refillMs);
}

export function initialHearts(s: ClockSample, cfg: HeartsConfig): HeartsRecord {
  return {
    hearts: cfg.maxHearts,
    lastAccrualRealMs: s.realMs,
    lastAccrualMonoMs: s.monoMs,
    monoEpochId: s.monoEpochId,
    unlimitedUntilRealMs: null,
    untrustedGranted: 0,
  };
}
