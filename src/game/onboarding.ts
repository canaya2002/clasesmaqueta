/**
 * El onboarding: UN reducer para los cinco pasos.
 *
 * Cinco `useState` repartidos por cinco componentes es el default y produce el fallo clásico: se puede
 * llegar al paso 4 con el puesto sin elegir, porque nadie comprueba nada al navegar. Aquí el paso al que
 * se PUEDE llegar es una función del estado, así que un `?paso=4` pegado en la barra de direcciones no
 * puede saltarse la elección.
 */

export const STEPS = ['bienvenida', 'puesto', 'meta', 'test', 'listo'] as const;
export type StepName = (typeof STEPS)[number];

export type RoleChoice = 'recepcion' | 'expediente' | 'cobranza';

export interface RoleOption {
  readonly id: RoleChoice;
  readonly label: string;
  readonly body: string;
  /** Índice del curso en el catálogo. `Course` no lleva slug: la identidad es el id, y el orden es estable. */
  readonly courseIndex: 0 | 1 | 2;
}

export const ROLE_OPTIONS: readonly RoleOption[] = [
  {
    id: 'recepcion',
    label: 'Atiendo al público',
    body: 'Recepción, llamadas, citas y primer contacto.',
    courseIndex: 0,
  },
  {
    id: 'expediente',
    label: 'Manejo expedientes',
    body: 'Documentos, plazos, verificación y privilegio.',
    courseIndex: 1,
  },
  {
    id: 'cobranza',
    label: 'Veo pagos y cobranza',
    body: 'Planes, recibos, conciliación y conversaciones difíciles.',
    courseIndex: 2,
  },
];

/** Minutos al día. El número que el alumno elige aquí es el que la meta diaria usa después. */
export const GOAL_OPTIONS: readonly { readonly minutes: number; readonly label: string; readonly xp: number }[] = [
  { minutes: 3, label: 'Tranquilo', xp: 20 },
  { minutes: 7, label: 'Constante', xp: 40 },
  { minutes: 12, label: 'Serio', xp: 70 },
  { minutes: 20, label: 'Intenso', xp: 120 },
];

export interface OnboardingState {
  readonly role: RoleChoice | null;
  readonly goalXp: number | null;
  /** El alumno pidió empezar por el principio en vez de hacer el test. */
  readonly testSkipped: boolean;
  /** Una entrada por pregunta contestada del test de nivel. */
  readonly probes: readonly { readonly unitIndex: number; readonly correct: boolean }[];
  readonly probeCount: number;
  readonly finished: boolean;
}

export const INITIAL: OnboardingState = {
  role: null,
  goalXp: null,
  testSkipped: false,
  probes: [],
  probeCount: 0,
  finished: false,
};

export type OnboardingEvent =
  | { readonly type: 'PICK_ROLE'; readonly role: RoleChoice }
  | { readonly type: 'PICK_GOAL'; readonly xp: number }
  | { readonly type: 'PROBE'; readonly unitIndex: number; readonly correct: boolean }
  | { readonly type: 'SKIP_TEST' }
  | { readonly type: 'FINISH' };

export function onboardingReducer(state: OnboardingState, event: OnboardingEvent): OnboardingState {
  switch (event.type) {
    case 'PICK_ROLE':
      return { ...state, role: event.role };
    case 'PICK_GOAL':
      return { ...state, goalXp: event.xp };
    case 'PROBE':
      return {
        ...state,
        probes: [...state.probes, { unitIndex: event.unitIndex, correct: event.correct }],
        probeCount: state.probeCount + 1,
      };
    case 'SKIP_TEST':
      return { ...state, testSkipped: true };
    case 'FINISH':
      return { ...state, finished: true };
  }
}

/**
 * Lo que EXIGE cada paso, declarado uno por uno.
 *
 * La primera versión era una escalera de `if` que devolvía el paso más avanzado alcanzable, y estaba
 * desplazada en uno: con el estado inicial devolvía `bienvenida`, así que pulsar "Empezar" ponía
 * `?paso=puesto` y el recorte lo devolvía a `bienvenida`. Como los botones de puesto viven EN esa pantalla,
 * no había forma de elegir uno, y por tanto nada se desbloqueaba nunca: la bienvenida entera estaba en
 * bloqueo y todos sus controles muertos.
 *
 * Escrito así, cada paso dice su propia condición y el desplazamiento no puede volver: `puesto` no exige
 * nada porque es simplemente "lo siguiente" de la bienvenida, no una recompensa.
 */
const REQUIRES: Readonly<Record<StepName, (s: OnboardingState, probesNeeded: number) => boolean>> = {
  bienvenida: () => true,
  puesto: () => true,
  meta: (s) => s.role !== null,
  test: (s) => s.goalXp !== null,
  listo: (s, needed) => s.finished || s.testSkipped || s.probeCount >= needed,
};

/** El paso más avanzado al que el estado da derecho. */
export function furthestAllowed(state: OnboardingState, probesNeeded: number): StepName {
  let furthest: StepName = 'bienvenida';
  for (const step of STEPS) {
    if (!REQUIRES[step](state, probesNeeded)) break;
    furthest = step;
  }
  return furthest;
}

export function clampStep(requested: string | null, state: OnboardingState, probesNeeded: number): StepName {
  const allowed = furthestAllowed(state, probesNeeded);
  const allowedAt = STEPS.indexOf(allowed);
  const wantedAt = STEPS.indexOf(requested === null ? 'bienvenida' : stepOf(requested));
  return STEPS[Math.min(wantedAt < 0 ? 0 : wantedAt, allowedAt)] ?? 'bienvenida';
}

function stepOf(name: string): StepName {
  for (const step of STEPS) if (step === name) return step;
  return 'bienvenida';
}
