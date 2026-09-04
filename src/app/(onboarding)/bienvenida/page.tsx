import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Onboarding } from '@/components/game/Onboarding';

export const metadata: Metadata = { title: 'Bienvenida' };

/**
 * El onboarding vive FUERA del grupo `(app)`: no lleva HUD ni navegación.
 *
 * Enseñar la racha y las gemas a quien todavía no ha contestado nada es enseñar tres ceros, y la primera
 * impresión del producto pasa a ser "aquí no hay nada".
 *
 * El `Suspense` es obligatorio: `useQueryState` de nuqs lee los parámetros de búsqueda, y Next exige un
 * límite de suspense alrededor de cualquier componente que lo haga o el build falla al prerenderizar.
 */
export default function BienvenidaPage() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: '100dvh' }} />}>
      <Onboarding />
    </Suspense>
  );
}
