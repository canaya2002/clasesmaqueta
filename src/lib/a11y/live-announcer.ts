'use client';

/**
 * Control de caudal para las regiones aria-live.
 *
 * Dos cosas que un `<div aria-live>` a secas no resuelve:
 *
 * 1. **Los lectores no encolan de verdad los mensajes polite.** NVDA y VoiceOver REEMPLAZAN el texto
 *    pendiente; JAWS a veces encola y sigue hablando veinte segundos después de que el usuario terminó.
 *    Un anuncio de movimiento tarda 1.2–1.6 s en locutarse, así que mover una ficha ocho posiciones con la
 *    flecha genera ocho mensajes de los que solo importa el último. Se acumula un borde de SALIDA de 400 ms
 *    y se anuncia únicamente el destino.
 *
 * 2. **Un texto idéntico al anterior no se vuelve a anunciar.** Añadir un contador invisible no sirve: el
 *    lector lo locuta. Se alternan DOS nodos, así que el cambio siempre ocurre en un nodo que estaba vacío.
 */

export interface LiveState {
  readonly a: string;
  readonly b: string;
}

export const EMPTY_LIVE: LiveState = { a: '', b: '' };

const TRAILING_MS = 400;

export class LiveAnnouncer {
  private slot: 'a' | 'b' = 'a';
  private timer: number | null = null;
  private pending: string | null = null;

  constructor(private readonly emit: (next: LiveState) => void) {}

  /** Mensaje inmediato: correcciones y cambios de estado que el usuario debe oír ya. */
  now(text: string): void {
    this.cancel();
    this.write(text);
  }

  /** Mensaje de interacción: se agrupa y solo se locuta el último tras 400 ms de silencio. */
  trailing(text: string): void {
    this.pending = text;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      const value = this.pending;
      this.pending = null;
      this.timer = null;
      if (value !== null) this.write(value);
    }, TRAILING_MS);
  }

  /** Tira la cola pendiente. Se llama antes de escribir en la región assertive. */
  cancel(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
  }

  private write(text: string): void {
    // Alternar nodos vence la deduplicación por texto idéntico de los lectores.
    this.slot = this.slot === 'a' ? 'b' : 'a';
    this.emit(this.slot === 'a' ? { a: text, b: '' } : { a: '', b: text });
  }
}
