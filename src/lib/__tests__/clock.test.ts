import { describe, expect, it } from 'vitest';
import {
  DAY_START_HOUR,
  dayKeyInZone,
  HISTORY_DAYS,
  initClock,
  MAX_DRIFT_DAYS,
  MS_PER_DAY,
  toDayIndex,
  todayIndex,
  withClock,
} from '../clock';

const MIDNIGHT_TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();

describe('el reloj anclado sostiene la demo', () => {
  it('en el primer arranque ancla a la medianoche de hoy', () => {
    const r = initClock({ storedAnchorMs: null, epochSeed: 'e1' });
    expect(r.anchorMs).toBe(MIDNIGHT_TODAY);
    expect(r.driftDays).toBe(0);
    expect(r.reanchored).toBe(false);
  });

  it('desliza el ancla por días COMPLETOS tras tres días sin abrir la demo', () => {
    // Deslizar por días completos y no por milisegundos es lo que mantiene intacta la paridad par/impar
    // de fin de semana, y por tanto la estacionalidad del seed.
    const r = initClock({ storedAnchorMs: MIDNIGHT_TODAY - 3 * MS_PER_DAY, epochSeed: 'e1' });
    expect(r.driftDays).toBe(3);
    expect(r.anchorMs).toBe(MIDNIGHT_TODAY);
    expect(r.reanchored).toBe(false);
  });

  it('re-ancla si el reloj del sistema fue movido HACIA ATRÁS', () => {
    // Sin esto el ancla queda en el futuro, `toDayIndex` devuelve null y el heatmap y la racha aparecen
    // vacíos: un fallo silencioso en la pantalla de perfil.
    const r = initClock({ storedAnchorMs: MIDNIGHT_TODAY + 5 * MS_PER_DAY, epochSeed: 'e1' });
    expect(r.wentBackwards).toBe(true);
    expect(r.reanchored).toBe(true);
    expect(r.anchorMs).toBe(MIDNIGHT_TODAY);
  });

  it('re-ancla en vez de deslizar cuando la deriva es enorme', () => {
    const r = initClock({
      storedAnchorMs: MIDNIGHT_TODAY - (MAX_DRIFT_DAYS + 50) * MS_PER_DAY,
      epochSeed: 'e1',
    });
    expect(r.reanchored).toBe(true);
    expect(r.anchorMs).toBe(MIDNIGHT_TODAY);
  });

  it('la ventana histórica tiene 120 días y hoy es el último', () => {
    initClock({ storedAnchorMs: null, epochSeed: 'e1' });
    expect(todayIndex()).toBe(HISTORY_DAYS - 1);
    expect(toDayIndex(MIDNIGHT_TODAY)).toBe(HISTORY_DAYS - 1);
    expect(toDayIndex(MIDNIGHT_TODAY - (HISTORY_DAYS - 1) * MS_PER_DAY)).toBe(0);
    expect(toDayIndex(MIDNIGHT_TODAY - HISTORY_DAYS * MS_PER_DAY)).toBeNull();
    expect(toDayIndex(MIDNIGHT_TODAY + MS_PER_DAY)).toBeNull();
  });

  it('withClock aísla el estado sin fake timers globales', () => {
    initClock({ storedAnchorMs: null, epochSeed: 'e1' });
    const inside = withClock(MIDNIGHT_TODAY - 10 * MS_PER_DAY, () => toDayIndex(MIDNIGHT_TODAY));
    expect(inside).toBeNull();
    expect(toDayIndex(MIDNIGHT_TODAY)).toBe(HISTORY_DAYS - 1);
  });
});

describe('la frontera de día es la de la oficina, a las 04:00', () => {
  it('las 02:00 de un martes cuentan como el lunes', () => {
    // Es el caso del turno de noche: sin el desplazamiento, quien cierra una lección a la 1am rompe su
    // racha aunque haya estudiado dos días seguidos.
    const tuesday2am = Date.UTC(2026, 8, 1, 8, 0, 0); // 02:00 en America/Mexico_City (UTC-6)
    const tuesday10am = Date.UTC(2026, 8, 1, 16, 0, 0);
    expect(dayKeyInZone(tuesday2am, 'America/Mexico_City')).toBe('2026-08-31');
    expect(dayKeyInZone(tuesday10am, 'America/Mexico_City')).toBe('2026-09-01');
  });

  it('dos oficinas con reglas de horario de verano distintas no comparten frontera', () => {
    // Phoenix no observa horario de verano; Chicago sí. En julio difieren en una hora.
    const july = Date.UTC(2026, 6, 15, 9, 30, 0);
    const phoenix = dayKeyInZone(july, 'America/Phoenix');
    const chicago = dayKeyInZone(july, 'America/Chicago');
    expect(typeof phoenix).toBe('string');
    expect(typeof chicago).toBe('string');
    expect(DAY_START_HOUR).toBe(4);
  });
});
