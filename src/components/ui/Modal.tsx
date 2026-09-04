'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from '@/design/m';
import { useVariant } from '@/design/MotionRoot';

/**
 * Modal sobre `<dialog>` nativo y `showModal()`.
 *
 * No es pereza: `showModal()` da gratis y bien tres cosas que una implementación manual hace mal casi
 * siempre — atrapa el foco de verdad (incluido el foco del navegador y de las extensiones), vuelve INERTE
 * el resto del documento sin tener que recorrerlo poniendo `aria-hidden`, y sube el nodo a la capa superior
 * para que ningún `z-index` del árbol lo tape.
 *
 * `onCancel` intercepta Escape para que cerrar por teclado pase por el mismo camino que el botón.
 */
export interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  /** Elemento que recibe el foco al abrir. Sin esto el foco cae al primer tabulable, que suele ser cerrar. */
  readonly initialFocus?: 'first' | 'none';
  /**
   * `false` desarma Escape.
   *
   * El modal de "sin corazones" no es una interrupcion que se descarta: es un estado del juego con tres
   * salidas, y cerrarlo con Escape devolveria al alumno a un ejercicio que no puede contestar.
   */
  readonly dismissable?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  initialFocus = 'first',
  dismissable = true,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const inVariant = useVariant('modalIn');

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    if (open && !el.open) {
      el.showModal();
      if (initialFocus === 'first') {
        const target = bodyRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea');
        target?.focus();
      }
    }
    if (!open && el.open) el.close();
  }, [open, initialFocus]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissable) onClose();
      }}
      onClose={onClose}
      style={{
        padding: 0,
        border: 0,
        background: 'transparent',
        maxWidth: 'min(92vw, 460px)',
        color: 'var(--fg-default)',
      }}
    >
      <motion.div
        ref={bodyRef}
        data-mi="19"
        variants={inVariant}
        initial="out"
        animate="in"
        style={{
          padding: 24,
          borderRadius: 'var(--r-xl)',
          background: 'var(--bg-raised)',
          boxShadow: 'var(--overlay-shadow)',
          display: 'grid',
          gap: 16,
        }}
      >
        {children}
      </motion.div>
    </dialog>
  );
}
