import { describe, expect, it } from 'vitest';
import { INITIAL, clampStep, furthestAllowed, onboardingReducer } from '../onboarding';

const NEEDED = 4;

describe('el onboarding', () => {
  it('empieza en la bienvenida y no deja saltar', () => {
    expect(furthestAllowed(INITIAL, NEEDED)).toBe('bienvenida');
    // Un `?paso=test` pegado en la barra de direcciones no puede saltarse la elección de puesto: el test
    // no sabría de qué unidades sacar las preguntas.
    expect(clampStep('test', INITIAL, NEEDED)).toBe('bienvenida');
  });

  it('cada elección abre exactamente un paso más', () => {
    const conRol = onboardingReducer(INITIAL, { type: 'PICK_ROLE', role: 'recepcion' });
    expect(furthestAllowed(conRol, NEEDED)).toBe('meta');
    expect(clampStep('test', conRol, NEEDED)).toBe('meta');

    const conMeta = onboardingReducer(conRol, { type: 'PICK_GOAL', xp: 40 });
    expect(furthestAllowed(conMeta, NEEDED)).toBe('test');
    expect(clampStep('listo', conMeta, NEEDED)).toBe('test');
  });

  it('el test termina cuando se contestan todas las preguntas', () => {
    let s = onboardingReducer(INITIAL, { type: 'PICK_ROLE', role: 'cobranza' });
    s = onboardingReducer(s, { type: 'PICK_GOAL', xp: 70 });
    for (let i = 0; i < NEEDED; i += 1) {
      s = onboardingReducer(s, { type: 'PROBE', unitIndex: i * 3, correct: i < 2 });
    }
    expect(s.probes).toHaveLength(NEEDED);
    expect(furthestAllowed(s, NEEDED)).toBe('listo');
  });

  it('un paso desconocido en la URL cae a la bienvenida en vez de romper', () => {
    expect(clampStep('inventado', INITIAL, NEEDED)).toBe('bienvenida');
    expect(clampStep(null, INITIAL, NEEDED)).toBe('bienvenida');
  });

  it('retroceder siempre se permite', () => {
    let s = onboardingReducer(INITIAL, { type: 'PICK_ROLE', role: 'recepcion' });
    s = onboardingReducer(s, { type: 'PICK_GOAL', xp: 40 });
    expect(clampStep('puesto', s, NEEDED)).toBe('puesto');
  });
});
