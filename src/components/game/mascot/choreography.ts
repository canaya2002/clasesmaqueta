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
      // Dentro del disco de PUPIL_MAX_UNITS: (3.5, -2.5) mide 4.30 y se salía. El seguimiento del
      // puntero suma sobre esta pose, así que una pose ya fuera del disco saca la mirada de la cara en
      // cuanto el ratón se mueve. Misma dirección, magnitud 4.16.
      pupils: { x: 3.4, y: -2.4 },
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

  /**
   * Aplauso corto para cerrar una lección. Es DELIBERADAMENTE menor que `celebrate`.
   *
   * Si terminar una lección usara la animación grande, subir de nivel dejaría de sentirse como algo: la
   * escala de recompensa se aplana desde arriba. Aquí los brazos se juntan al centro en vez de abrirse, no
   * hay salto, y el cuerpo apenas se estira.
   */
  cheer: {
    layers: pose({
      body: { y: -4, scaleY: 1.01 },
      shadow: { scaleX: 0.95, opacity: 0.78 },
      armLeft: { rotate: 34, x: 6 },
      armRight: { rotate: -34, x: -6 },
      earLeft: { rotate: -10 },
      earRight: { rotate: 12 },
      tail: { rotate: 14 },
      head: { rotate: 2, y: -2 },
      eyes: { scaleY: 0.6 },
    }),
    mouth: 'smile',
    ambient: false,
  },

  /**
   * Dormido: el alumno lleva días sin entrar.
   *
   * Existe para no usar `idle` ahí. `idle` sonríe y respira: dice "todo bien" justo cuando la racha se
   * está muriendo, que es el momento en que el producto tiene que decir lo contrario. Los ojos cerrados
   * son `scaleY` casi cero —no una capa distinta—, y la cola cae con el cuerpo hundido.
   *
   * `ambient: true` porque respirar dormido es lo único que lo separa de una mascota apagada.
   */
  sleep: {
    layers: pose({
      body: { y: 4, scaleY: 0.96, scaleX: 1.03 },
      shadow: { scaleX: 1.06, opacity: 0.9 },
      head: { rotate: 12, x: 4, y: 6 },
      earLeft: { rotate: -30 },
      earRight: { rotate: -26 },
      eyes: { scaleY: 0.06 },
      brows: { y: 3, rotate: 4 },
      tail: { rotate: -34, scaleY: 0.86 },
      armLeft: { rotate: -8 },
      armRight: { rotate: 8 },
      snout: { rotate: 4 },
    }),
    mouth: 'flat',
    ambient: true,
  },

  /**
   * Ánimo tras un tropiezo. La distinción con `wrong` es de PRODUCTO, no de estilo.
   *
   * `wrong` es la reacción al fallo —dura 400 ms y se va—; `encourage` es lo que se queda en pantalla
   * mientras el alumno lee la explicación. Una mascota que sostiene la cara de decepción durante quince
   * segundos de lectura convierte el error en castigo. Aquí las orejas vuelven a subir, un brazo se
   * levanta hacia el alumno y la cabeza se inclina hacia él.
   */
  encourage: {
    layers: pose({
      head: { rotate: 8, x: 3 },
      earLeft: { rotate: -6 },
      earRight: { rotate: 14 },
      armRight: { rotate: -46, y: -8, x: -2 },
      armLeft: { rotate: 6 },
      tail: { rotate: 10 },
      brows: { y: -2, rotate: -3 },
      body: { y: -2 },
      scarf: { rotate: 4, y: 2 },
    }),
    mouth: 'smile',
    ambient: false,
  },

  /**
   * Sorpresa: apareció algo que el alumno no esperaba —un cofre, una insignia—.
   *
   * Es el estado PUENTE de las cinemáticas: se monta antes del takeover para que la recompensa no salga
   * de la nada. Sin él, `idle` salta a `celebrate` y la mascota parece teletransportarse.
   */
  surprise: {
    layers: pose({
      body: { y: -6, scaleY: 1.05, scaleX: 0.96 },
      shadow: { scaleX: 0.88, opacity: 0.66 },
      head: { y: -3, scaleX: 1.02 },
      earLeft: { rotate: -34 },
      earRight: { rotate: 34 },
      eyes: { scaleY: 1.3, scaleX: 1.12 },
      brows: { y: -5 },
      snout: { scaleY: 1.08 },
      armLeft: { rotate: -26, x: 3 },
      armRight: { rotate: 26, x: -3 },
      tail: { rotate: 30, scaleY: 1.06 },
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
