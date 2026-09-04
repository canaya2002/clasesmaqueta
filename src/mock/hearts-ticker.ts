'use client';

/**
 * El TICKER de la cuenta regresiva, fuera de React.
 *
 * Tres decisiones que un `setInterval(fn, 250)` dentro del componente no da:
 *
 * - **1 Hz alineado al borde de segundo, no 4 Hz.** El dígito de los segundos cambia una vez por segundo;
 *   repintar cuatro veces para enseñar lo mismo son tres repintados tirados. Se reprograma con
 *   `msLeft % 1000` para no acumular deriva, en vez de un intervalo fijo que se desfasa.
 * - **El valor SIEMPRE se recalcula desde el registro**, nunca decrementando. Un contador que se decrementa
 *   se desincroniza en cuanto la pestaña se va a segundo plano y el navegador estrangula los temporizadores.
 * - **Se detiene solo** cuando los corazones están llenos o hay potenciador vigente. Un temporizador que
 *   sigue corriendo sin nada que contar es la fuga que aparece en el perfil de una demo de veinte minutos.
 */

import { msUntilNextHeart } from '@/content/engine/hearts';
import type { EconomyConfig } from '@/content/engine/economy';
import { configFrom, dispatchHearts, sampleNow } from './hearts';

type Listener = (msLeft: number | null) => void;

const listeners = new Set<Listener>();
let timer: ReturnType<typeof setTimeout> | null = null;
let config: EconomyConfig | null = null;

function emit(): void {
  const econ = config;
  if (econ === null) return;
  const cfg = configFrom(econ);
  const s = sampleNow();
  // `tick` acumula: si mientras la pestaña estaba oculta venció un intervalo, el corazón se otorga aquí.
  const record = dispatchHearts(econ, { type: 'tick' });
  const left = msUntilNextHeart(record, s, cfg);
  for (const fn of listeners) fn(left);
  schedule(left);
}

function schedule(msLeft: number | null): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (msLeft === null || listeners.size === 0) return;
  timer = setTimeout(emit, msLeft % 1000 || 1000);
}

export function startHeartsTicker(econ: EconomyConfig, fn: Listener): () => void {
  config = econ;
  listeners.add(fn);
  emit();

  // Volver a la pestaña recalcula de inmediato: el temporizador estrangulado puede llevar minutos parado.
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') emit();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pageshow', onVisible);

  return () => {
    listeners.delete(fn);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pageshow', onVisible);
    if (listeners.size === 0 && timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
