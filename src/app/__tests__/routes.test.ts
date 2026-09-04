/**
 * Ninguna ruta enlazada lleva a una pantalla que no existe.
 *
 * Es un requisito literal del proyecto —"nada de rutas que lleven a una pantalla vacía"— y es el que más
 * fácil se rompe sin que nadie lo note: se añade un destino a la navegación pensando en construirlo
 * después, y el 404 solo aparece si alguien pulsa ahí durante la demo.
 *
 * Se cruza contra el ÁRBOL DE ARCHIVOS y no contra una lista escrita a mano, porque una lista escrita a
 * mano es otra cosa más que se puede quedar desincronizada.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DESTINATIONS } from '@/components/ui/AppNav';
import { STUDIO_LINKS } from '@/components/studio/StudioNav';

const APP = resolve(process.cwd(), 'src/app');

/** Las rutas reales, con los grupos `(x)` quitados: no aparecen en la URL. */
function routesOnDisk(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry === '__tests__') continue;
    const segment = entry.startsWith('(') && entry.endsWith(')') ? '' : `/${entry}`;
    const here = prefix + segment;
    if (existsSync(join(full, 'page.tsx'))) out.push(here === '' ? '/' : here);
    out.push(...routesOnDisk(full, here));
  }
  return out;
}

const routes = new Set(routesOnDisk(APP));

describe('el enlazado', () => {
  it('cada destino de la navegación tiene su página', () => {
    const missing = DESTINATIONS.map((d) => d.href).filter((href) => !routes.has(href));
    expect(missing).toEqual([]);
  });

  it('la raíz y el reproductor existen', () => {
    expect(routes.has('/')).toBe(true);
    expect([...routes].some((r) => r.startsWith('/leccion/'))).toBe(true);
  });

  it('cada destino del Studio tiene su página', () => {
    const missing = STUDIO_LINKS.map((l) => l.href).filter((href) => !routes.has(href));
    expect(missing).toEqual([]);
  });

  it('las pantallas que el HUD y el camino enlazan existen', () => {
    // `/perfil` y `/logros` no están en la barra pero sí se enlazan desde el perfil y el resumen.
    for (const r of ['/perfil', '/logros', '/practica']) expect(routes.has(r)).toBe(true);
  });
});
