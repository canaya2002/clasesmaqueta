import Link from 'next/link';
import { MascotSolid } from '@/components/game/mascot/MascotSolid';

/**
 * `/` es la landing, NO el camino.
 *
 * El árbol original ponía `(app)/page.tsx` y `(marketing)/page.tsx`, y los dos resuelven a `/`: Next falla
 * el build con "You cannot have two parallel pages that resolve to the same path". El camino vive en
 * `/aprende` (DECISIONS.md R2).
 *
 * Es también la puerta de entrada de la demo, así que enseña las TRES formas de entrar: como alguien nuevo
 * (el onboarding con su test de nivel), como alguien que ya lleva cuatro meses (el camino de Efraín), y
 * como quien quiere ver las piezas sueltas.
 */
const DOORS = [
  {
    href: '/bienvenida',
    title: 'Empezar de cero',
    body: 'Onboarding de cinco pasos con test de nivel real, calificado por el mismo motor que las lecciones.',
    cta: 'Hacer el onboarding',
  },
  {
    href: '/aprende',
    title: 'Entrar como Efraín',
    body: 'Recepcionista en CDMX, cuatro meses de historia: 119 lecciones, racha de 21 días, nivel 30.',
    cta: 'Ir a su camino',
  },
  {
    href: '/studio/dashboard',
    title: 'Entrar al Studio',
    body: 'El otro lado: 1,247 personas, la analítica derivada del mismo índice, y la economía editable en vivo.',
    cta: 'Abrir el Studio',
  },
  {
    href: '/kitchen-sink',
    title: 'Ver las piezas',
    body: 'Las siete dinámicas jugables, los nueve estados de la mascota y las micro-interacciones.',
    cta: 'Abrir el kitchen sink',
  },
] as const;

export default function MarketingPage(): React.ReactElement {
  return (
    <main className="landing">
      {/* La silueta estática, no el rig animado: la landing tiene presupuesto de 132 KB y montar `Mascot`
          la subía a 158 para enseñar una pose fija.

          Y va PEQUEÑA. Una mascota de 132 px de ancho encima de un título de 48 px convierte la portada en
          un dibujo con texto debajo; el trabajo de la portada es explicar qué es esto en dos líneas. */}
      <MascotSolid size={64} fill="var(--bg-primary)" />
      <h1 className="landing__title">SENDA</h1>
      <p className="landing__sub">
        Un repo, dos productos. La App que el alumno abre y el Studio con el que se administra: tres
        cursos sobre riesgo operativo real, 190 lecciones y 1,247 personas.
      </p>

      <ul className="landing__doors">
        {DOORS.map((d) => (
          <li key={d.href}>
            <Link href={d.href} className="landing__door">
              <strong>{d.title}</strong>
              <span>{d.body}</span>
              <em>{d.cta} →</em>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
