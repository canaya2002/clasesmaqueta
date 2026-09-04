/** Tipos del rig de Cuati. Compilan bajo strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes. */

/**
 * Los NUEVE estados de Cuati.
 *
 * No son nueve por capricho: cada uno cubre un momento del producto que sin él tendría que reutilizar otro
 * y mentir. `sleep` es el estado del alumno que lleva días sin entrar, y usar `idle` ahí dice "todo bien"
 * cuando la racha se está muriendo. `cheer` y `celebrate` se distinguen porque una lección correcta y
 * subir de nivel no pueden verse igual: si la recompensa grande usa la animación pequeña, subir de nivel
 * deja de sentirse como algo.
 */
export type MascotState =
  /** Respiración y parpadeo. El único con loops. */
  | 'idle'
  /** Olfatea y mira al vacío: procesando. */
  | 'think'
  /** Acierto: salto con squash. */
  | 'correct'
  /** Fallo: encogimiento, orejas abajo. Nunca burla. */
  | 'wrong'
  /** Aplauso corto, para cerrar una lección. */
  | 'cheer'
  /** Takeover: subida de nivel, cofre, ascenso de liga. El grande. */
  | 'celebrate'
  /** Dormido: el alumno lleva días sin entrar. */
  | 'sleep'
  /** Ánimo tras un tropiezo: no se ríe del fallo, invita a seguir. */
  | 'encourage'
  /** Sorpresa: algo apareció que el alumno no esperaba. */
  | 'surprise';

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
