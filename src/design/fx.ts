/**
 * SENDA — fachada de efectos imperativos.
 *
 * Confetti, partículas, shake y sonido no son variants, así que no los cubre el intercambio de catálogo de
 * `motion.ts`. Sin este archivo, el confetti se queda sin degradar: casi nadie lo degrada, porque no vive
 * en el sistema de animación sino en un `import` suelto dentro de la pantalla de resumen.
 *
 * ESLint prohíbe importar `canvas-confetti` fuera de aquí.
 */

import { audioBus } from '@/lib/audio/synth';
import { COMBO_BLAZE_AT, COMBO_CEILING, COMBO_SCALE, type SfxId } from './sound';

/**
 * La preferencia de movimiento se resuelve AQUÍ y de forma perezosa, no se recibe empujada.
 *
 * Antes la empujaba `<MotionRoot>` con un `useEffect`, y ese es el orden equivocado: React ejecuta los
 * efectos de ABAJO ARRIBA dentro de un commit —los hijos primero, el ancestro al final—, así que cualquier
 * efecto de un hijo que dispare confeti o un destello en el primer commit corre con el valor inicial. El
 * valor inicial era `false`. Para un usuario fotosensible que abre la app con `prefers-reduced-motion`
 * activo, eso significa exactamente el destello que la preferencia existe para evitar.
 *
 * Ahora se consulta al medio la primera vez que hace falta. `override` sigue existiendo para las pruebas y
 * para el conmutador del Studio, pero ya no es el camino por defecto.
 */
let override: boolean | null = null;
let cached: boolean | null = null;

/** Fuerza el valor. Solo para pruebas y para el conmutador manual: la preferencia real no se empuja. */
export function setReducedMotion(value: boolean | null): void {
  override = value;
}

export function isReducedMotion(): boolean {
  if (override !== null) return override;
  if (cached !== null) return cached;
  cached =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return cached;
}

/** Invalida la lectura cacheada. La llama `MotionRoot` cuando el medio cambia en caliente. */
export function refreshReducedMotion(): void {
  cached = null;
}

export interface Origin {
  readonly x: number;
  readonly y: number;
}

/**
 * Confetti solo en takeovers, donde nada más se mueve.
 *
 * La regla numérica: si hay 2 o más animaciones de UI activas al mismo tiempo, se usan partículas DOM
 * (`burst`), no confetti. Tener dos implementaciones con una regla objetiva es la decisión; el default es
 * usar canvas-confetti para todo porque es una línea.
 */
export async function confetti(origin: Origin, wave: 1 | 2 = 1): Promise<void> {
  if (isReducedMotion()) return;
  // El contexto 2D puede no existir: modos de privacidad que bloquean canvas, aceleracion desactivada,
  // entornos sin canvas. `canvas-confetti` no lo comprueba y estalla en su primer frame, DESPUES de que la
  // pantalla de recompensa ya se pinto — una excepcion sin capturar en la mejor pantalla de la demo.
  if (document.createElement('canvas').getContext('2d') === null) return;
  const mod = await import('canvas-confetti');
  const fire = mod.default;
  const common = {
    origin,
    disableForReducedMotion: true,
    colors: ['#B6F03C', '#6C4CF1', '#FFB020', '#3DD68C'],
    scalar: 0.9,
  };
  void fire({ ...common, particleCount: 60, spread: 62, startVelocity: 42 });
  if (wave === 2) {
    window.setTimeout(() => {
      void fire({ ...common, particleCount: 30, spread: 90, startVelocity: 30 });
    }, 260);
  }
}

const BURST_COUNT = 14;

/**
 * Partículas en DOM: 14 spans de 6px de un pool premontado, `will-change` encendido 700ms y apagado.
 * El presupuesto es auditable en un PR, que es el punto de que sea un número y no "unas cuantas".
 */
export function burst(el: Element): void {
  if (isReducedMotion()) return;
  const host = document.createElement('div');
  host.setAttribute('data-fx', 'burst');
  host.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:60;contain:layout paint;will-change:transform';
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < BURST_COUNT; i += 1) {
    const p = document.createElement('span');
    const angle = (i / BURST_COUNT) * Math.PI * 2;
    const dist = 46 + (i % 3) * 14;
    p.style.cssText =
      `position:absolute;left:${cx}px;top:${cy}px;width:6px;height:6px;border-radius:999px;` +
      `background:var(--bg-xp-solid);transform:translate3d(-50%,-50%,0) scale(1);opacity:1;` +
      `transition:transform 520ms cubic-bezier(.2,.7,.3,1),opacity 520ms linear`;
    host.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transform =
        `translate3d(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px), 0) scale(0.3)`;
      p.style.opacity = '0';
    });
  }
  document.body.appendChild(host);
  window.setTimeout(() => host.remove(), 700);
}

/** Shake imperativo. Con movimiento reducido se convierte en un destello de borde, no en un fade. */
export function shake(el: HTMLElement): void {
  const soft = isReducedMotion();
  el.setAttribute('data-shake', soft ? 'flash' : 'x');
  window.setTimeout(() => el.removeAttribute('data-shake'), soft ? 240 : 320);
}

/**
 * Sonido. NO consulta el modo reducido: sonido y movimiento son ejes distintos.
 * Es más: en las cinemáticas el audio COMPENSA la pérdida visual, y por eso el ascenso de tono del combo
 * se conserva íntegro con movimiento reducido.
 */
export function play(id: SfxId, opts: { readonly pitch?: number; readonly gain?: number } = {}): void {
  audioBus.play(id, opts);
}

/** El combo recorre la pentatónica; a partir del techo solo sube la ganancia (modo "en llamas"). */
export function playCombo(comboRun: number): void {
  const index = Math.min(Math.max(comboRun, 1), COMBO_CEILING) - 1;
  const base = COMBO_SCALE[0] ?? 587.33;
  const freq = COMBO_SCALE[index] ?? base;
  const blaze = comboRun >= COMBO_BLAZE_AT;
  audioBus.play('combo', { pitch: freq / base, gain: blaze ? 1.35 : 1 });
}

export function duck(amount: number, durationMs: number): void {
  audioBus.duck(amount, durationMs);
}
