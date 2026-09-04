import type { Metadata } from 'next';
import { QuestList } from '@/components/game/QuestList';

export const metadata: Metadata = { title: 'Misiones' };

export default function MisionesPage() {
  return (
    <div className="screen">
      <h1 className="screen__title">Misiones de hoy</h1>
      <p className="screen__sub">Se renuevan a las 4 de la mañana, cuando cambia el día en tu oficina.</p>
      <QuestList />
    </div>
  );
}
