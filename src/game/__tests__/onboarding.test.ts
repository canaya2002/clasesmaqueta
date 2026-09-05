import { describe, expect, it } from 'vitest';
import { INITIAL, clampStep, furthestAllowed, onboardingReducer } from '../onboarding';

const NEEDED = 4;

describe('el onboarding', () => {
  it('desde el estado inicial se puede llegar a elegir puesto, y no más lejos', () => {
    // Esta aserción decía `'bienvenida'` y era el BUG: si el estado inicial no da derecho a `puesto`,
    // pulsar "Empezar" se recorta de vuelta a la bienvenida y los botones de puesto —que viven en esa
    // pantalla— nunca se pueden pulsar. La pantalla entera quedaba en bloqueo con la suite en verde.
    expect(furthestAllowed(INITIAL, NEEDED)).toBe('puesto');
    expect(clampStep('puesto', INITIAL, NEEDED)).toBe('puesto');

    // Pero un `?paso=test` pegado en la barra de direcciones sí se recorta: el test de nivel no sabría de
    // qué unidades sacar las preguntas sin un curso elegido.
    expect(clampStep('test', INITIAL, NEEDED)).toBe('puesto');
  });

  it('saltarse el test lleva al resultado sin haberlo contestado', () => {
    let s = onboardingReducer(INITIAL, { type: 'PICK_ROLE', role: 'recepcion' });
    s = onboardingReducer(s, { type: 'PICK_GOAL', xp: 40 });
    expect(clampStep('listo', s, NEEDED)).toBe('test');
    s = onboardingReducer(s, { type: 'SKIP_TEST' });
    expect(clampStep('listo', s, NEEDED)).toBe('listo');
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
