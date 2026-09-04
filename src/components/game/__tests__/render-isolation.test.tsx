/**
 * El criterio de aislamiento de render, medido.
 *
 * Perder corazones repinta la barra de corazones y NADA más. No se consigue con memos: se consigue porque
 * los corazones y el progreso son dos fuentes de estado distintas, cada una con sus suscriptores. Un store
 * único con selectores habría bastado en teoría y falla en la práctica en cuanto un selector devuelve un
 * objeto nuevo, que es lo más fácil de escribir.
 *
 * El enunciado original de la fase decía "10 loseHeart() → 11 renders de HeartBar". Es aritméticamente
 * imposible: `maxHearts` son 5, gastar con cero corazones no cambia nada y el store no notifica si no hay
 * cambio observable. El criterio se reescribe contra la economía, que es lo que debió ser desde el
 * principio, y se añade la aserción que el número literal escondía: gastar sin corazones NO repinta.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { Profiler } from 'react';
import { MotionRoot } from '@/design/MotionRoot';
import { PathSection } from '../PathSection';
import { HeartsChip } from '../HeartsChip';
import { StreakFlame } from '../StreakFlame';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { resetHeartsForTests, spendHeart } from '@/mock/hearts';
import { getFold, replaceLedgerForTests, resetLedgerForTests } from '@/mock/ledger';
import { resetDemo } from '@/mock/persist';
import type { NodeState } from '@/game/path';

type Region = 'section' | 'hearts' | 'streak';

const counts: Record<Region, number> = { section: 0, hearts: 0, streak: 0 };

/**
 * Se mide con `<Profiler>`, no con una envoltura que cuente.
 *
 * Fue el primer intento y mide lo que no es: una envoltura memoizada NO se repinta cuando el componente
 * de dentro se actualiza por su propia suscripción, así que el contador se quedaba en 1 y el test decía
 * que los corazones no repintaban — justo lo contrario de la verdad. `Profiler` cuenta COMMITS del
 * subárbol, que es la unidad que importa aquí.
 */
const count = (key: Region) => (): void => {
  counts[key] += 1;
};

const UNITS = [
  {
    id: 'unt_00000001',
    title: 'La llamada entrante',
    icon: 'phone',
    lessons: [{ id: 'lsn_00000000', title: 'Primera', kind: 'learn' }],
  },
];
const STATES: ReadonlyMap<string, NodeState> = new Map([['lsn_00000000', 'current']]);

function Screen() {
  return (
    <MotionRoot>
      <Profiler id="streak" onRender={count('streak')}>
        <StreakFlame />
      </Profiler>
      <Profiler id="hearts" onRender={count('hearts')}>
        <HeartsChip />
      </Profiler>
      <Profiler id="section" onRender={count('section')}>
        <PathSection title="La llamada" units={UNITS} states={STATES} index={0} />
      </Profiler>
    </MotionRoot>
  );
}

beforeEach(() => {
  resetDemo();
  resetLedgerForTests();
  resetHeartsForTests(null);
  replaceLedgerForTests([]);
  counts.section = 0;
  counts.hearts = 0;
  counts.streak = 0;
});

describe('aislamiento de render', () => {
  it('gastar corazones repinta los corazones y NADA del camino', () => {
    render(<Screen />);
    // Se deja asentar el efecto que arranca el ticker antes de tomar la línea base: su primer `emit`
    // produce un commit legítimo que no tiene nada que ver con perder corazones.
    act(() => undefined);
    const sectionAfterMount = counts.section;
    const streakAfterMount = counts.streak;
    const heartsAfterMount = counts.hearts;

    for (let i = 0; i < DEFAULT_ECONOMY.maxHearts; i += 1) {
      act(() => {
        spendHeart(DEFAULT_ECONOMY);
      });
    }

    /*
     * Un repintado por corazón perdido, MÁS uno.
     *
     * El de más ocurre en el primer gasto y es correcto: al dejar de estar lleno aparece la cuenta
     * regresiva hasta la siguiente recarga, y el rótulo de minutos del lector de pantalla entra en el
     * árbol. Ocurre UNA vez, en la transición lleno→no lleno, no en cada gasto. Se afirma exacto en vez de
     * con un rango porque si mañana pasan a ser dos, quiero enterarme.
     */
    expect(counts.hearts).toBe(heartsAfterMount + DEFAULT_ECONOMY.maxHearts + 1);
    // Y ni la sección del camino ni la racha se enteran: no leen los corazones.
    expect(counts.section).toBe(sectionAfterMount);
    expect(counts.streak).toBe(streakAfterMount);
  });

  it('gastar SIN corazones no repinta nada', () => {
    // El número literal "11 renders" escondía este caso. Con el contador en cero, `reduceHearts` devuelve
    // el mismo valor y el store no notifica: un rebase de sello no es un cambio observable.
    render(<Screen />);
    for (let i = 0; i < DEFAULT_ECONOMY.maxHearts; i += 1) {
      act(() => {
        spendHeart(DEFAULT_ECONOMY);
      });
    }
    const settled = counts.hearts;

    for (let i = 0; i < 5; i += 1) {
      act(() => {
        spendHeart(DEFAULT_ECONOMY);
      });
    }
    expect(counts.hearts).toBe(settled);
  });

  it('el fold conserva su IDENTIDAD mientras nada cambie', () => {
    // Es la condición de la que depende todo lo anterior, y se afirma directamente en vez de a través de
    // un conteo de renders: `<Profiler>` cuenta commits del subárbol, así que un repintado del padre lo
    // dispara aunque el `memo` de dentro corte — mediría el andamio del test, no la propiedad.
    //
    // `useSyncExternalStore` exige que `getSnapshot` devuelva el MISMO objeto mientras nada cambie: un
    // literal nuevo hace que `Object.is` falle siempre y React entra en bucle.
    const a = getFold(DEFAULT_ECONOMY);
    const b = getFold(DEFAULT_ECONOMY);
    expect(a).toBe(b);

    // Perder un corazón no toca el ledger, así que la identidad tiene que sobrevivir.
    spendHeart(DEFAULT_ECONOMY);
    expect(getFold(DEFAULT_ECONOMY)).toBe(a);

    // Un hecho nuevo sí la invalida: si no, el camino no se enteraría de que avanzaste.
    replaceLedgerForTests([]);
    expect(getFold(DEFAULT_ECONOMY)).not.toBe(a);
  });
});
