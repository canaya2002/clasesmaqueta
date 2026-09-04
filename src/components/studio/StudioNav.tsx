'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const STUDIO_LINKS = [
  { href: '/studio/dashboard', label: 'Panel' },
  { href: '/studio/users', label: 'Personas' },
  { href: '/studio/gamification', label: 'Gamificación' },
] as const;

export function StudioNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones del Studio" className="studio__nav">
      {STUDIO_LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={pathname === l.href ? 'page' : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
