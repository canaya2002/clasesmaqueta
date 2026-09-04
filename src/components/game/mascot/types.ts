/** Tipos del rig de Cuati. Compilan bajo strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes. */

export type MascotState = 'idle' | 'think' | 'correct' | 'wrong' | 'celebrate';

/**
 * Las capas animadas. Es una unión LITERAL COMPLETA a propósito: `CHOREO[state][layer]` sobre un
 * `Record` total no se ensancha a `| undefined` bajo `noUncheckedIndexedAccess`, así que el rig no
 * necesita un solo `?.` ni un solo `!`.
 */
export const LAYER_IDS = [
  'shadow',
  'tail',
  'tailTip',
  'body',
  'armLeft',
  'armRight',
  'ruff',
  'scarf',
  'head',
  'earLeft',
  'earRight',
  'snout',
  'eyes',
  'pupils',
  'brows',
] as const;

export type LayerId = (typeof LAYER_IDS)[number];

export type MouthShape = 'smile' | 'open' | 'flat' | 'frown';
export type StreakLevel = 0 | 1 | 2 | 3;
export type MascotSize = 32 | 48 | 96 | 160 | 240;

export interface LayerKeyframe {
  readonly rotate: number;
  readonly x: number;
  readonly y: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly opacity: number;
}

export interface MascotProps {
  readonly state: MascotState;
  readonly size: MascotSize;
  /** Las pupilas siguen el puntero con amortiguación, en un disco de radio 4.2u con clamp RADIAL. */
  readonly trackPointer?: boolean;
  readonly onPoke?: () => void;
  readonly className?: string;
  /** Etiqueta accesible. Sin ella la mascota va `aria-hidden`: el texto adyacente ya la nombra. */
  readonly label?: string;
}
