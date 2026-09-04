import { describe, expect, it } from 'vitest';
import { DIVISIONS, divisionName, roomFor, settleWeek } from '../leagues';
import { shopItems } from '../shop';
import { fold } from '../fold';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { brand } from '@/lib/brand';

const ASOF = { todayKey: brand<string, 'DayKey'>('2026-03-10'), todayEpochDay: 20_522 };
const BASIS = fold([], { econ: DEFAULT_ECONOMY, asOf: ASOF, unitSizes: new Map() }).basis;

const room = (myXp: number, division = 1) =>
  roomFor({ ordinal: 688, weekOrdinal: 2930, division, myWeeklyXp: myXp, econ: DEFAULT_ECONOMY });

describe('la sala de liga', () => {
  it('tiene el tamaño de la economía y me incluye una sola vez', () => {
    const r = room(400);
    expect(r).toHaveLength(DEFAULT_ECONOMY.leagueRoomSize);
    expect(r.filter((m) => m.isMe)).toHaveLength(1);
  });

  it('es la misma en cada máquina y en cada recarga', () => {
    expect(room(400)).toEqual(room(400));
  });

  it('viene ordenada de más a menos XP', () => {
    const xps = room(400).map((m) => m.weeklyXp);
    expect([...xps].sort((a, b) => b - a)).toEqual(xps);
  });

  it('las divisiones altas exigen más', () => {
    // Subir tiene que costar: si la sala de Obsidiana juega igual que la de Cobre, el ascenso no significa
    // nada y la mecánica entera es decorativa.
    const bajo = room(400, 0).reduce((n, m) => n + m.weeklyXp, 0);
    const alto = room(400, 4).reduce((n, m) => n + m.weeklyXp, 0);
    expect(alto).toBeGreaterThan(bajo * 1.5);
  });

  it('el reparto tiene cola larga, no es plano', () => {
    // Una uniforme produce una tabla donde todos empatan y el ascenso parece una lotería.
    const xps = room(400, 2).map((m) => m.weeklyXp).filter((x) => x > 0);
    const max = Math.max(...xps);
    const median = [...xps].sort((a, b) => a - b)[Math.floor(xps.length / 2)] ?? 1;
    expect(max / Math.max(median, 1)).toBeGreaterThan(2);
  });
});

describe('el cierre de semana', () => {
  it('quedar arriba sube de división', () => {
    const r = settleWeek(room(99_999, 1), 1, DEFAULT_ECONOMY);
    expect(r.rank).toBe(1);
    expect(r.promoted).toBe(true);
    expect(r.nextDivision).toBe(2);
  });

  it('quedar abajo baja de división', () => {
    const r = settleWeek(room(0, 2), 2, DEFAULT_ECONOMY);
    expect(r.demoted).toBe(true);
    expect(r.nextDivision).toBe(1);
  });

  it('nadie baja de la primera división ni sube de la última', () => {
    // Las dos experiencias negativas del producto son perder la racha y descender. Descender desde Cobre
    // no existe: no hay a dónde, y enseñar un descenso imposible es peor que no tener la mecánica.
    expect(settleWeek(room(0, 0), 0, DEFAULT_ECONOMY).nextDivision).toBe(0);
    const last = DIVISIONS.length - 1;
    expect(settleWeek(room(99_999, last), last, DEFAULT_ECONOMY).nextDivision).toBe(last);
  });

  it('el nombre de división está acotado', () => {
    expect(divisionName(-3)).toBe('Cobre');
    expect(divisionName(99)).toBe('Obsidiana');
  });
});

describe('la tienda', () => {
  it('sin gemas, todo dice CUÁNTAS faltan', () => {
    for (const item of shopItems(DEFAULT_ECONOMY, BASIS, false, false)) {
      expect(item.blocked).toMatch(/faltan/);
    }
  });

  it('un artículo que no serviría dice por qué, en vez de ofrecerse igual', () => {
    const rico = { ...BASIS, gems: 10_000 };
    const conTodo = shopItems(DEFAULT_ECONOMY, rico, true, true);
    expect(conTodo.find((i) => i.id === 'heart-refill')?.blocked).toMatch(/Ya tienes/);
    expect(conTodo.find((i) => i.id === 'unlimited-hearts')?.blocked).toMatch(/activo/);
  });

  it('el precio se deriva de la economía', () => {
    const rico = { ...BASIS, gems: 10_000 };
    const caro = shopItems({ ...DEFAULT_ECONOMY, priceStreakFreeze: 999 }, rico, false, false);
    expect(caro.find((i) => i.id === 'streak-freeze')?.price).toBe(999);
  });

  it('no se pueden acumular más de dos congeladores', () => {
    const rico = { ...BASIS, gems: 10_000, freezesOwned: 2 };
    expect(shopItems(DEFAULT_ECONOMY, rico, false, false).find((i) => i.id === 'streak-freeze')?.blocked).toMatch(
      /máximo/,
    );
  });
});
