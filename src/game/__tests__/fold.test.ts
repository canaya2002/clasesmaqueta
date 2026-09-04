import { describe, expect, it } from 'vitest';
import { fold } from '../fold';
import { daysFromCivil, epochDayOf } from '../day';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { brand } from '@/lib/brand';
import type { AsOf, DayKey, FoldOptions, LedgerEvent } from '../types';
import type { LessonId, UnitId } from '@/content/engine/primitives';

const key = (s: string): DayKey => brand<string, 'DayKey'>(s);
const lesson = (s: string): LessonId => brand<string, 'LessonId'>(s);
const unit = (s: string): UnitId => brand<string, 'UnitId'>(s);

function asOf(dayKey: string): AsOf {
  return { todayKey: key(dayKey), todayEpochDay: dayOf(dayKey) };
}

function dayOf(dayKey: string): number {
  const day = epochDayOf(dayKey);
  if (day === null) throw new Error(`clave inválida: ${dayKey}`);
  return day;
}

function opts(over: Partial<FoldOptions> = {}): FoldOptions {
  return {
    econ: DEFAULT_ECONOMY,
    asOf: asOf('2026-03-10'),
    unitSizes: new Map(),
    ...over,
  };
}

let seq = 0;
function done(dayKey: string, over: Partial<Extract<LedgerEvent, { t: 'lesson-complete' }>> = {}): LedgerEvent {
  seq += 1;
  const day = dayOf(dayKey);
  return {
    t: 'lesson-complete',
    seq,
    atRealMs: day * 86_400_000,
    dayKey: key(dayKey),
    lessonId: lesson(`lsn_${String(seq).padStart(8, '0')}`),
    unitId: unit('unt_00000001'),
    difficulty: 3,
    xpUnitsMilli: 10_000,
    accuracyMilli: 1000,
    weightTotal: 10,
    perfect: false,
    firstClear: true,
    paceBonusEarned: false,
    maxCombo: 5,
    elapsedMs: 120_000,
    gemsGranted: 0,
    countsForProgress: true,
    ...over,
  };
}

describe('congelar frente a derivar', () => {
  it('subir el XP base mueve el total HISTÓRICO al instante', () => {
    // Es el criterio de aceptación de la fase, y solo se sostiene porque el evento guarda el XP con el
    // precio factorizado fuera. Guardar la suma de pesos no permitiría reconstruirlo.
    // Los bonos por lección perfecta, primera vez y ritmo son perillas APARTE y no escalan con `xpBase`:
    // se ponen a cero para aislar la propiedad que se afirma.
    const sinBonos = { ...DEFAULT_ECONOMY, bonusPerfectXp: 0, bonusFirstClearXp: 0, bonusPaceXp: 0 };
    const events = [done('2026-03-08'), done('2026-03-09')];
    const base = fold(events, opts({ econ: sinBonos })).basis.totalMilliXp;
    const subido = fold(events, opts({ econ: { ...sinBonos, xpBase: sinBonos.xpBase * 2 } })).basis.totalMilliXp;
    expect(base).toBeGreaterThan(0);
    expect(subido).toBe(base * 2);
  });

  it('el nivel se mueve en los DOS sentidos con la economía', () => {
    // Sin `highWaterLevel`: clavar el nivel mientras el XP baja hace que el anillo de progreso calcule
    // relleno negativo, porque `(xp - umbralDelNivel) / ventana` sale menor que cero.
    const events = Array.from({ length: 40 }, (_, i) => done(`2026-02-${String((i % 28) + 1).padStart(2, '0')}`));
    const alto = fold(events, opts({ econ: { ...DEFAULT_ECONOMY, xpBase: 20 } })).basis.level;
    const bajo = fold(events, opts({ econ: { ...DEFAULT_ECONOMY, xpBase: 1 } })).basis.level;
    expect(alto).toBeGreaterThan(bajo);
  });

  it('las gemas NO se re-tarifan: el saldo no puede quedar negativo por una compra ya hecha', () => {
    // La regla de la frontera: se deriva lo monótono sin cargos (XP), se congela lo que participa en un
    // saldo (gemas). Re-tarifar los dos lados con factores distintos produce saldos imposibles.
    const events: LedgerEvent[] = [
      done('2026-03-01', { perfect: true, gemsGranted: 5 }),
      { t: 'shop-purchase', seq: 99, atRealMs: 2, dayKey: key('2026-03-02'), item: 'heart-refill', pricePaid: 5 },
    ];
    const barato = fold(events, opts({ econ: { ...DEFAULT_ECONOMY, priceHeartRefill: 1, gemsPerfectLesson: 1 } }));
    expect(barato.basis.gems).toBe(0);
    expect(barato.basis.gems).toBeGreaterThanOrEqual(0);
  });
});

describe('la racha', () => {
  it('cuenta días consecutivos y se corta con un hueco', () => {
    const r = fold([done('2026-03-08'), done('2026-03-09'), done('2026-03-10')], opts()).basis;
    expect(r.currentStreak).toBe(3);
  });

  it('un día sin actividad AYER no rompe la racha si hoy aún no termina', () => {
    // Terminó ayer y hoy todavía no ha jugado: la racha sigue viva. Cortarla aquí es el error que hace
    // que el usuario abra la app a las 9 de la mañana y vea su racha en cero.
    const r = fold([done('2026-03-08'), done('2026-03-09')], opts()).basis;
    expect(r.currentStreak).toBe(2);
  });

  it('dos días sin actividad la rompen', () => {
    const r = fold([done('2026-03-07'), done('2026-03-08')], opts()).basis;
    expect(r.currentStreak).toBe(0);
    expect(r.longestStreak).toBe(2);
  });

  it('un congelador tapa UN día de hueco', () => {
    const events: LedgerEvent[] = [
      done('2026-03-06'),
      { t: 'shop-purchase', seq: 500, atRealMs: dayOf('2026-03-06') * 86_400_000 + 1, dayKey: key('2026-03-06'), item: 'streak-freeze', pricePaid: 200 },
      done('2026-03-08'),
      done('2026-03-09'),
    ];
    const r = fold(events, opts()).basis;
    expect(r.currentStreak).toBe(3);
    expect(r.freezesUsed).toBe(1);
  });

  it('un congelador comprado DESPUÉS no repara un hueco anterior', () => {
    // La razón de que el consumo vaya en la misma pasada cronológica. Contar totales al final permitiría
    // comprar el viernes y recuperar el martes, que es exactamente lo que un congelador no hace.
    const events: LedgerEvent[] = [
      done('2026-03-06'),
      done('2026-03-09'),
      { t: 'shop-purchase', seq: 501, atRealMs: dayOf('2026-03-09') * 86_400_000 + 1, dayKey: key('2026-03-09'), item: 'streak-freeze', pricePaid: 200 },
      done('2026-03-10'),
    ];
    const r = fold(events, opts()).basis;
    expect(r.freezesUsed).toBe(0);
    expect(r.currentStreak).toBe(2);
  });

  it('el modo práctica NO alimenta la racha', () => {
    const r = fold([done('2026-03-09', { countsForProgress: false }), done('2026-03-10')], opts()).basis;
    expect(r.currentStreak).toBe(1);
    // Pero el XP sí se otorgó y sigue contando: lo que no cuenta es el PROGRESO.
    expect(r.lessonsCompleted).toBe(2);
  });
});

describe('unidades y aritmética de calendario', () => {
  it('una unidad se completa cuando están todas sus lecciones', () => {
    const events = [
      done('2026-03-09', { lessonId: lesson('lsn_a'), unitId: unit('unt_x') }),
      done('2026-03-10', { lessonId: lesson('lsn_b'), unitId: unit('unt_x') }),
    ];
    expect(fold(events, opts({ unitSizes: new Map([['unt_x', 3]]) })).completedUnits.size).toBe(0);
    expect(fold(events, opts({ unitSizes: new Map([['unt_x', 2]]) })).completedUnits.has('unt_x')).toBe(true);
  });

  it('el ordinal absoluto atraviesa bisiestos y cambios de siglo', () => {
    expect(daysFromCivil({ y: 1970, m: 1, d: 1 })).toBe(0);
    // 2000 fue bisiesto (divisible entre 400) y 1900 no lo fue.
    expect(daysFromCivil({ y: 2000, m: 3, d: 1 }) - daysFromCivil({ y: 2000, m: 2, d: 28 })).toBe(2);
    expect(daysFromCivil({ y: 1900, m: 3, d: 1 }) - daysFromCivil({ y: 1900, m: 2, d: 28 })).toBe(1);
  });
});
