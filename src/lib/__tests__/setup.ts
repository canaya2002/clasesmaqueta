/**
 * Setup de vitest.
 *
 * `cleanup` tras cada test es obligatorio desde la fase 3: los componentes de juego instalan listeners en
 * `window` y temporizadores, y un árbol que no se desmonta los deja corriendo en el siguiente test — que
 * es exactamente la clase de fallo intermitente que luego se culpa al "orden de los tests".
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// jsdom no implementa ninguna de estas tres, y los componentes de juego las usan en camino caliente.
if (typeof window !== 'undefined') {
  if (window.matchMedia === undefined) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }
  if (typeof HTMLDialogElement !== 'undefined') {
    // jsdom conoce el elemento pero `showModal` lanza "Not implemented". Se define con `defineProperty`
    // en vez de asignar sobre el prototipo para no LEER el metodo: leerlo dispara `unbound-method`, que
    // esta encendido a proposito porque desprender un metodo de su objeto es un fallo real en codigo de app.
    const proto = HTMLDialogElement.prototype;
    Object.defineProperty(proto, 'showModal', {
      configurable: true,
      writable: true,
      value: function showModal(this: HTMLDialogElement): void {
        this.open = true;
      },
    });
    Object.defineProperty(proto, 'close', {
      configurable: true,
      writable: true,
      value: function close(this: HTMLDialogElement): void {
        this.open = false;
        this.dispatchEvent(new Event('close'));
      },
    });
  }
}
