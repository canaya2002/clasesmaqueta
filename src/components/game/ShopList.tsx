'use client';

import { useState } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { useFold, useHearts } from '@/lib/hooks/useGameState';
import { shopItems } from '@/game/shop';
import { buyItem } from '@/mock/actions';

export function ShopList() {
  const fold = useFold(DEFAULT_ECONOMY);
  const hearts = useHearts(DEFAULT_ECONOMY);
  const [message, setMessage] = useState<string | null>(null);

  if (fold === null || hearts === null) return <div className="skeleton" style={{ height: 280 }} />;

  const items = shopItems(DEFAULT_ECONOMY, fold.basis, hearts.current >= hearts.max, hearts.unlimited);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((item) => (
        <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span aria-hidden="true" style={{ fontSize: 28, width: 40, textAlign: 'center' }}>
            {item.glyph}
          </span>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: 'var(--t-16)' }}>{item.name}</strong>
            <span style={{ color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>{item.body}</span>
            {/* El motivo del bloqueo va SIEMPRE visible, no en un tooltip: en móvil no hay hover. */}
            {item.blocked !== null && (
              <span style={{ display: 'block', marginTop: 4, color: 'var(--fg-warning)', fontSize: 'var(--t-12)' }}>
                {item.blocked}
              </span>
            )}
          </div>
          <Button3D
            size="md"
            variant={item.blocked === null ? 'primary' : 'locked'}
            onClick={() => {
              const r = buyItem(DEFAULT_ECONOMY, item.id);
              setMessage(r.ok ? `Listo: ${item.name.toLocaleLowerCase('es-MX')}` : r.reason);
            }}
          >
            ◆ {String(item.price)}
          </Button3D>
        </div>
      ))}
      <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 20, fontSize: 'var(--t-14)' }}>
        {message}
      </p>
    </div>
  );
}
