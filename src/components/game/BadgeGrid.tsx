'use client';

import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { useFold } from '@/lib/hooks/useGameState';
import { BADGES, isUnlocked, type BadgeContext } from '@/game/badges';
import { epochDayOf } from '@/game/day';
import { BadgeIcon, LockedIcon } from '@/components/ui/icons';

/**
 * Las 32 insignias. Las bloqueadas se ENSEÑAN, con su pista.
 *
 * Esconderlas hasta desbloquearlas es el default y quita la mitad del valor: una insignia que no sabes que
 * existe no te mueve a hacer nada. Lo que se esconde es el progreso exacto, no la existencia.
 */
export function BadgeGrid() {
  const fold = useFold(DEFAULT_ECONOMY);
  if (fold === null) return <div className="skeleton" style={{ height: 400 }} />;

  // La ausencia más larga sale de los días activos: es el insumo de la insignia "De vuelta".
  let longestAbsence = 0;
  const days = fold.activeDayKeys.map((k) => epochDayOf(k)).filter((d): d is number => d !== null);
  for (let i = 1; i < days.length; i += 1) longestAbsence = Math.max(longestAbsence, (days[i] ?? 0) - (days[i - 1] ?? 0) - 1);

  const ctx: BadgeContext = {
    basis: fold.basis,
    fold,
    activeWeekdays: new Set(days.map((d) => (((d + 3) % 7) + 7) % 7)),
    finishHours: [],
    longestAbsence,
  };

  const unlocked = BADGES.filter((b) => isUnlocked(b, ctx));

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 'var(--t-14)', textAlign: 'center' }}>
        <strong className="u-counter" style={{ color: 'var(--fg-default)' }}>
          {String(unlocked.length)}
        </strong>{' '}
        de {String(BADGES.length)} conseguidas
      </p>

      <ul className="badge-grid">
        {BADGES.map((b) => {
          const has = isUnlocked(b, ctx);
          return (
            <li key={b.id}>
              <div className="badge" data-tier={b.tier} data-locked={has ? undefined : 'true'}>
                <span aria-hidden="true" className="badge__glyph">
                  {has ? <BadgeIcon size={22} strokeWidth={2.4} /> : <LockedIcon size={18} strokeWidth={2.4} />}
                </span>
                <strong className="badge__name">{b.name}</strong>
                <span className="badge__hint">{b.hint}</span>
                <span className="sr-only">{has ? 'Conseguida' : 'Todavía no'}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
