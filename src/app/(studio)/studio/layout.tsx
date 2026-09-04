import type { ReactNode } from 'react';
import Link from 'next/link';
import { StudioNav } from '@/components/studio/StudioNav';

/**
 * SENDA Studio: el MISMO repo, el mismo motor y el mismo contenido, otra piel.
 *
 * Es denso donde la App es generosa: tipografía menor, más filas por pantalla, sin animación ambiente. No
 * es otro producto, es el mismo visto por quien administra en vez de por quien aprende — y la prueba de
 * que la tesis se sostiene es que ninguna de estas pantallas tiene su propia copia de los datos.
 */
export default function StudioLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="studio">
      <header className="studio__bar">
        <Link href="/studio/dashboard" className="studio__brand">
          SENDA <span>Studio</span>
        </Link>
        <StudioNav />
        <Link href="/aprende" className="studio__exit">
          Ver como alumno
        </Link>
      </header>
      <main className="studio__main">{children}</main>
    </div>
  );
}
