import type { Metadata } from 'next';
import { PathScreen } from '@/components/game/PathScreen';

export const metadata: Metadata = { title: 'Aprender' };

/**
 * El `<h1>` se pinta desde HTML ESTÁTICO, no desde la isla cliente.
 *
 * Es la única forma de que el candidato a LCP exista antes de que arranque el mundo mockeado. Si el título
 * viviera dentro de `PathScreen`, el primer paint sería el esqueleto y el LCP se mediría contra él — un
 * esqueleto que "carga rápido" no es una pantalla que aparece rápido.
 */
export default function AprendePage() {
  return (
    <>
      <div className="path-banner">
        <p className="path-banner__eyebrow">Tu camino</p>
        <h1 className="path-banner__title">Primer Contacto</h1>
        <p className="path-banner__sub">
          Contestar, calificar y transferir sin perder a nadie en el intento.
        </p>
      </div>
      <PathScreen />
    </>
  );
}
