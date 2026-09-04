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
  /** Una entrada por pregunta contestada del test de nivel. */
  readonly probes: readonly { readonly unitIndex: number; readonly correct: boolean }[];
  readonly probeCount: number;
  readonly finished: boolean;
}

export const INITIAL: OnboardingState = {
  role: null,
  goalXp: null,
  probes: [],
  probeCount: 0,
  finished: false,
};

export type OnboardingEvent =
  | { readonly type: 'PICK_ROLE'; readonly role: RoleChoice }
  | { readonly type: 'PICK_GOAL'; readonly xp: number }
  | { readonly type: 'PROBE'; readonly unitIndex: number; readonly correct: boolean }
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
    case 'FINISH':
      return { ...state, finished: true };
  }
}

/**
 * El paso más avanzado al que el estado da derecho.
 *
 * Es lo que convierte `?paso=` en un parámetro seguro: la URL puede pedir cualquier paso y esta función
 * decide hasta dónde llega. Sin ella, pegar un enlace del paso 4 en un chat lleva a un test de nivel sin
 * curso elegido, que no sabe de qué unidades sacar las preguntas.
 */
export function furthestAllowed(state: OnboardingState, probesNeeded: number): StepName {
  if (state.finished) return 'listo';
  if (state.probeCount >= probesNeeded) return 'listo';
  if (state.goalXp !== null) return 'test';
  if (state.role !== null) return 'meta';
  return 'bienvenida';
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
