import Link from 'next/link';

/**
 * `/` es la landing de marketing, NO el camino.
 *
 * El árbol de carpetas original ponía `(app)/page.tsx` y `(marketing)/page.tsx`, y los dos resuelven a `/`:
 * Next falla el build con "You cannot have two parallel pages that resolve to the same path". El camino
 * vive en `/aprende` (DECISIONS.md R2).
 */
export default function MarketingPage(): React.ReactElement {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '34rem', display: 'grid', gap: '20px', justifyItems: 'center' }}>
        <h1 style={{ fontSize: 'var(--t-48)', lineHeight: 'var(--lh-48)', letterSpacing: 'var(--tr-48)' }}>
          SENDA
        </h1>
        <p style={{ fontSize: 'var(--t-18)', lineHeight: 'var(--lh-18)', color: 'var(--fg-muted)' }}>
          Capacitación que la gente quiere abrir. Fase 1: cimientos y kernel de física.
        </p>
        <Link
          href="/kitchen-sink"
          style={{
            color: 'var(--fg-primary)',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            textDecoration: 'none',
            borderBottom: '2px solid currentColor',
          }}
        >
          Ver el kitchen sink
        </Link>
      </div>
    </main>
  );
}
