'use client';

/**
 * Cuati a 32 y 48px.
 *
 * NO es el mismo SVG escalado: es otro componente. A 32px el contorno de 8u mide 1.6px y se alía a gris
 * sucio; a 11u mide 2.2px y sobrevive. Y el encuadre recorta el CUERPO, no la cola — que es exactamente
 * la contradicción que el concepto original tenía sin resolver: la cola es lo único legible a ese tamaño,
 * así que sacrificarla sería perder el diferenciador justo donde más se ve (el nav, en toda pantalla).
 *
 * Conserva `mascot-tail-tip`: el avatar del nav sigue cargando el estado de la racha.
 */
export function MascotChip({ className }: { readonly className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="16 22 122 122"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
      paintOrder="stroke"
      aria-hidden="true"
    >
      <path d="M58 150C42 122 54 90 38 64C30 50 26 38 28 26" stroke="var(--mascot-700)" strokeWidth="34" strokeLinecap="round" fill="none" />
      <path d="M58 150C42 122 54 90 38 64C30 50 26 38 28 26" stroke="var(--mascot-500)" strokeWidth="24" strokeLinecap="round" fill="none" />
      <path d="M58 150C42 122 54 90 38 64C30 50 26 38 28 26" stroke="var(--mascot-700)" strokeWidth="24" strokeLinecap="butt" fill="none" strokeDasharray="8 26" />
      <path className="mascot-tail-tip" d="M28 48C27 40 27 32 28 26" stroke="var(--streak-ink)" strokeWidth="24" strokeLinecap="round" fill="none" />
      <circle cx="58" cy="46" r="15" fill="var(--mascot-500)" stroke="var(--mascot-700)" strokeWidth="11" />
      <circle cx="104" cy="44" r="15" fill="var(--mascot-500)" stroke="var(--mascot-700)" strokeWidth="11" />
      <circle cx="82" cy="66" r="32" fill="var(--mascot-500)" stroke="var(--mascot-700)" strokeWidth="11" />
      <ellipse cx="82" cy="70" rx="26" ry="21" fill="var(--mascot-200)" />
      <path d="M100 74C112 73 123 78 126 85C123 92 112 95 100 93C104 87 104 80 100 74Z" fill="var(--mascot-200)" stroke="var(--mascot-700)" strokeWidth="9" />
      <ellipse cx="123" cy="85" rx="7" ry="6" fill="var(--mascot-ink)" />
      <circle cx="70" cy="60" r="6.5" fill="var(--mascot-ink)" />
      <circle cx="94" cy="58" r="6.5" fill="var(--mascot-ink)" />
    </svg>
  );
}
