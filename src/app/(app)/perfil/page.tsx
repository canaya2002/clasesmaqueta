import type { Metadata } from 'next';
import { ProfileScreen } from '@/components/game/ProfileScreen';

export const metadata: Metadata = { title: 'Perfil' };

export default function PerfilPage() {
  return (
    <div className="screen">
      <h1 className="screen__title">Tu perfil</h1>
      <ProfileScreen />
    </div>
  );
}
