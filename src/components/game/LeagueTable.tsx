'use client';

import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { useFold } from '@/lib/hooks/useGameState';
import { divisionName, roomFor, settleWeek } from '@/game/leagues';
import { DEMO_USER_ORDINAL } from '@/mock/boot-client';
import { userAt } from '@/mock/seed';
import { DemoteIcon, LeagueIcon, PromoteIcon } from '@/components/ui/icons';

/** El XP de los últimos siete días es lo que compite, no el total acumulado. */
function weeklyXp(xpByDay: ReadonlyMap<string, number>, todayEpochDay: number, keys: readonly string[]): number {
  let sum = 0;
  for (const key of keys.slice(-7)) sum += xpByDay.get(key) ?? 0;
  void todayEpochDay;
  return sum;
}

export function LeagueTable() {
  const fold = useFold(DEFAULT_ECONOMY);
  if (fold === null) return <div className="skeleton" style={{ height: 320 }} />;

  const mine = weeklyXp(fold.xpByDayKey, fold.todayEpochDay, fold.activeDayKeys);
  const division = Math.min(4, Math.floor(fold.basis.level / 8));
  const week = Math.floor(fold.todayEpochDay / 7);
  const room = roomFor({ ordinal: DEMO_USER_ORDINAL, weekOrdinal: week, division, myWeeklyXp: mine, econ: DEFAULT_ECONOMY });
  const outcome = settleWeek(room, division, DEFAULT_ECONOMY);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card league-head">
        <LeagueIcon size={38} strokeWidth={2} aria-hidden="true" className="league-head__icon" />
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 'var(--t-12)', fontWeight: 800, textTransform: 'uppercase' }}>
          División
        </p>
        <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--t-28)' }}>
          {divisionName(division)}
        </p>
        <p style={{ margin: '6px 0 0', color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
          Van {String(DEFAULT_ECONOMY.leaguePromote)} a la siguiente división. Bajan los últimos{' '}
          {String(DEFAULT_ECONOMY.leagueDemote)}.
        </p>
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
        {room.map((m, i) => {
          const rank = i + 1;
          const zone =
            rank <= DEFAULT_ECONOMY.leaguePromote
              ? 'up'
              : rank > room.length - DEFAULT_ECONOMY.leagueDemote
                ? 'down'
                : 'flat';
          return (
            <li key={m.ordinal} className="league-row" data-zone={zone} data-me={m.isMe ? 'true' : undefined}>
              <span className="u-counter" style={{ width: 26, textAlign: 'right', color: 'var(--fg-muted)' }}>
                {String(rank)}
              </span>
              {/* La zona lleva ICONO además del borde de color: el borde solo no sobrevive a una captura
                  en blanco y negro ni a la ceguera al color rojo-verde. */}
              <span className="league-row__zone" aria-hidden="true">
                {zone === 'up' ? <PromoteIcon size={15} strokeWidth={2.8} /> : zone === 'down' ? <DemoteIcon size={15} strokeWidth={2.8} /> : null}
              </span>
              <span style={{ flex: 1, fontWeight: m.isMe ? 800 : 500 }}>
                {m.isMe ? `${userAt(DEMO_USER_ORDINAL).givenName} (tú)` : `Compañero ${String(-m.ordinal)}`}
              </span>
              <span className="u-counter">{String(m.weeklyXp)} XP</span>
            </li>
          );
        })}
      </ol>

      <p role="status" style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 'var(--t-14)', textAlign: 'center' }}>
        {outcome.promoted
          ? 'Si la semana cerrara ahora, subirías de división.'
          : outcome.demoted
            ? 'Si la semana cerrara ahora, bajarías. Una lección te saca de la zona.'
            : `Vas en el puesto ${String(outcome.rank)} de ${String(room.length)}.`}
      </p>
    </div>
  );
}
