import type { ReactNode } from 'react';
import { AppHud } from '@/components/game/AppHud';
import { AppNav } from '@/components/ui/AppNav';

/**
 * El armazón de la App del alumno.
 *
 * El HUD y la navegación viven aquí y no en cada pantalla: montarlos por ruta los desmontaría y remontaría
 * en cada navegación, con lo que la racha y las gemas parpadearían al cambiar de pestaña y el nodo con
 * `layoutId` del camino perdería su origen de transición.
 */
export default function AppLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppHud />
      <main className="app-shell__main">{children}</main>
      <AppNav />
    </div>
  );
}
