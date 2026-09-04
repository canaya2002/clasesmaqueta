import type { Metadata } from 'next';
import { ShopList } from '@/components/game/ShopList';

export const metadata: Metadata = { title: 'Tienda' };

export default function TiendaPage() {
  return (
    <div className="screen">
      <h1 className="screen__title">Tienda</h1>
      <p className="screen__sub">Las gemas salen de las misiones y de las lecciones perfectas.</p>
      <ShopList />
    </div>
  );
}
