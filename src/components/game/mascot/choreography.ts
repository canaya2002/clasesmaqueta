/**
 * La coreografía de Cuati, como DATOS.
 *
 * Constantes con nombre en vez de números dispersos, porque son las que separan un títere de un ser vivo:
 *
 * - `EAR_LAG_MS`: las dos orejas llegan con 40ms de diferencia. Ese desfase es la asimetría.
 * - `EAR_MIN_DELTA_DEG`: nunca comparten ángulo salvo en `correct`. Con las dos orejas al mismo ángulo la
 *   cabeza lee como una máscara.
 * - `SNOUT_MAX_DEG`: 14° es un límite duro. Por encima, la rotación rígida delata que no hay hueso.
 * - Los periodos de respiración y vaivén de cola son PRIMOS entre sí (2600 y 3400 ms) para que jamás se
 *   sincronicen: dos loops en fase leen como un mecanismo.
 */

import { LAYER_IDS } from './types';
import type { LayerId, LayerKeyframe, MascotState, MouthShape } from './types';

export const EAR_LAG_MS = { left: 60, right: 100 } as const;
export const ARM_LAG_MS = 70;
export const EAR_MIN_DELTA_DEG = 6;
export const SNOUT_MAX_DEG = 14;
export const PUPIL_MAX_UNITS = 4.2;
export const BREATHE_MS = 2600;
export const TAIL_SWAY_MS = 3400;
export const BLINK_MIN_MS = 3000;
export const BLINK_MAX_MS = 6000;

const NEUTRAL: LayerKeyframe = { rotate: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };

/** Pose de reposo, total sobre `LayerId`. Todo estado es un delta sobre esta. */
const REST: Readonly<Record<LayerId, LayerKeyframe>> = {
  shadow: NEUTRAL,
  tail: NEUTRAL,
  tailTip: NEUTRAL,
  body: NEUTRAL,
  armLeft: NEUTRAL,
  armRight: NEUTRAL,
  ruff: NEUTRAL,
  scarf: NEUTRAL,
  head: NEUTRAL,
  earLeft: NEUTRAL,
  earRight: NEUTRAL,
  snout: NEUTRAL,
  eyes: NEUTRAL,
  pupils: NEUTRAL,
  brows: NEUTRAL,
};

function pose(
  overrides: Readonly<Partial<Record<LayerId, Partial<LayerKeyframe>>>>,
): Readonly<Record<LayerId, LayerKeyframe>> {
  const out: Record<LayerId, LayerKeyframe> = { ...REST };
  // Se recorre la tupla declarada, no `Object.keys()`: forzar `string[]` a `LayerId[]` es un cast que
  // miente en cuanto alguien añade una capa.
  for (const key of LAYER_IDS) {
    const patch = overrides[key];
    if (patch === undefined) continue;
    out[key] = { ...REST[key], ...patch };
  }
  return out;
}

export interface StateChoreography {
  readonly layers: Readonly<Record<LayerId, LayerKeyframe>>;
  readonly mouth: MouthShape;
  /** `true` si el estado corre en loop (respiración, vaivén); `false` si es un gesto que asienta. */
  readonly ambient: boolean;
}

export const CHOREO: Readonly<Record<MascotState, StateChoreography>> = {
  /** Respiración + parpadeo. La única pose con loops. */
  idle: {
    layers: pose({
      earRight: { rotate: 4 },
      tail: { rotate: 2 },
    }),
    mouth: 'smile',
    ambient: true,
  },

  /**
   * La trompa reemplaza a la boca como órgano expresivo: olfatea. Asimetría de orejas obligatoria, y las
   * pupilas se SUELTAN del puntero y se fijan arriba a la derecha — mirar al vacío es pensar.
   */
  think: {
    layers: pose({
      head: { rotate: -7, x: -3 },
      earLeft: { rotate: -24 },
      earRight: { rotate: 6 },
      snout: { rotate: 9, scaleX: 1.06 },
      armRight: { rotate: -18, y: -10 },
      brows: { y: -3, rotate: -6 },
      pupils: { x: 3.5, y: -2.5 },
      tail: { rotate: -8 },
    }),
    mouth: 'flat',
    ambient: false,
  },

  /**
   * Salto con squash: el cuerpo comprime hacia el suelo (origen en la planta), la sombra se contrae 18% y
   * la cola late con overshoot. Arranca 40ms DESPUÉS del panel verde: primero el sistema confirma, luego
   * la mascota reacciona.
   */
  correct: {
    layers: pose({
      body: { y: -18, scaleY: 1.04, scaleX: 0.97 },
      shadow: { scaleX: 0.82, opacity: 0.6 },
      ruff: { scaleY: 1.35 },
      earLeft: { rotate: -18 },
      earRight: { rotate: 18 },
      tail: { rotate: 26 },
      eyes: { scaleY: 0.45 },
      armLeft: { rotate: -40 },
      armRight: { rotate: 40 },
      scarf: { rotate: -6, y: 3 },
    }),
    mouth: 'open',
    ambient: false,
  },

  /**
   * El shake vive en la CABEZA, no en el root. Sacudir el root lee como tambaleo —la mascota se cae—;
   * sacudir la cabeza con el cuerpo plantado lee como negación. Misma animación, mensaje opuesto.
   * Y la caída de la cola es más lenta que el susto: el ruff llega primero, las orejas 120ms después.
   */
  wrong: {
    layers: pose({
      head: { rotate: -4 },
      ruff: { scaleY: 1.5 },
      earLeft: { rotate: -38 },
      earRight: { rotate: -32 },
      tail: { rotate: -30, scaleY: 0.9 },
      brows: { rotate: 8, y: 2 },
      snout: { rotate: -6 },
      body: { scaleY: 0.97 },
    }),
    mouth: 'frown',
    ambient: false,
  },

  celebrate: {
    layers: pose({
      body: { y: -10, scaleY: 1.03 },
      shadow: { scaleX: 0.9, opacity: 0.7 },
      armLeft: { rotate: -60 },
      armRight: { rotate: 60 },
      earLeft: { rotate: -14 },
      earRight: { rotate: 20 },
      tail: { rotate: 20 },
      eyes: { scaleY: 0.45 },
      head: { rotate: 5 },
      scarf: { rotate: 8, y: 4 },
    }),
    mouth: 'open',
    ambient: false,
  },
};

/** Con movimiento reducido, `idle` no se congela a cero: sirve una pose alterna.
 * Un rig en reposo absoluto lee como muerto, y el 60% de la señal de "está vivo" vive en la respiración y
 * el bobeo que se acaban de apagar. El parpadeo SÍ se conserva: es un cambio de estado discreto de 60ms,
 * no una animación decorativa. */
export const POSE_STILL: StateChoreography = {
  layers: pose({ tail: { rotate: 8 }, earRight: { rotate: 6 } }),
  mouth: 'smile',
  ambient: false,
};

/** Orígenes de transformación, en unidades del viewBox 0 0 160 200. */
export const ORIGIN: Readonly<Record<LayerId, string>> = {
  shadow: '86px 189px',
  // Dentro del torso, no en el borde: en el borde la costura de la base se abre al saltar.
  tail: '58px 150px',
  tailTip: '28px 48px',
  // Planta de los pies, no el centro: así el squash comprime hacia abajo en vez de flotar.
  body: '86px 178px',
  armLeft: '58px 130px',
  armRight: '116px 130px',
  ruff: '87px 108px',
  scarf: '87px 100px',
  // Base del cuello, no el centro del cráneo.
  head: '84px 96px',
  earLeft: '58px 56px',
  earRight: '104px 54px',
  // Puente nasal.
  snout: '74px 84px',
  eyes: '84px 59px',
  pupils: '81px 59px',
  brows: '83px 45px',
};
