/**
 * Los contratos de contraste de SENDA, como DATOS.
 *
 * `contrast.test.ts` los recorre y falla el build si alguno baja de su umbral. Una hoja de cálculo de
 * contraste se hace una vez y se pudre; esto corre en el mismo `pnpm test` que la calificación de
 * ejercicios, y por eso sigue siendo verdad en la fase 10.
 *
 * Las referencias son NOMBRES DE TOKEN, no hexes: el test los resuelve leyendo `tokens.generated.css`,
 * así que verifica los valores que realmente se envían y no una copia que alguien olvidó actualizar.
 */

export type Theme = 'light' | 'dark';

export interface ContrastContract {
  readonly label: string;
  /** Nombre de token primitivo (`mint-700`), nombre de superficie (`paper`) o hex literal. */
  readonly fg: string;
  readonly bg: string;
  readonly min: number;
  readonly themes: readonly Theme[];
}

const BOTH: readonly Theme[] = ['light', 'dark'];
const LIGHT: readonly Theme[] = ['light'];
const DARK: readonly Theme[] = ['dark'];

export const CONTRAST_CONTRACTS: readonly ContrastContract[] = [
  /* --- texto principal y secundario: la base de todo lo demás */
  { label: 'texto principal sobre papel', fg: 'ink-900', bg: 'paper', min: 4.5, themes: BOTH },
  { label: 'texto principal sobre lienzo', fg: 'ink-900', bg: 'canvas', min: 4.5, themes: BOTH },
  { label: 'texto secundario sobre papel', fg: 'ink-500', bg: 'paper', min: 4.5, themes: BOTH },
  { label: 'texto secundario sobre lienzo', fg: 'ink-500', bg: 'canvas', min: 4.5, themes: BOTH },
  { label: 'texto sutil sobre papel', fg: 'ink-700', bg: 'paper', min: 4.5, themes: BOTH },

  /* --- primario: el único cromático que puede ser texto, y solo en claro */
  { label: 'rótulo sobre CTA primario', fg: 'paper-fixed', bg: 'brand-600', min: 4.5, themes: BOTH },
  { label: 'CTA primario como objeto sobre papel', fg: 'brand-600', bg: 'paper', min: 3, themes: BOTH },
  { label: 'texto de marca sobre papel claro', fg: 'brand-700', bg: 'paper', min: 4.5, themes: LIGHT },
  { label: 'texto de marca sobre papel oscuro', fg: 'brand-400', bg: 'paper', min: 4.5, themes: DARK },

  /* --- estados. Cinco de seis familias llevan TINTA sobre el relleno, no blanco. */
  { label: 'tinta sobre relleno de éxito', fg: 'ink-fixed', bg: 'mint-500', min: 4.5, themes: BOTH },
  { label: 'texto de éxito sobre papel', fg: 'mint-700', bg: 'paper', min: 4.5, themes: LIGHT },
  { label: 'texto de éxito sobre papel oscuro', fg: 'mint-400', bg: 'paper', min: 4.5, themes: DARK },
  { label: 'texto de éxito sobre su tinte', fg: 'mint-800', bg: 'mint-300', min: 4.5, themes: LIGHT },
  { label: 'borde de éxito sobre papel', fg: 'mint-600', bg: 'paper', min: 3, themes: LIGHT },

  { label: 'tinta sobre relleno de peligro', fg: 'ink-fixed', bg: 'coral-500', min: 4.5, themes: BOTH },
  { label: 'texto de peligro sobre papel', fg: 'coral-700', bg: 'paper', min: 4.5, themes: LIGHT },
  { label: 'texto de peligro sobre papel oscuro', fg: 'coral-400', bg: 'paper', min: 4.5, themes: DARK },
  { label: 'texto de peligro sobre su tinte', fg: 'coral-800', bg: 'coral-300', min: 4.5, themes: LIGHT },
  { label: 'borde de peligro sobre papel', fg: 'coral-600', bg: 'paper', min: 3, themes: LIGHT },

  { label: 'tinta sobre relleno de aviso', fg: 'ink-fixed', bg: 'amber-500', min: 4.5, themes: BOTH },
  { label: 'texto de aviso sobre papel', fg: 'amber-700', bg: 'paper', min: 4.5, themes: LIGHT },
  { label: 'texto de aviso sobre papel oscuro', fg: 'amber-400', bg: 'paper', min: 4.5, themes: DARK },
  { label: 'texto de aviso sobre su tinte', fg: 'amber-800', bg: 'amber-300', min: 4.5, themes: LIGHT },

  { label: 'tinta sobre relleno de info', fg: 'ink-fixed', bg: 'sky-500', min: 4.5, themes: BOTH },
  { label: 'texto de info sobre papel', fg: 'sky-700', bg: 'paper', min: 4.5, themes: LIGHT },
  { label: 'texto de info sobre papel oscuro', fg: 'sky-400', bg: 'paper', min: 4.5, themes: DARK },
  { label: 'texto de info sobre su tinte', fg: 'sky-800', bg: 'sky-300', min: 4.5, themes: LIGHT },

  /* --- XP: el lima es relleno, y como texto solo a partir del -800 */
  { label: 'tinta sobre relleno de XP', fg: 'ink-fixed', bg: 'lime-500', min: 4.5, themes: BOTH },
  { label: 'texto de XP sobre papel', fg: 'lime-800', bg: 'paper', min: 4.5, themes: LIGHT },
  { label: 'texto de XP sobre su tinte', fg: 'lime-800', bg: 'lime-300', min: 4.5, themes: LIGHT },

  /* --- color de sección: cada par fill/on-fill. Con `lime` en el enum esto fallaría, y por eso salió. */
  { label: 'sección brand', fg: 'paper-fixed', bg: 'brand-600', min: 4.5, themes: LIGHT },
  { label: 'sección grape', fg: 'paper-fixed', bg: 'grape-600', min: 4.5, themes: LIGHT },
  { label: 'sección mint', fg: 'paper-fixed', bg: 'mint-700', min: 4.5, themes: LIGHT },
  { label: 'sección coral', fg: 'paper-fixed', bg: 'coral-600', min: 4.5, themes: LIGHT },
  { label: 'sección amber', fg: 'paper-fixed', bg: 'amber-600', min: 4.5, themes: LIGHT },
  { label: 'sección sky', fg: 'paper-fixed', bg: 'sky-600', min: 4.5, themes: LIGHT },
  { label: 'sección brand en oscuro', fg: 'ink-fixed', bg: 'brand-400', min: 4.5, themes: DARK },
  { label: 'sección grape en oscuro', fg: 'ink-fixed', bg: 'grape-400', min: 4.5, themes: DARK },
  { label: 'sección mint en oscuro', fg: 'ink-fixed', bg: 'mint-400', min: 4.5, themes: DARK },
  { label: 'sección coral en oscuro', fg: 'ink-fixed', bg: 'coral-400', min: 4.5, themes: DARK },
  { label: 'sección amber en oscuro', fg: 'ink-fixed', bg: 'amber-400', min: 4.5, themes: DARK },
  { label: 'sección sky en oscuro', fg: 'ink-fixed', bg: 'sky-400', min: 4.5, themes: DARK },

  /* --- bordes de control. `--line-200` en oscuro da 1.24:1 y no puede ser el borde de un input. */
  { label: 'borde de control sobre papel', fg: 'line-control', bg: 'paper', min: 3, themes: BOTH },
  { label: 'borde de control sobre lienzo', fg: 'line-control', bg: 'canvas', min: 3, themes: BOTH },

  /* --- el estado `locked` es legible a propósito, no un gris con opacidad */
  { label: 'rótulo de botón bloqueado', fg: 'ink-700', bg: 'line-200', min: 4.5, themes: BOTH },
];

/** La banda en la que debe caer la separación cara/sombra para que el canto lea como profundidad. */
export const SHADOW_BAND = { min: 1.9, max: 2.7 } as const;
export const SHADOW_BAND_DARK = { min: 2.6, max: 3.4 } as const;

/** Pares cara/sombra del botón 3D, por variante. */
export const FACE_SHADOW_PAIRS: readonly { readonly variant: string; readonly face: string; readonly shadow: string }[] = [
  { variant: 'primary', face: 'brand-600', shadow: 'brand-shadow' },
  { variant: 'success', face: 'lime-500', shadow: 'lime-shadow' },
  { variant: 'danger', face: 'coral-500', shadow: 'coral-shadow' },
  { variant: 'warning', face: 'amber-500', shadow: 'amber-shadow' },
  { variant: 'info', face: 'sky-500', shadow: 'sky-shadow' },
];

/** Mínimo que el anillo de foco compuesto debe alcanzar sobre CUALQUIER superficie (WCAG 1.4.11). */
export const FOCUS_RING_MIN = 3;
