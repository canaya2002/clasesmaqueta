/**
 * SENDA — sistema de movimiento.
 *
 * El problema real no son las 27 micro-interacciones: es que a la número 40 alguien se le olvide degradar.
 * Por eso `prefers-reduced-motion` NO se resuelve con un `if` por componente, sino intercambiando el
 * CATÁLOGO completo. La única rama del sistema vive en `<MotionRoot>`; los componentes escriben
 * `const v = useVariants()` y no saben en qué modo están.
 *
 * La garantía es de tipos: toda entrada del catálogo DEBE declarar su canal, y el canal es lo que decide su
 * degradado. Un variant nuevo sin canal no compila.
 */

import type { TargetAndTransition, Transition, Variant, Variants } from 'motion/react';

/* ----------------------------------------------------------------- springs */

export const spring = {
  /** Feedback: entra rápido y asienta. El pulso del producto. */
  pop: { type: 'spring', stiffness: 620, damping: 22, mass: 0.7 },
  /** Chrome: drawers, paneles, movimientos largos. */
  soft: { type: 'spring', stiffness: 260, damping: 26 },
  /** Correcciones y snaps: llega y se queda, sin rebote. */
  snap: { type: 'spring', stiffness: 900, damping: 40 },
  /** Celebración: rebota a propósito. Solo en cinemáticas y en la mascota. */
  bouncy: { type: 'spring', stiffness: 400, damping: 12 },
} as const satisfies Record<string, Transition>;

export type SpringName = keyof typeof spring;

/** La constante única del modo reducido. Un solo número, en un solo sitio. */
export const REDUCED_FADE: Transition = { duration: 0.12, ease: 'linear' };

/* ------------------------------------------------------------------ canales
 *
 * Cinco canales en vez de un booleano. Bajo movimiento reducido, `entrance` y `emphasis` siguen ACTIVOS
 * (degradados), y `physics`, `continuity` y `ambient` se apagan por completo.
 *
 * Apagar todo eliminaría el feedback de correcto/incorrecto, que por accesibilidad ya no puede ser solo
 * color. Dejar todo ignora la preferencia. La granularidad por canal es lo que permite que el modo reducido
 * sea informativamente EQUIVALENTE y no una versión mutilada. */

export type MotionChannel = 'entrance' | 'emphasis' | 'physics' | 'continuity' | 'ambient';

export const CHANNEL_ACTIVE_WHEN_REDUCED: Readonly<Record<MotionChannel, boolean>> = {
  entrance: true,
  emphasis: true,
  physics: false,
  continuity: false,
  ambient: false,
};

export interface VariantSpec {
  readonly channel: MotionChannel;
  readonly full: Variants;
  /**
   * Degradado explícito, solo cuando el mecánico no comunica lo mismo.
   * El caso canónico: un shake degradado a un fade no dice "error"; degradado a un destello de borde, sí.
   */
  readonly reduced?: Variants;
}

/* ----------------------------------------------------------------- catálogo */

/**
 * Transicion de PULSO: tres fotogramas, y por eso NO puede ser un muelle.
 *
 * `motion` solo admite dos fotogramas con `type: 'spring'` y lanza en tiempo de ejecucion con tres — no
 * degrada, no avisa en consola: revienta la animacion. Y un muelle de dos fotogramas tampoco sirve aqui,
 * porque un pulso tiene que VOLVER al reposo y un muelle se asienta en su destino.
 *
 * La curva del primer tramo lleva rebase (el cuarto control pasa de 1) para conservar el caracter elastico
 * que se buscaba con `spring.pop`.
 */
const PULSE: Transition = {
  duration: 0.34,
  times: [0, 0.38, 1],
  ease: ['backOut', 'easeInOut'],
};

export const CATALOG = {
  /* --- feedback de respuesta --- */
  feedbackCorrect: {
    channel: 'entrance',
    full: {
      out: { y: '110%', opacity: 1 },
      in: { y: '0%', opacity: 1, transition: spring.pop },
    },
  },
  feedbackWrong: {
    channel: 'entrance',
    full: {
      out: { y: '110%', opacity: 1 },
      in: { y: '0%', opacity: 1, transition: spring.pop },
    },
  },
  shakeX: {
    channel: 'emphasis',
    full: {
      idle: { x: 0 },
      shake: { x: [0, -8, 7, -5, 3, 0], transition: { duration: 0.32, ease: 'easeInOut' } },
    },
    // Un fade no comunica "error". El degradado es un destello de borde, que sí.
    reduced: {
      idle: { opacity: 1 },
      shake: { opacity: [1, 0.55, 1], transition: { duration: 0.24, ease: 'linear' } },
    },
  },
  comboPulse: {
    channel: 'emphasis',
    full: {
      idle: { scale: 1 },
      pulse: { scale: [1, 1.12, 1], transition: PULSE },
    },
  },

  /* --- el camino --- */
  breathe: {
    channel: 'ambient',
    full: {
      idle: { scale: 1 },
      breathe: {
        scale: [1, 1.03, 1],
        transition: { duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' },
      },
    },
  },
  startBubble: {
    channel: 'ambient',
    full: {
      idle: { y: 0 },
      float: {
        y: [0, -4, 0],
        transition: { duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' },
      },
    },
  },
  clunk: {
    channel: 'emphasis',
    full: {
      idle: { y: 0, rotate: 0 },
      clunk: { y: [0, 1.5, 0], rotate: [0, -1.2, 1.2, 0], transition: { duration: 0.18 } },
    },
  },
  sectionFill: {
    channel: 'entrance',
    full: {
      empty: { scaleY: 0 },
      filled: { scaleY: 1, transition: { ...spring.soft } },
    },
  },
  lessonOverlay: {
    channel: 'continuity',
    full: {
      out: { opacity: 0, scale: 0.96 },
      in: { opacity: 1, scale: 1, transition: spring.pop },
    },
  },

  /* --- números y progreso --- */
  counterDigit: {
    channel: 'emphasis',
    full: {
      rest: { y: '0%' },
      roll: { y: ['-100%', '0%'], transition: spring.snap },
    },
  },
  progressAdvance: {
    channel: 'entrance',
    full: {
      rest: { scaleX: 1 },
    },
  },

  /* --- ejercicios --- */
  optionPick: {
    channel: 'emphasis',
    full: {
      rest: { scale: 1 },
      picked: { scale: [1, 1.03, 1], transition: PULSE },
    },
  },
  pairSolved: {
    channel: 'emphasis',
    full: {
      rest: { opacity: 1, scale: 1 },
      // Dos fotogramas, no tres: un muelle no admite mas, y el intermedio no aportaba nada que la propia
      // curva del muelle no haga ya. Un par resuelto se atenua; no parpadea.
      solved: { opacity: 0.25, scale: 0.96, transition: spring.soft },
    },
  },
  itemGrab: {
    channel: 'emphasis',
    full: {
      rest: { scale: 1, y: 0 },
      grabbed: { scale: 1.02, y: -2, transition: spring.snap },
    },
  },
  revealIn: {
    channel: 'entrance',
    full: {
      out: { opacity: 0, y: 6 },
      in: { opacity: 1, y: 0, transition: spring.soft },
    },
  },
  stampIn: {
    channel: 'emphasis',
    full: {
      rest: { opacity: 0, scale: 0.9 },
      shown: { opacity: 1, scale: 1, transition: spring.pop },
    },
  },

  /* --- chrome --- */
  routeEnter: {
    channel: 'entrance',
    full: {
      out: { opacity: 0, scale: 0.985 },
      in: { opacity: 1, scale: 1, transition: spring.soft },
    },
  },
  navActive: {
    channel: 'emphasis',
    full: {
      rest: { scale: 1 },
      active: { scale: [1, 1.18, 1], transition: PULSE },
    },
  },
  modalIn: {
    channel: 'entrance',
    full: {
      out: { opacity: 0, scale: 0.94 },
      in: { opacity: 1, scale: 1, transition: spring.pop },
    },
  },
  drawerRight: {
    channel: 'entrance',
    full: {
      out: { x: '100%' },
      in: { x: '0%', transition: spring.soft },
    },
  },
  spotlightIn: {
    channel: 'entrance',
    full: {
      out: { opacity: 0, scale: 0.96 },
      in: { opacity: 1, scale: 1, transition: spring.pop },
    },
  },
  shimmer: {
    channel: 'ambient',
    full: {
      idle: { x: '-120%' },
      sweep: {
        x: '220%',
        transition: { duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: 'linear' },
      },
    },
  },
  rowHover: {
    channel: 'emphasis',
    full: {
      rest: { y: 0 },
      hover: { y: -1, transition: spring.snap },
    },
  },
  previewPulse: {
    channel: 'emphasis',
    full: {
      rest: { scale: 1 },
      pulse: { scale: [1, 1.004, 1], transition: { duration: 0.22, ease: 'easeOut' } },
    },
  },
} as const satisfies Record<string, VariantSpec>;

export type VariantName = keyof typeof CATALOG;

/* ------------------------------------------------------------- degradación */

/** Claves informativas: sobreviven al modo reducido porque comunican ESTADO, no movimiento. */
function lastNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) {
    // Un keyframe se colapsa a su valor FINAL: el estado final siempre se alcanza, nunca queda a medias.
    // Eso es lo que un `transition: none` global rompe, dejando elementos en posiciones intermedias.
    const last: unknown = value[value.length - 1];
    return typeof last === 'number' ? last : undefined;
  }
  return undefined;
}

function degradeState(state: Variant): TargetAndTransition {
  const out: TargetAndTransition = { transition: REDUCED_FADE };
  if (typeof state === 'function') return out;
  const opacity = lastNumber(state.opacity);
  if (opacity !== undefined) out.opacity = opacity;
  const pathLength = lastNumber(state.pathLength);
  if (pathLength !== undefined) out.pathLength = pathLength;
  return out;
}

function degradeVariants(v: Variants): Variants {
  const out: Variants = {};
  for (const stateName of Object.keys(v)) {
    const state = v[stateName];
    if (state === undefined) continue;
    out[stateName] = degradeState(state);
  }
  return out;
}

const reducedCache = new Map<VariantName, Variants>();

/**
 * Resuelve un variant en el modo activo.
 *
 * Es una FUNCIÓN y no dos objetos totales precalculados: construir un `Record` total sobre `VariantName`
 * sin castear `Object.keys()` obliga a listar las 19 entradas a mano dos veces, y esa lista se desincroniza.
 * Resolver por nombre con caché da lo mismo, sin duplicación y sin un solo cast.
 */
export function resolveVariant(name: VariantName, reduced: boolean): Variants {
  // Anotación, no cast: `CATALOG` está declarado `as const satisfies Record<string, VariantSpec>`, así que
  // las entradas sin degradado explícito no tienen la propiedad `reduced` en su tipo literal. Leerla a
  // través de la interfaz es lo que la vuelve `Variants | undefined` en vez de un error de tipo.
  const spec: VariantSpec = CATALOG[name];
  if (!reduced) return spec.full;
  const hit = reducedCache.get(name);
  if (hit !== undefined) return hit;
  const built = spec.reduced ?? degradeVariants(spec.full);
  reducedCache.set(name, built);
  return built;
}

/* ----------------------------------------- registro de las 27, como DATOS
 *
 * Una tabla en un documento con casillas que alguien marca a mano no se audita en la fase 10.
 * Cada componente que implementa una lleva `data-mi="NN"`, y en la Fase 6 un test cruza esta constante
 * contra un grep del árbol y falla si alguna no tiene implementación declarada. */

export interface MicroInteraction {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly variant: VariantName | null;
  readonly channel: MotionChannel;
  readonly reducedFallback: string;
  /** Fase en la que su dueño se construye. */
  readonly phase: number;
}

export const MICRO_INTERACTIONS: readonly MicroInteraction[] = [
  { id: '01', name: 'panel de acierto + partículas + salto', owner: 'FeedbackPanel', variant: 'feedbackCorrect', channel: 'entrance', reducedFallback: 'fade 120ms, sin partículas', phase: 4 },
  { id: '02', name: 'shake + destello + corazón con gravedad', owner: 'ExerciseCard', variant: 'shakeX', channel: 'emphasis', reducedFallback: 'destello de borde coral', phase: 4 },
  { id: '03', name: 'medidor de combo con chispas', owner: 'ComboMeter', variant: 'comboPulse', channel: 'emphasis', reducedFallback: 'cambio de segmento con fade', phase: 4 },
  { id: '04', name: 'nodos que respiran', owner: 'PathNode', variant: 'breathe', channel: 'ambient', reducedFallback: 'scale 1 fijo, el loop no corre', phase: 5 },
  { id: '05', name: 'anillo de progreso + burbuja EMPEZAR', owner: 'PathNode', variant: 'startBubble', channel: 'ambient', reducedFallback: 'anillo al valor final, burbuja estática', phase: 5 },
  { id: '06', name: 'nodo → lección a pantalla completa', owner: 'PathNode → LessonOverlay', variant: 'lessonOverlay', channel: 'continuity', reducedFallback: 'se omite layoutId, fade + backdrop', phase: 5 },
  { id: '07', name: 'nodo bloqueado tiembla y hace clunk', owner: 'PathNode', variant: 'clunk', channel: 'emphasis', reducedFallback: 'solo el sonido y un destello', phase: 5 },
  { id: '08', name: 'sección se rellena de arriba a abajo', owner: 'SectionFill', variant: 'sectionFill', channel: 'entrance', reducedFallback: 'losa con fade, confetti apagado', phase: 5 },
  { id: '09', name: 'contadores por interpolación', owner: 'Odometer', variant: 'counterDigit', channel: 'emphasis', reducedFallback: 'valor final inmediato, aria-live intacto', phase: 5 },
  { id: '10', name: 'barra de progreso con rebote y brillo', owner: 'LessonProgressBar', variant: 'progressAdvance', channel: 'entrance', reducedFallback: 'scaleX sin spring, sin brillo', phase: 4 },
  { id: '11', name: 'anillo de XP con pathLength', owner: 'XPRing', variant: null, channel: 'entrance', reducedFallback: 'salta al valor final', phase: 5 },
  { id: '12', name: 'subida de nivel a pantalla completa', owner: 'LevelUpTakeover', variant: null, channel: 'entrance', reducedFallback: 'fotograma final, confetti no se monta', phase: 6 },
  { id: '13', name: 'apertura de cofre en tres tiempos', owner: 'ChestCinematic', variant: null, channel: 'physics', reducedFallback: 'va directo a la recompensa; el flash NO se monta', phase: 6 },
  { id: '14', name: 'ascenso de liga', owner: 'LeaguePromotion', variant: null, channel: 'continuity', reducedFallback: 'emblema con fade, la fila salta', phase: 7 },
  { id: '15', name: 'racha perdida', owner: 'StreakLostCinematic', variant: null, channel: 'entrance', reducedFallback: 'cambio de token + fade', phase: 6 },
  { id: '16', name: 'transiciones de ruta', owner: '(app)/template.tsx', variant: 'routeEnter', channel: 'entrance', reducedFallback: 'fade 120ms', phase: 5 },
  { id: '17', name: 'nav inferior: pop + etiqueta', owner: 'BottomNav', variant: 'navActive', channel: 'emphasis', reducedFallback: 'solo color y peso del ícono', phase: 5 },
  { id: '18', name: 'header que colapsa al hacer scroll', owner: 'StickyHeader', variant: null, channel: 'continuity', reducedFallback: 'header en estado compacto sin animar', phase: 5 },
  { id: '19', name: 'modales con escala y backdrop', owner: 'Modal', variant: 'modalIn', channel: 'entrance', reducedFallback: 'fade 120ms sin escala', phase: 4 },
  { id: '20', name: 'toasts con entrada elástica', owner: 'ToastHost', variant: null, channel: 'entrance', reducedFallback: 'fade 120ms', phase: 5 },
  { id: '21', name: 'skeletons con barrido de brillo', owner: 'Skeleton', variant: 'shimmer', channel: 'ambient', reducedFallback: 'superficie estática, sin barrido', phase: 1 },
  { id: '22', name: 'filas de tabla: hover y selección', owner: 'DataTable', variant: 'rowHover', channel: 'emphasis', reducedFallback: 'sin elevación, check con fade', phase: 8 },
  { id: '23', name: 'drawer desde la derecha', owner: 'Drawer', variant: 'drawerRight', channel: 'entrance', reducedFallback: 'fade 120ms', phase: 8 },
  { id: '24', name: 'reordenamiento con drag & drop', owner: 'SortableList', variant: null, channel: 'physics', reducedFallback: 'el orden salta, sin animar', phase: 9 },
  { id: '25', name: 'pulso de 1px en el marco del preview', owner: 'LivePreview', variant: 'previewPulse', channel: 'emphasis', reducedFallback: 'borde ámbar de 1px, sin pulso', phase: 9 },
  { id: '26', name: 'KPIs que cuentan al entrar en viewport', owner: 'KpiTile', variant: 'counterDigit', channel: 'emphasis', reducedFallback: 'número final directo', phase: 8 },
  { id: '27', name: 'command palette tipo Spotlight', owner: 'CommandPalette', variant: 'spotlightIn', channel: 'entrance', reducedFallback: 'fade 120ms', phase: 8 },
];

/**
 * Timeline de la respuesta correcta, como DATO y no como una pila de setTimeout.
 *
 * Ponerlo en un archivo de datos permite que el test lo verifique y que ajustar el ritmo de la demo sea
 * cambiar números en vez de reescribir componentes. El techo de 3 capas compositadas nuevas por frame es
 * el presupuesto que hace que las seis cosas que ocurren a la vez quepan en 60fps.
 */
export interface Beat {
  readonly at: number;
  readonly id: string;
  readonly layers: number;
}

export const CORRECT_TIMELINE: readonly Beat[] = [
  { at: 0, id: 'sfx:correct', layers: 0 },
  { at: 0, id: 'panel:in', layers: 1 },
  { at: 70, id: 'particles:burst', layers: 2 },
  { at: 120, id: 'mascot:correct', layers: 1 },
  { at: 140, id: 'progress:advance', layers: 1 },
  { at: 200, id: 'combo:pulse', layers: 1 },
  { at: 260, id: 'xp:roll', layers: 1 },
  { at: 420, id: 'sfx:combo', layers: 0 },
  { at: 700, id: 'cta:enable', layers: 0 },
];

export const CORRECT_TIMELINE_REDUCED: readonly Beat[] = [
  { at: 0, id: 'sfx:correct', layers: 0 },
  { at: 0, id: 'panel:in', layers: 1 },
  { at: 0, id: 'progress:advance', layers: 0 },
  { at: 0, id: 'xp:roll', layers: 0 },
];

export const MAX_NEW_LAYERS_PER_FRAME = 3;
