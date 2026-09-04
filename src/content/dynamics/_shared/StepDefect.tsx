'use client';

import type { LocalIssue } from '@/content/engine/issues';

/**
 * Contenido inválido degrada a una TARJETA LEGIBLE, nunca a un error boundary ni a una pantalla blanca.
 *
 * Con un administrador editando contenido en vivo, la invalidez es un estado ESPERADO del producto. El
 * mismo componente sirve al player del alumno y al preview del Studio.
 */
export function StepDefect({ issues }: { readonly issues: readonly LocalIssue[] }) {
  return (
    <div
      style={{
        padding: 16,
        border: '2px solid var(--border-warning)',
        borderRadius: 'var(--r-md)',
        background: 'var(--bg-warning-subtle)',
        color: 'var(--ink-fixed)',
      }}
    >
      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
        Este ejercicio necesita una corrección
      </p>
      <ul style={{ margin: '8px 0 0', paddingInlineStart: 18, fontSize: 'var(--t-14)' }}>
        {issues.slice(0, 4).map((i, n) => (
          <li key={`${i.code}-${String(n)}`}>{i.message}</li>
        ))}
      </ul>
    </div>
  );
}
