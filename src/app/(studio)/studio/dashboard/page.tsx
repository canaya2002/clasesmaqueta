import type { Metadata } from 'next';
import { Dashboard } from '@/components/studio/Dashboard';

export const metadata: Metadata = { title: 'Panel · Studio' };

export default function DashboardPage() {
  return (
    <>
      <h1>Panel</h1>
      <p className="studio__sub">1,247 personas, 120 días de historia. Todo derivado del mismo índice.</p>
      <Dashboard />
    </>
  );
}
