import type { Metadata } from 'next';
import { LeagueTable } from '@/components/game/LeagueTable';

export const metadata: Metadata = { title: 'Ligas' };

export default function LigasPage() {
  return (
    <div className="screen">
      <h1 className="screen__title">Tu liga</h1>
      <p className="screen__sub">Compite con el XP de los últimos siete días, no con el acumulado.</p>
      <LeagueTable />
    </div>
  );
}
