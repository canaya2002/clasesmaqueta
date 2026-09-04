'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from '@/design/m';
import { useVariant } from '@/design/MotionRoot';

/**
 * La navegación de la App: barra inferior en móvil, riel lateral desde 900 px.
 *
 * Es UN componente y no dos porque los dos árboles tendrían que mantenerse en paralelo, y el que se rompe
 * es siempre el que no se está mirando. Lo que cambia entre tamaños es CSS, no estructura, así que el orden
 * de tabulación y el árbol de accesibilidad son idénticos en los dos.
 *
 * `aria-current="page"` y no una clase: el lector de pantalla anuncia "página actual" sin que haya que
 * escribirlo en el texto, y el estilo cuelga del atributo, así que no pueden desincronizarse.
 */
const DESTINATIONS = [
  { href: '/aprende', label: 'Aprender', glyph: '◆' },
  { href: '/practica', label: 'Practicar', glyph: '⟳' },
  { href: '/ligas', label: 'Ligas', glyph: '⬢' },
  { href: '/misiones', label: 'Misiones', glyph: '✦' },
  { href: '/tienda', label: 'Tienda', glyph: '◈' },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const active = useVariant('navActive');

  return (
    <nav aria-label="Secciones de SENDA" className="app-nav">
      <ul className="app-nav__list">
        {DESTINATIONS.map((d) => {
          const current = pathname === d.href || pathname.startsWith(`${d.href}/`);
          return (
            <li key={d.href}>
              <Link
                href={d.href}
                aria-current={current ? 'page' : undefined}
                className="app-nav__item"
                data-mi="19"
              >
                <motion.span
                  aria-hidden="true"
                  className="app-nav__glyph"
                  variants={active}
                  initial={false}
                  animate={current ? 'on' : 'off'}
                >
                  {d.glyph}
                </motion.span>
                <span className="app-nav__label">{d.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
