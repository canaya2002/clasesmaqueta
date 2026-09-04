import { beforeEach, describe, expect, it } from 'vitest';
import { BUDGET, charCost, EVICTION_ORDER, read, resetDemo, usage, write } from '../persist';

describe('presupuesto de almacenamiento', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('mide en UTF-16, no en bytes UTF-8', () => {
    // "Cobranza con Dignidad" son 21 caracteres: 42 en UTF-16 y 21 en UTF-8. El navegador reserva 42,
    // así que medir con `new Blob([s]).size` subestima la cuota al 50% en casi todo texto en español.
    expect(charCost('Cobranza con Dignidad')).toBe(42);
    expect(charCost('')).toBe(0);
  });

  it('rechaza una escritura que excede su presupuesto en vez de romper la cuota global', () => {
    const tooBig = 'x'.repeat(BUDGET.settings);
    const r = write('settings', tooBig);
    expect(r.kind).toBe('over-budget');
    expect(read('settings')).toBeNull();
  });

  it('escribe y lee por la misma puerta', () => {
    expect(write('meta', '{"v":1}').kind).toBe('ok');
    expect(read('meta')).toBe('{"v":1}');
  });

  it('el orden de desalojo no sacrifica la bitácora antes que los borradores', () => {
    // La bitácora es la pantalla que responde "quién cambió qué": desalojarla primero es el peor
    // resultado posible, aunque sea de lo más voluminoso.
    expect(EVICTION_ORDER.indexOf('content-drafts')).toBeLessThan(EVICTION_ORDER.indexOf('audit'));
    expect(EVICTION_ORDER).not.toContain('progress');
    expect(EVICTION_ORDER).not.toContain('settings');
    expect(EVICTION_ORDER).not.toContain('boot-digest');
  });

  it('resetDemo barre localStorage Y sessionStorage, y no toca claves ajenas', () => {
    // La impersonación vive en sessionStorage: un reset que solo toca localStorage deja al presentador
    // viendo la App como otra persona, con la barra coral encima, delante del cliente.
    write('meta', '1');
    write('settings', '2', 'session');
    window.localStorage.setItem('ajeno', 'no-tocar');
    resetDemo();
    expect(read('meta')).toBeNull();
    expect(read('settings', 'session')).toBeNull();
    expect(window.localStorage.getItem('ajeno')).toBe('no-tocar');
  });

  it('el informe de uso cubre todas las claves con presupuesto', () => {
    expect(usage()).toHaveLength(Object.keys(BUDGET).length);
  });
});
