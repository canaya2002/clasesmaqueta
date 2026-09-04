'use client';

import { useState } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { useFold } from '@/lib/hooks/useGameState';
import { questProgress, questsFor, isQuestComplete } from '@/game/quests';
import { claimQuest } from '@/mock/actions';
import { DEMO_USER_ORDINAL } from '@/mock/boot-client';

export function QuestList() {
  const fold = useFold(DEFAULT_ECONOMY);
  const [error, setError] = useState<string | null>(null);

  if (fold === null) return <div className="skeleton" style={{ height: 240 }} />;

  const quests = questsFor(DEMO_USER_ORDINAL, fold.todayEpochDay, DEFAULT_ECONOMY);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {quests.map((q) => {
        const done = isQuestComplete(q, fold.today);
        const claimed = fold.claimedQuests.has(q.id);
        const at = questProgress(q, fold.today);
        const pct = Math.round((at / q.target) * 100);

        return (
          <div key={q.id} className="card" style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <strong style={{ flex: 1, fontSize: 'var(--t-16)' }}>{q.label}</strong>
              <span className="u-counter" style={{ color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
                {String(at)}/{String(q.target)}
              </span>
            </div>

            {/* La barra es decoración: el número de al lado ya lo dice, y el `role=progressbar` lo anuncia. */}
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${String(at)} de ${String(q.target)} ${q.unit}`}
              className="quest-bar"
            >
              <span className="quest-bar__fill" style={{ transform: `scaleX(${String(at / q.target)})` }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
                <span aria-hidden="true">◆</span> {String(q.gems)} gemas
              </span>
              {claimed ? (
                <span style={{ color: 'var(--fg-success)', fontWeight: 700, fontSize: 'var(--t-14)' }}>
                  Cobrada
                </span>
              ) : (
                <Button3D
                  size="md"
                  variant={done ? 'success' : 'locked'}
                  onClick={() => {
                    const r = claimQuest(DEFAULT_ECONOMY, q);
                    setError(r.ok ? null : r.reason);
                  }}
                >
                  Cobrar
                </Button3D>
              )}
            </div>
          </div>
        );
      })}

      {/* Un fallo que no se dice es un botón roto. Vive fuera del bucle para no repetirse tres veces. */}
      <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 20, color: 'var(--fg-danger)', fontSize: 'var(--t-14)' }}>
        {error}
      </p>
    </div>
  );
}
