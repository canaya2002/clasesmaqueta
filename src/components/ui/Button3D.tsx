'use client';

import { forwardRef, useCallback, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as fx from '@/design/fx';

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost' | 'locked';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface Button3DProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'disabled'> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly full?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * El botón 3D: la firma visual de SENDA.
 *
 * Dos capas apiladas —una losa de sombra inmóvil y una cara que se traslada— para que la pulsación sea
 * `transform` puro. Ver el comentario de `.btn3d` en globals.css para por qué el `border-bottom` de la
 * especificación no sirve.
 *
 * `locked` no usa `disabled`: usa `aria-disabled`, sigue enfocable, lleva candado y al pulsarlo hace el
 * *clunk*. Un botón bloqueado que no reacciona no le dice al usuario qué le falta.
 */
export const Button3D = forwardRef<HTMLButtonElement, Button3DProps>(function Button3D(
  { variant = 'primary', size = 'md', full = false, children, className, onClick, ...rest },
  ref,
) {
  const locked = variant === 'locked';

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (locked) {
        event.preventDefault();
        fx.shake(event.currentTarget);
        fx.play('wrong', { gain: 0.4 });
        return;
      }
      fx.play('tap');
      onClick?.(event);
    },
    [locked, onClick],
  );

  return (
    <button
      ref={ref}
      type="button"
      className={className === undefined ? 'btn3d' : `btn3d ${className}`}
      data-variant={variant}
      data-size={size}
      data-full={full ? 'true' : 'false'}
      {...(locked ? { 'aria-disabled': true } : {})}
      onClick={handleClick}
      {...rest}
    >
      <span className="btn3d__shadow" aria-hidden="true" />
      <span className="btn3d__face">{children}</span>
    </button>
  );
});
