'use client';

import { Heatmap } from './Heatmap';
import { Mascot } from '@/components/game/mascot/Mascot';
import { DEFAULT_ECONOMY, levelThresholds } from '@/content/engine/economy';
import { useFold } from '@/lib/hooks/useGameState';
import { DEMO_USER_ORDINAL } from '@/mock/boot-client';
import { userAt } from '@/mock/seed';

export function ProfileScreen() {
  const fold = useFold(DEFAULT_ECONOMY);
  if (fold === null) return <div className="skeleton" style={{ height: 420 }} />;

  const b = fold.basis;
  const me = userAt(DEMO_USER_ORDINAL);
  const xp = Math.round(b.totalMilliXp / 1000);
  const thresholds = levelThresholds(DEFAULT_ECONOMY);
  const floor = thresholds[b.level - 1] ?? 0;
  const ceiling = thresholds[b.level] ?? floor + 1;
  // El anillo se acota a [0,1] a propósito: bajar el XP en el Studio puede dejar al usuario por debajo del
  // umbral de su nivel un instante, y un relleno negativo pinta la barra al revés.
  const within = Math.min(1, Math.max(0, (xp - floor) / Math.max(1, ceiling - floor)));

  const stats: readonly { readonly label: string; readonly value: string }[] = [
    { label: 'XP total', value: String(xp) },
    { label: 'Racha actual', value: `${String(b.currentStreak)} d` },
    { label: 'Mejor racha', value: `${String(b.longestStreak)} d` },
    { label: 'Lecciones', value: String(b.lessonsCompleted) },
    { label: 'Perfectas', value: String(b.perfectLessons) },
    {
      label: 'Precisión',
      value: b.weightTotal === 0 ? '—' : `${(b.weightedScoreMilli / b.weightTotal / 10).toFixed(0)}%`,
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Mascot state="idle" size={96} />
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block', fontSize: 'var(--t-18)' }}>{me.displayName}</strong>
          <span style={{ color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
            {me.role} · {me.office}
          </span>
          <div style={{ marginTop: 10 }}>
            <div
              role="progressbar"
              aria-valuenow={Math.round(within * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`Nivel ${String(b.level)}, ${String(xp - floor)} de ${String(ceiling - floor)} XP`}
              className="quest-bar"
            >
              <span className="quest-bar__fill" style={{ transform: `scaleX(${String(within)})` }} />
            </div>
            <span style={{ color: 'var(--fg-muted)', fontSize: 'var(--t-12)' }}>
              Nivel {String(b.level)} · faltan {String(Math.max(0, ceiling - xp))} XP
            </span>
          </div>
        </div>
      </div>

      <dl className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: 12, textAlign: 'center' }}>
            <dt style={{ color: 'var(--fg-muted)', fontSize: 'var(--t-12)' }}>{s.label}</dt>
            <dd className="u-counter" style={{ margin: '2px 0 0', fontSize: 'var(--t-18)', fontWeight: 800 }}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--t-16)' }}>Tus últimos 120 días</h2>
        <Heatmap />
      </section>
    </div>
  );
}
