/**
 * Las ligas, DERIVADAS. Sin servidor no hay quien corra la promoción del viernes.
 *
 * El diseño ingenuo persiste un `league-result` por semana, y se rompe en cuanto el usuario no abre la
 * app: sin eventos de las semanas que faltan, la cadena de divisiones tiene un agujero y nadie sabe en
 * cuál está. Aquí se persiste UN evento —la inscripción— y todo lo demás se deriva iterando el cierre de
 * cada semana desde entonces hasta hoy. Como la ventana de historia son 120 días, el bucle son 17
 * iteraciones en el peor caso.
 *
 * Los rivales tampoco se persisten: se derivan del ordinal del usuario y de la semana, así que la sala es
 * la misma en cada máquina y en cada recarga sin guardar una sola fila.
 */

import { mix32, u01 } from '@/lib/rng';
import type { EconomyConfig } from '@/content/engine/economy';

export const DIVISIONS = ['Cobre', 'Plata', 'Oro', 'Zafiro', 'Obsidiana'] as const;
export type DivisionName = (typeof DIVISIONS)[number];

export interface LeagueMember {
  readonly ordinal: number;
  readonly weeklyXp: number;
  readonly isMe: boolean;
}

export interface WeekOutcome {
  readonly rank: number;
  readonly division: number;
  readonly nextDivision: number;
  readonly promoted: boolean;
  readonly demoted: boolean;
}

const NS_LEAGUE = 0x5e120001;

/**
 * La sala de la semana: el usuario más `leagueRoomSize - 1` rivales derivados.
 *
 * El XP semanal de un rival sale de una lognormal aproximada por la suma de tres uniformes: la
 * distribución real de esfuerzo tiene cola larga —unos pocos hacen mucho más que la mediana— y una
 * uniforme produce una tabla donde todos empatan y el ascenso parece una lotería.
 */
export function roomFor(input: {
  readonly ordinal: number;
  readonly weekOrdinal: number;
  readonly division: number;
  readonly myWeeklyXp: number;
  readonly econ: EconomyConfig;
}): readonly LeagueMember[] {
  const size = input.econ.leagueRoomSize;
  const members: LeagueMember[] = [{ ordinal: input.ordinal, weeklyXp: input.myWeeklyXp, isMe: true }];

  // Cada división juega más fuerte que la anterior: subir tiene que costar.
  const scale = 120 * (1 + input.division * 0.55);

  for (let i = 1; i < size; i += 1) {
    const seed = mix32(NS_LEAGUE, input.weekOrdinal * 1009 + input.division, i);
    const shape = (u01(seed) + u01(mix32(seed, 1, 0)) + u01(mix32(seed, 2, 0))) / 3;
    members.push({
      ordinal: -i,
      weeklyXp: Math.round(scale * Math.pow(shape * 1.9, 2.4)),
      isMe: false,
    });
  }

  return members.sort((a, b) => b.weeklyXp - a.weeklyXp || a.ordinal - b.ordinal);
}

/** Cierra la semana: quién sube, quién baja, y en qué división queda el usuario. */
export function settleWeek(members: readonly LeagueMember[], division: number, econ: EconomyConfig): WeekOutcome {
  const rank = members.findIndex((m) => m.isMe) + 1;
  const promoted = rank > 0 && rank <= econ.leaguePromote && division < DIVISIONS.length - 1;
  const demoted =
    rank > 0 && econ.leagueDemote > 0 && rank > members.length - econ.leagueDemote && division > 0;

  return {
    rank,
    division,
    nextDivision: promoted ? division + 1 : demoted ? division - 1 : division,
    promoted,
    demoted,
  };
}

export function divisionName(index: number): DivisionName {
  return DIVISIONS[Math.min(Math.max(index, 0), DIVISIONS.length - 1)] ?? 'Cobre';
}
