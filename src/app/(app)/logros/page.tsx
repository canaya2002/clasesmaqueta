import type { Metadata } from 'next';
import { BadgeGrid } from '@/components/game/BadgeGrid';

export const metadata: Metadata = { title: 'Logros' };

export default function LogrosPage() {
  return (
    <div className="screen">
      <h1 className="screen__title">Logros</h1>
      <p className="screen__sub">Las que faltan también se ven: saber que existen es la mitad del incentivo.</p>
      <BadgeGrid />
    </div>
  );
}
