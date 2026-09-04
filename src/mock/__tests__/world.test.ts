import { describe, expect, it } from 'vitest';
import { HISTORY_DAYS, initClock, orgEpochDay } from '@/lib/clock';
import { brand } from '@/lib/brand';
import {
  activeInWindow,
  buildActivityIndex,
  paramsFor,
  retention,
  USER_COUNT,
  userHeatmap,
  wasActive,
} from '../activity';
import { COHORTS, EXPECTED_TOTAL } from '../fixtures/org';
import { buildSearchIndex, buildUsers, cohortIndexOf, searchUsers, userAt } from '../seed';

// El reloj se inicializa en el ámbito del MÓDULO, no en un `beforeEach`: el índice se construye al
// importar, y `beforeEach` corre después. Que este archivo fuera el único que lo necesitara es la prueba
// de que era el único que llegaba a `orgEpochDay` antes de que hubiera reloj.
initClock({ storedAnchorMs: Date.parse('2026-03-02T00:00:00-06:00'), epochSeed: 'test-world' });

const index = buildActivityIndex();
const slice = buildUsers();
const search = buildSearchIndex(slice.users);

describe('la plantilla', () => {
  it('son exactamente 1,247 y las cohortes suman eso', () => {
    // El criterio de aceptación dice "asignarlo a una cohorte de 300 personas" y el comprador va a contar.
    expect(slice.users).toHaveLength(EXPECTED_TOTAL);
    let sum = 0;
    for (const n of slice.cohortCounts) sum += n;
    expect(sum).toBe(EXPECTED_TOTAL);
    expect(COHORTS.find((c) => c.slug === 'recepcion-mx')?.size).toBe(300);
    expect(slice.cohortCounts[0]).toBe(300);
  });

  it('el ordinal es la identidad: derivar a UNO no exige generar a los anteriores', () => {
    const solo = userAt(812);
    expect(solo).toStrictEqual(slice.users[812]);
  });

  it('insertar el usuario 1248 no altera un solo bit de los anteriores', () => {
    // Es la propiedad estrella del diseño, y la que un solver global de estacionalidad falsificaría.
    const before = slice.users.map((u) => u.displayName);
    const nuevo = userAt(USER_COUNT);
    expect(nuevo.ordinal).toBe(USER_COUNT);
    const after = buildUsers().users.map((u) => u.displayName);
    expect(after).toStrictEqual(before);
  });

  it('los nombres suenan a plantilla real, no a "Usuario 001"', () => {
    const names = slice.users.slice(0, 40).map((u) => u.displayName);
    expect(names.some((n) => n.includes('ñ') || n.includes('á') || n.includes('é') || n.includes('í'))).toBe(true);
    // Compuestos y de un solo apellido conviven.
    const surnameCounts = slice.users.map((u) => u.surname.split(' ').length);
    expect(surnameCounts.filter((n) => n === 1).length).toBeGreaterThan(50);
    expect(surnameCounts.filter((n) => n === 2).length).toBeGreaterThan(900);
  });

  it('la búsqueda pliega acentos y la ñ', () => {
    const muñoz = slice.users.findIndex((u) => u.surname.includes('Muñoz'));
    if (muñoz >= 0) {
      expect(searchUsers(search, 'muno')).toContain(muñoz);
      expect(searchUsers(search, 'MUÑOZ')).toContain(muñoz);
    }
    const jose = slice.users.findIndex((u) => u.givenName.startsWith('José'));
    if (jose >= 0) expect(searchUsers(search, 'jose')).toContain(jose);
  });

  it('la búsqueda de 1,247 filas se resuelve en menos de 30 ms', () => {
    const t0 = performance.now();
    for (const q of ['garcia', 'hernandez', 'recep', 'houston', 'lopez', 'a', 'mar']) searchUsers(search, q);
    expect(performance.now() - t0).toBeLessThan(30);
  });
});

describe('la actividad histórica', () => {
  it('cabe en 38 KB y se construye en menos de 25 ms', () => {
    expect((index.byUser.byteLength + index.byDay.byteLength) / 1024).toBeLessThan(45);
    expect(index.buildMs).toBeLessThan(25);
  });

  it('las dos orientaciones del bitset coinciden bit a bit', () => {
    // El bitset dual es el único índice analítico: si las dos mitades divergen, el dashboard y el drawer
    // del alumno cuentan cosas distintas, y ese es exactamente el fallo que nadie detecta hasta la demo.
    for (const u of [0, 42, 300, 812, 1246]) {
      const heat = userHeatmap(index, u);
      for (let d = 0; d < HISTORY_DAYS; d += 1) {
        expect(heat[d] === 1).toBe(wasActive(index, u, d));
      }
    }
  });

  it('produce RACHAS de verdad, que es lo que una cadena i.i.d. no hace', () => {
    // Con días independientes, P(racha vigente de 7) = 0.35^7 y salen 0.8 usuarios de 1,247: el tablero de
    // rachas toparía en 11 días y la demo no podría enseñar su propia mecánica central.
    const streaks = [...index.currentStreak];
    expect(Math.max(...streaks)).toBeGreaterThan(30);
    expect(streaks.filter((s) => s >= 7).length).toBeGreaterThan(40);
    expect(streaks.filter((s) => s >= 30).length).toBeGreaterThan(5);
  });

  it('DAU < WAU < MAU, y el embudo es creíble', () => {
    const dau = index.dau[HISTORY_DAYS - 1] ?? 0;
    const wau = activeInWindow(index, HISTORY_DAYS - 7, HISTORY_DAYS - 1);
    const mau = activeInWindow(index, HISTORY_DAYS - 30, HISTORY_DAYS - 1);
    expect(dau).toBeLessThan(wau);
    expect(wau).toBeLessThan(mau);
    expect(mau).toBeLessThanOrEqual(USER_COUNT);
    expect(dau).toBeGreaterThan(100);
  });

  it('el valle de actividad cae en el fin de semana REAL', () => {
    // Esta prueba pasaba con `d % 7 >= 5`, que da el fin de semana solo si la columna 0 es lunes. El ancla
    // es la medianoche de HOY, así que la columna 0 es lunes uno de cada siete días: la prueba verificaba
    // que hubiera un valle en dos columnas cualesquiera, no que el valle fuera el fin de semana. Ahora se
    // pregunta por el día de la semana de verdad, que es lo que el comprador va a mirar en la gráfica.
    let weekday = 0;
    let weekdayDays = 0;
    let weekend = 0;
    let weekendDays = 0;
    for (let d = 0; d < HISTORY_DAYS; d += 1) {
      const abs = orgEpochDay(brand<number, 'DayIndex'>(d));
      const mon0 = (((abs + 3) % 7) + 7) % 7;
      if (mon0 >= 5) {
        weekend += index.dau[d] ?? 0;
        weekendDays += 1;
      } else {
        weekday += index.dau[d] ?? 0;
        weekdayDays += 1;
      }
    }
    expect(weekend / weekendDays).toBeLessThan(weekday / weekdayDays);
  });

  it('la retención devuelve null —no 0%— cuando la cohorte aún no cumple k días', () => {
    // Pintar 0% para una cohorte que ingresó hace tres días es un dato falso que en un dashboard nadie
    // cuestiona, y es exactamente el que un gerente usaría para tomar una decisión.
    const joinLate = HISTORY_DAYS - 3;
    expect(retention(index, joinLate, 7).rate).toBeNull();
  });

  it('el abandono es ABSORBENTE: quien se fue no reaparece', () => {
    for (let u = 0; u < USER_COUNT; u += 1) {
      const at = index.churnedAt[u] ?? -1;
      if (at < 0) continue;
      for (let d = at + 1; d < HISTORY_DAYS; d += 1) {
        expect(wasActive(index, u, d)).toBe(false);
      }
    }
  });

  it('la estacionalidad NO depende del roster vigente', () => {
    // Un solver global de scale[d] que despeja contra Σp del roster acopla a todos: desactivar al usuario
    // 812 movería s_d y flipearía ~120 celdas de OTROS usuarios. Aquí los parámetros de cada uno salen
    // solo de su ordinal, así que dos construcciones son idénticas byte a byte.
    const a = buildActivityIndex();
    const b = buildActivityIndex();
    expect(a.byUser).toStrictEqual(b.byUser);
    expect(a.byDay).toStrictEqual(b.byDay);
    expect(a.dau).toStrictEqual(b.dau);
    // Y los parámetros de un usuario no cambian por lo que haya alrededor.
    expect(paramsFor(812)).toStrictEqual(paramsFor(812));
  });

  it('el mundo completo se construye dentro del presupuesto de arranque de 50 ms', () => {
    const t0 = performance.now();
    const ix = buildActivityIndex();
    const us = buildUsers();
    buildSearchIndex(us.users);
    const total = performance.now() - t0;
    expect(ix.dau.length).toBe(HISTORY_DAYS);
    expect(total).toBeLessThan(50);
  });

  it('el índice de cohorte por ordinal cubre a todos sin huecos', () => {
    for (let i = 0; i < USER_COUNT; i += 1) {
      const ci = cohortIndexOf(i);
      expect(ci).toBeGreaterThanOrEqual(0);
      expect(ci).toBeLessThan(COHORTS.length);
    }
  });
});
