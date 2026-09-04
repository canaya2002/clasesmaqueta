'use client';

import { motion } from '@/design/m';
import { useVariant } from '@/design/MotionRoot';
import type { VerdictKind } from './Verdict';

export interface OptionRowProps {
  readonly label: string;
  readonly selected: boolean;
  readonly verdict: VerdictKind | null;
  readonly disabled: boolean;
  readonly hotkey: string | null;
  readonly multiple: boolean;
  readonly onPick: () => void;
}

/**
 * La fila de opción compartida por opción múltiple, selección múltiple y escucha-y-elige.
 *
 * `aria-pressed` en vez de `role="radio"`: un grupo de radios captura las flechas y compite con la
 * navegación del lector de pantalla; un botón de alternancia con la tecla numérica visible es más simple y
 * no secuestra nada. El chip de tecla solo aparece si el usuario llegó por teclado.
 */
export function OptionRow(props: OptionRowProps) {
  const pick = useVariant('optionPick');
  return (
    <motion.button
      type="button"
      className="opt"
      variants={pick}
      initial="rest"
      animate={props.selected ? 'picked' : 'rest'}
      aria-pressed={props.selected}
      {...(props.verdict !== null ? { 'data-verdict': props.verdict } : {})}
      data-selected={props.selected ? 'true' : 'false'}
      disabled={props.disabled}
      onClick={props.onPick}
    >
      {props.hotkey !== null && (
        <span className="opt__key" aria-hidden="true">
          {props.hotkey}
        </span>
      )}
      <span
        aria-hidden="true"
        style={{
          width: 20,
          height: 20,
          flex: '0 0 auto',
          border: '2px solid currentColor',
          borderRadius: props.multiple ? 6 : 999,
          opacity: props.selected ? 1 : 0.35,
          background: props.selected ? 'currentColor' : 'transparent',
        }}
      />
      <span style={{ flex: 1 }}>{props.label}</span>
    </motion.button>
  );
}
