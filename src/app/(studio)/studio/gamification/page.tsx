import type { Metadata } from 'next';
import { EconomyForm } from '@/components/studio/EconomyForm';

export const metadata: Metadata = { title: 'Gamificación · Studio' };

export default function GamificationPage() {
  return (
    <>
      <h1>Gamificación</h1>
      <p className="studio__sub">
        El contenido guarda pesos, no XP. Por eso mover un número aquí cambia la historia entera sin tocar
        una sola lección.
      </p>
      <EconomyForm />
    </>
  );
}
