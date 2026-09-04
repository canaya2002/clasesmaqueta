import type { Metadata } from 'next';
import { PracticeScreen } from '@/components/game/PracticeScreen';

export const metadata: Metadata = { title: 'Practicar' };

export default function PracticaPage() {
  return (
    <div className="screen">
      <h1 className="screen__title">Practicar</h1>
      <p className="screen__sub">
        Lo que peor te salió, primero. La práctica no cuesta corazones ni rompe tu racha.
      </p>
      <PracticeScreen />
    </div>
  );
}
