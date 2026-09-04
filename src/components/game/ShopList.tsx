'use client';

import { useState } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { useEconomy } from '@/lib/hooks/useEconomy';
import { useFold, useHearts } from '@/lib/hooks/useGameState';
import { shopItems } from '@/game/shop';
import { buyItem } from '@/mock/actions';
import { FreezeIcon, GemIcon, HeartIcon, UnlimitedIcon } from '@/components/ui/icons';

const SHOP_ICON = {
  'heart-refill': HeartIcon,
  'streak-freeze': FreezeIcon,
  'unlimited-hearts': UnlimitedIcon,
} as const;

export function ShopList() {
  const econ = useEconomy();
  const fold = useFold(econ);
  const hearts = useHearts(econ);
  const [message, setMessage] = useState<string | null>(null);

  if (fold === null || hearts === null) return <div className="skeleton" style={{ height: 280 }} />;

  const items = shopItems(econ, fold.basis, hearts.current >= hearts.max, hearts.unlimited);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((item) => (
        <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="shop-item__icon" aria-hidden="true">
            {(() => {
              const Icon = SHOP_ICON[item.id];
              return <Icon size={24} strokeWidth={2.4} />;
            })()}
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
              const r = buyItem(econ, item.id);
              setMessage(r.ok ? `Listo: ${item.name.toLocaleLowerCase('es-MX')}` : r.reason);
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <GemIcon size={16} strokeWidth={2.6} aria-hidden="true" /> {String(item.price)}
            </span>
          </Button3D>
        </div>
      ))}
      <p role="status" aria-live="polite" style={{ margin: 0, minHeight: 20, fontSize: 'var(--t-14)' }}>
        {message}
      </p>
    </div>
  );
}
