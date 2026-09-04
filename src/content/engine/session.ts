/**
 * SENDA — la máquina de sesión de lección, headless.
 *
 * Sin React, sin DOM, sin reloj propio. El componente de la Fase 4 es una carcasa de presentación; el
 * preview del Studio, el test de nivel, el contrarreloj y el repaso corren esta MISMA máquina sin duplicar
 * reglas.
 *
 * Tres decisiones que salieron de una revisión adversarial y que no son obvias:
 *
 * 1. **Los comandos se parten en dos familias.** `OneShot` (sonar, gastar un corazón, persistir un intento)
 *    se deduplica por una CLAVE ESTABLE, no por un contador. `Activity` no es comando: es estado declarativo
 *    —temporizadores, foco, mensaje `aria-live`— que se reconcilia en cada render. Con un contador y un ref,
 *    StrictMode monta → limpia → monta, la limpieza cancela el avance automático de 700 ms, el segundo
 *    montaje lo descarta por `seq` ya visto, y la sesión se queda clavada en «correcto» para siempre.
 *
 * 2. **El rng y el contador viven DENTRO del estado** y avanzan funcionalmente. Con un rng cerrado sobre el
 *    puerto, React invoca el reducer dos veces en desarrollo, la semilla avanza el doble y la misma semilla
 *    deja de reproducir la misma sesión entre dev y producción, en silencio.
 *
 * 3. **El progreso es monótono por contrato.** Re-encolar un paso hace crecer el denominador, así que una
 *    barra dibujada como `hechos/total` RETROCEDE en el mismo frame en que dispara el rebote de avance. El
 *    estado publica una INTENCIÓN (`advance` | `extend`) y la barra anima distinto según cuál.
 */

import { splitmix32 } from '@/lib/rng';
import type { SessionPolicy } from './policy';
import type { Score01, StepId } from './primitives';
import { score } from './primitives';

export type StepPhase = 'idle' | 'answering' | 'checking' | 'correct' | 'wrong' | 'revealed' | 'skipped';
/** El reporte es una región PARALELA: tres cosas ortogonales tienen que coexistir con la fase del paso. */
export type ReportPhase = 'closed' | 'open' | 'sending' | 'sent';
export type OverlayPhase = 'none' | 'exit-confirm' | 'no-hearts' | 'shortcuts';
export type Outcome = 'correct' | 'wrong' | 'revealed' | 'skipped';

/** Una instancia de paso en la cola. El mismo `stepId` puede aparecer dos veces (re-encolado). */
export interface Slot {
  readonly stepId: StepId;
  readonly instanceId: string;
  readonly attemptIndex: number;
}

export interface Attempt {
  readonly stepId: StepId;
  readonly instanceId: string;
  readonly attemptIndex: number;
  readonly outcome: Outcome;
  readonly score: Score01;
  /**
   * El peso VIGENTE al momento del intento.
   *
   * Sin esto, la precisión histórica de un alumno cambia cuando alguien retoca la economía en el Studio, y
   * el reporte trimestral pasa de 78% a 71% sin que nadie haya contestado nada.
   */
  readonly weightAtTime: 1 | 2 | 3;
  readonly usedHint: boolean;
  readonly elapsedMs: number;
  readonly comboRunAfter: number;
}

export interface LiveMessage {
  readonly text: string;
  readonly politeness: 'polite' | 'assertive';
  /** Cambia en cada mensaje para que el lector de pantalla re-anuncie un texto idéntico. */
  readonly nonce: number;
}

export interface SessionState {
  readonly epoch: number;
  readonly policy: SessionPolicy;
  readonly slots: readonly Slot[];
  readonly cursor: number;
  readonly phase: StepPhase;
  readonly report: ReportPhase;
  readonly overlay: OverlayPhase;
  readonly hearts: number;
  readonly comboRun: number;
  readonly maxCombo: number;
  readonly attempts: readonly Attempt[];
  readonly requeuedTotal: number;
  readonly requeuedByStep: Readonly<Record<string, number>>;
  readonly usedHint: boolean;
  /** Solo CRECE. La barra nunca retrocede. */
  readonly plannedSlots: number;
  readonly progressIntent: 'advance' | 'extend' | 'none';
  readonly rngState: number;
  readonly nextSeq: number;
  /** Actividades declarativas: se reconcilian en cada render, así que StrictMode las re-crea solas. */
  readonly advanceAtMs: number | null;
  readonly focusTarget: 'prompt' | 'cta' | 'none';
  readonly liveMessage: LiveMessage | null;
  readonly stepStartedAtMs: number;
  readonly pausedMs: number;
  readonly finished: boolean;
}

/** Efectos de UNA SOLA VEZ. Se deduplican por `key`, que es estable entre montajes. */
export type OneShot =
  | { readonly key: string; readonly t: 'PlaySfx'; readonly id: 'correct' | 'wrong' | 'combo' | 'tap' }
  | { readonly key: string; readonly t: 'SpendHeart' }
  | { readonly key: string; readonly t: 'PersistAttempt'; readonly attempt: Attempt }
  | { readonly key: string; readonly t: 'Burst' }
  | { readonly key: string; readonly t: 'FinishLesson' };

export type SessionEvent =
  | { readonly type: 'ANSWER_DRAFTED'; readonly hasAnswer: boolean }
  | { readonly type: 'CHECK'; readonly atMs: number }
  | {
      readonly type: 'GRADED';
      readonly epoch: number;
      readonly instanceId: string;
      readonly correct: boolean;
      readonly score: Score01;
      readonly weight: 1 | 2 | 3;
      readonly atMs: number;
    }
  | { readonly type: 'CONTINUE'; readonly atMs: number }
  | { readonly type: 'USE_HINT' }
  | { readonly type: 'SKIP'; readonly atMs: number }
  | { readonly type: 'OPEN_OVERLAY'; readonly overlay: OverlayPhase; readonly atMs: number }
  | { readonly type: 'CLOSE_OVERLAY'; readonly atMs: number }
  | { readonly type: 'REPORT'; readonly phase: ReportPhase }
  | { readonly type: 'TICK'; readonly atMs: number };

export interface SessionInit {
  readonly policy: SessionPolicy;
  readonly stepIds: readonly StepId[];
  readonly hearts: number;
  readonly seed: number;
  readonly atMs: number;
}

export function initSession(init: SessionInit): SessionState {
  return {
    epoch: 1,
    policy: init.policy,
    slots: init.stepIds.map((stepId) => ({ stepId, instanceId: `${stepId}#0`, attemptIndex: 0 })),
    cursor: 0,
    phase: 'answering',
    report: 'closed',
    overlay: 'none',
    hearts: init.policy.heartsEnabled ? init.hearts : Number.POSITIVE_INFINITY,
    comboRun: 0,
    maxCombo: 0,
    attempts: [],
    requeuedTotal: 0,
    requeuedByStep: {},
    usedHint: false,
    plannedSlots: init.stepIds.length,
    progressIntent: 'none',
    rngState: init.seed >>> 0,
    nextSeq: 1,
    advanceAtMs: null,
    focusTarget: 'prompt',
    liveMessage: null,
    stepStartedAtMs: init.atMs,
    pausedMs: 0,
    finished: false,
  };
}

export function currentSlot(state: SessionState): Slot | null {
  return state.slots[state.cursor] ?? null;
}

/** Fracción de progreso. Monótona por construcción, porque `plannedSlots` solo crece. */
export function progress(state: SessionState): number {
  return state.plannedSlots === 0 ? 0 : Math.min(1, state.cursor / state.plannedSlots);
}

const AUTO_ADVANCE_MS = 700;

function say(text: string, politeness: 'polite' | 'assertive', nonce: number): LiveMessage {
  return { text, politeness, nonce };
}

/**
 * El reducer PURO. No llama al reloj, ni al rng externo, ni al puerto: todo lo que necesita llega por el
 * evento o vive en el estado.
 */
export function sessionReducer(
  state: SessionState,
  event: SessionEvent,
): readonly [SessionState, readonly OneShot[]] {
  if (state.finished) return [state, []];

  switch (event.type) {
    case 'ANSWER_DRAFTED':
      return [{ ...state, focusTarget: event.hasAnswer ? 'cta' : 'prompt' }, []];

    case 'USE_HINT':
      if (!state.policy.allowHints) return [state, []];
      return [{ ...state, usedHint: true }, []];

    case 'CHECK': {
      if (state.phase !== 'answering') return [state, []];
      return [{ ...state, phase: 'checking' }, []];
    }

    case 'GRADED': {
      // Sellado por época e instancia: una calificación que aterriza tarde —el alumno ya tocó continuar—
      // se descarta en vez de aplicarse al paso equivocado.
      const slot = currentSlot(state);
      if (state.epoch !== event.epoch || slot === null || slot.instanceId !== event.instanceId) {
        return [state, []];
      }
      if (state.phase !== 'checking') return [state, []];

      const elapsedMs = Math.max(0, event.atMs - state.stepStartedAtMs - state.pausedMs);
      const outcome: Outcome = event.correct ? 'correct' : state.policy.revealOnWrong ? 'revealed' : 'wrong';
      const comboRun = event.correct ? state.comboRun + 1 : 0;

      const attempt: Attempt = {
        stepId: slot.stepId,
        instanceId: slot.instanceId,
        attemptIndex: slot.attemptIndex,
        outcome,
        score: event.correct ? event.score : score(0),
        weightAtTime: event.weight,
        usedHint: state.usedHint,
        elapsedMs,
        comboRunAfter: comboRun,
      };

      const cmds: OneShot[] = [
        { key: `${slot.instanceId}:sfx`, t: 'PlaySfx', id: event.correct ? 'correct' : 'wrong' },
        { key: `${slot.instanceId}:persist`, t: 'PersistAttempt', attempt },
      ];
      if (event.correct) cmds.push({ key: `${slot.instanceId}:burst`, t: 'Burst' });

      let hearts = state.hearts;
      if (!event.correct && state.policy.heartsEnabled) {
        hearts = Math.max(0, hearts - 1);
        cmds.push({ key: `${slot.instanceId}:heart`, t: 'SpendHeart' });
      }

      // Re-encolado: NUNCA en examen. Si fallar revela la respuesta Y el paso reaparece, el alumno lo
      // contesta ya sabiendo la respuesta: eso es exposición de reactivo, no repaso.
      const requeuedForStep = state.requeuedByStep[slot.stepId] ?? 0;
      const canRequeue =
        !event.correct &&
        state.policy.requeueOnWrong &&
        requeuedForStep < state.policy.maxRequeuesPerStep &&
        state.requeuedTotal < state.policy.maxRequeuesPerSession;

      const slots = canRequeue
        ? [
            ...state.slots,
            {
              stepId: slot.stepId,
              instanceId: `${slot.stepId}#${slot.attemptIndex + 1}`,
              attemptIndex: slot.attemptIndex + 1,
            },
          ]
        : state.slots;

      const nonce = state.nextSeq;
      const message = canRequeue
        ? say('Se agregó un repaso al final de la lección', 'polite', nonce)
        : hearts === 0 && state.policy.heartsEnabled
          ? say('Te quedaste sin corazones', 'assertive', nonce)
          : say(event.correct ? 'Correcto' : 'Revisa esto', 'polite', nonce);

      return [
        {
          ...state,
          phase: event.correct ? 'correct' : outcome === 'revealed' ? 'revealed' : 'wrong',
          hearts,
          comboRun,
          maxCombo: Math.max(state.maxCombo, comboRun),
          attempts: [...state.attempts, attempt],
          slots,
          requeuedTotal: canRequeue ? state.requeuedTotal + 1 : state.requeuedTotal,
          requeuedByStep: canRequeue
            ? { ...state.requeuedByStep, [slot.stepId]: requeuedForStep + 1 }
            : state.requeuedByStep,
          plannedSlots: canRequeue ? state.plannedSlots + 1 : state.plannedSlots,
          progressIntent: canRequeue ? 'extend' : 'none',
          overlay: hearts === 0 && state.policy.heartsEnabled ? 'no-hearts' : state.overlay,
          advanceAtMs: event.correct ? event.atMs + AUTO_ADVANCE_MS : null,
          focusTarget: 'cta',
          liveMessage: message,
          nextSeq: state.nextSeq + 1,
        },
        cmds,
      ];
    }

    case 'CONTINUE': {
      if (state.phase === 'answering' || state.phase === 'checking') return [state, []];
      const nextCursor = state.cursor + 1;
      const finished = nextCursor >= state.slots.length;
      const [, rngState] = splitmix32(state.rngState);

      return [
        {
          ...state,
          cursor: nextCursor,
          phase: finished ? 'idle' : 'answering',
          usedHint: false,
          progressIntent: 'advance',
          advanceAtMs: null,
          focusTarget: 'prompt',
          stepStartedAtMs: event.atMs,
          pausedMs: 0,
          rngState,
          nextSeq: state.nextSeq + 1,
          finished,
        },
        finished ? [{ key: `lesson:${state.epoch}:finish`, t: 'FinishLesson' }] : [],
      ];
    }

    case 'SKIP': {
      const slot = currentSlot(state);
      if (slot === null) return [state, []];
      const attempt: Attempt = {
        stepId: slot.stepId,
        instanceId: slot.instanceId,
        attemptIndex: slot.attemptIndex,
        outcome: 'skipped',
        score: score(0),
        weightAtTime: 1,
        usedHint: state.usedHint,
        elapsedMs: Math.max(0, event.atMs - state.stepStartedAtMs - state.pausedMs),
        comboRunAfter: 0,
      };
      return [
        {
          ...state,
          phase: 'skipped',
          comboRun: 0,
          attempts: [...state.attempts, attempt],
          liveMessage: say('Ejercicio omitido', 'polite', state.nextSeq),
          nextSeq: state.nextSeq + 1,
        },
        [{ key: `${slot.instanceId}:persist`, t: 'PersistAttempt', attempt }],
      ];
    }

    case 'OPEN_OVERLAY':
      // El cronómetro del paso se DETIENE mientras hay un overlay: si no, el tiempo de un paso incluye lo
      // que el alumno tardó en leer el modal de salida, y la métrica de ritmo miente.
      return [{ ...state, overlay: event.overlay, advanceAtMs: null }, []];

    case 'CLOSE_OVERLAY':
      return [{ ...state, overlay: 'none' }, []];

    case 'REPORT':
      return [{ ...state, report: event.phase }, []];

    case 'TICK': {
      if (state.advanceAtMs === null || event.atMs < state.advanceAtMs) return [state, []];
      return sessionReducer(state, { type: 'CONTINUE', atMs: event.atMs });
    }

    default:
      return [state, []];
  }
}

/* ------------------------------------------------------- envoltura para useReducer */

export interface Machine {
  readonly state: SessionState;
  readonly queue: readonly OneShot[];
  readonly appliedKeys: ReadonlySet<string>;
}

export type MachineEvent = SessionEvent | { readonly type: 'CMDS_APPLIED'; readonly keys: readonly string[] };

/**
 * El reducer que `useReducer` puede usar de verdad.
 *
 * `(state, event) => [state, cmds]` no es una firma válida de `useReducer`: entrada y retorno deben coincidir.
 * Dejar la cola en un ref la pierde en el remontaje de StrictMode o la ejecuta desde un render que React
 * descartó — y entonces se descuenta un corazón por un intento que nunca ocurrió.
 */
export function machineReducer(machine: Machine, event: MachineEvent): Machine {
  if (event.type === 'CMDS_APPLIED') {
    const applied = new Set(machine.appliedKeys);
    for (const k of event.keys) applied.add(k);
    return {
      state: machine.state,
      queue: machine.queue.filter((c) => !event.keys.includes(c.key)),
      appliedKeys: applied,
    };
  }

  const [state, cmds] = sessionReducer(machine.state, event);
  const fresh = cmds.filter((c) => !machine.appliedKeys.has(c.key) && !machine.queue.some((q) => q.key === c.key));
  return { state, queue: [...machine.queue, ...fresh], appliedKeys: machine.appliedKeys };
}

export function initMachine(init: SessionInit): Machine {
  return { state: initSession(init), queue: [], appliedKeys: new Set() };
}
