/**
 * Cuati en un solo tono.
 *
 * Existe porque el pelaje sobre el papel no llega a 2:1 y la mascota depende POR COMPLETO del contorno:
 * en favicon, `og:image`, `forced-colors: active` e impresión no hay contorno que valga, así que la
 * silueta tiene que funcionar como mancha sólida. Si no se lee aquí, no se lee a 32px.
 */
export function MascotSolid({
  className,
  fill = 'var(--fg-default)',
}: {
  readonly className?: string;
  readonly fill?: string;
}): React.ReactElement {
  return (
    <svg
      viewBox="0 0 160 200"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
      aria-hidden="true"
    >
      <g fill={fill}>
        <path d="M58 150C42 122 54 90 38 64C30 50 26 38 28 26" stroke={fill} strokeWidth="30" strokeLinecap="round" fill="none" />
        <path d="M86 94C60 94 48 120 48 148C48 174 64 186 86 186C108 186 124 174 124 148C124 120 112 94 86 94Z" />
        <circle cx="82" cy="66" r="34" />
        <circle cx="58" cy="46" r="17" />
        <circle cx="104" cy="44" r="17" />
        <path d="M100 72C114 71 126 77 129 85C126 93 114 97 100 95C105 87 105 80 100 72Z" />
      </g>
    </svg>
  );
}
