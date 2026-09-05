import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Onboarding } from '@/components/game/Onboarding';

export const metadata: Metadata = { title: 'Bienvenida' };

/**
 * Renderizado por petición, no prerenderizado.
 *
 * `useQueryState` lee los parámetros de búsqueda, y en una página estática Next no los tiene: sirve el
 * `fallback` del Suspense y espera a la hidratación. El resultado era que `/bienvenida` llegaba como un
 * rectángulo gris y solo se convertía en algo cuando el JavaScript terminaba de cargar — indistinguible de
 * una pantalla rota si la red va lenta o si algo falla al hidratar.
 *
 * Con render por petición, la primera pantalla viaja YA en el HTML.
 */
export const dynamic = 'force-dynamic';

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
