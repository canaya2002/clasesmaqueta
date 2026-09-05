/**
 * El onboarding, RECORRIDO pulsando. Es el test que faltaba.
 *
 * Había pruebas unitarias del gate y pasaban las cinco — porque afirmaban el comportamiento equivocado:
 * `expect(furthestAllowed(INITIAL)).toBe('bienvenida')`. Con eso, pulsar "Empezar" ponía `?paso=puesto` y
 * el recorte lo devolvía a la bienvenida; como los botones de puesto viven en esa pantalla, no había forma
 * de elegir uno y la pantalla entera estaba en bloqueo. Cinco controles muertos y la suite en verde.
 *
 * Una prueba que interroga la lógica hereda las suposiciones de quien la escribió. Una que PULSA, no.
 */

import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { MotionRoot } from '@/design/MotionRoot';
import { Onboarding } from '../Onboarding';
import { ROLE_OPTIONS } from '@/game/onboarding';
import { resetClientBoot } from '@/mock/boot-client';
import { resetWorld } from '@/mock/db';
import { resetDemo } from '@/mock/persist';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

function mount() {
  resetDemo();
  resetWorld();
  resetClientBoot();
  push.mockClear();
  return render(
    <NuqsTestingAdapter>
      <MotionRoot>
        <Onboarding />
      </MotionRoot>
    </NuqsTestingAdapter>,
  );
}

function click(name: RegExp | string): void {
  const el = screen.getByText(name);
  const button = el.closest('button');
  act(() => {
    (button ?? el).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('el onboarding se puede recorrer', () => {
  it('«Empezar» lleva de verdad a elegir puesto', async () => {
    mount();
    expect(screen.getByText('Bienvenido a SENDA')).toBeDefined();

    click('Empezar');

    // El fallo original: la pantalla no cambiaba nunca.
    expect(await screen.findByText('¿Qué haces en el despacho?')).toBeDefined();
    for (const r of ROLE_OPTIONS) expect(screen.getByText(r.label)).toBeDefined();
  });

  it('cada elección abre la siguiente pantalla, hasta el test de nivel', async () => {
    mount();
    click('Empezar');
    await screen.findByText('¿Qué haces en el despacho?');

    click('Atiendo al público');
    expect(await screen.findByText('¿Cuánto quieres practicar?')).toBeDefined();

    click('Constante · 7 min');
    expect(await screen.findByText(/Vamos a ver por dónde empiezas/)).toBeDefined();
    // Y el test trae una pregunta REAL del catálogo, no un texto de relleno.
    expect(screen.getByText(/Pregunta 1 de/)).toBeDefined();
  });

  it('«Prefiero empezar desde el principio» salta de verdad al resultado', async () => {
    mount();
    click('Empezar');
    await screen.findByText('¿Qué haces en el despacho?');
    click('Manejo expedientes');
    await screen.findByText('¿Cuánto quieres practicar?');
    click('Tranquilo · 3 min');
    await screen.findByText(/Vamos a ver por dónde empiezas/);

    click('Prefiero empezar desde el principio');

    // Sin el evento SKIP_TEST este botón devolvía a la misma pregunta.
    expect(await screen.findByText('Empezamos por el principio')).toBeDefined();
  });

  it('el botón final sale del onboarding', async () => {
    mount();
    click('Empezar');
    await screen.findByText('¿Qué haces en el despacho?');
    click('Veo pagos y cobranza');
    await screen.findByText('¿Cuánto quieres practicar?');
    click('Serio · 12 min');
    await screen.findByText(/Vamos a ver por dónde empiezas/);
    click('Prefiero empezar desde el principio');
    await screen.findByText('Empezamos por el principio');

    click('Ir a mi camino');
    expect(push).toHaveBeenCalledWith('/aprende');
  });
});
