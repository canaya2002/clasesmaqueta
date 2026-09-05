'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { Modal } from '@/components/ui/Modal';
import { Mascot } from '@/components/game/mascot/Mascot';
import { ComboMeter } from './ComboMeter';
import { FeedbackPanel } from './FeedbackPanel';
import { HeartBar } from './HeartBar';
import { LessonProgressBar } from './LessonProgressBar';
import { LessonSummary } from './LessonSummary';
import { PlayerSlot } from './PlayerSlot';
import { StepDefect } from '@/content/dynamics/_shared/StepDefect';
import { comboMultiplier, type EconomyConfig } from '@/content/engine/economy';
import { policyFor } from '@/content/engine/policy';
import { prepareStep } from '@/content/engine/step';
import { resolveHearts, type LessonRuntime } from '@/content/engine/runtime';
import {
  currentSlot,
  initMachine,
  machineReducer,
  progress,
  type Machine,
  type SessionEvent,
} from '@/content/engine/session';
import { gradeLesson, type LessonResult } from '@/content/engine/grade';
import type { Lesson } from '@/content/engine/schema';
import { text, type Json } from '@/content/engine/primitives';
import type { InputModality } from '@/content/engine/ui';
import { EMPTY_LIVE, LiveAnnouncer, type LiveState } from '@/lib/a11y/live-announcer';
import { useBodyFocusGuard, useFocusDirective } from '@/lib/a11y/focus';
import { activateHotkey } from '@/lib/a11y/hotkeys';
import { useVisualViewportVars } from '@/lib/viewport';
import { fnv1a, mix32, u01 } from '@/lib/rng';
import { mono } from '@/lib/clock';

/**
 * Piso perceptual entre calificar y poder avanzar.
 *
 * No es un antirrebote de comodidad: 400 ms es exactamente la ventana del acumulador de borde de salida del
 * `LiveAnnouncer`. Por debajo de eso, avanzar CANCELA el anuncio del veredicto de forma sistemática y el
 * usuario de lector de pantalla nunca se entera de si acertó. El otro medio del candado es `event.repeat`:
 * con Enter sostenido no hay tiempo que valga, hace falta una pulsación física nueva.
 */
const MIN_FEEDBACK_MS = 400;

export interface LessonShellProps {
  readonly lesson: Lesson;
  readonly runtime: LessonRuntime;
  readonly econ: EconomyConfig;
  readonly onExit: () => void;
  readonly onFinish: (result: LessonResult) => void;
}

export function LessonShell({ lesson, runtime, econ, onExit, onFinish }: LessonShellProps) {
  const policy = useMemo(() => policyFor(lesson, econ), [lesson, econ]);

  const [machine, dispatch] = useReducer(
    machineReducer,
    null,
    (): Machine =>
      initMachine({
        policy,
        stepIds: lesson.steps.map((s) => s.id),
        hearts: runtime.hearts.current,
        seed: fnv1a(lesson.id),
        atMs: mono(),
      }),
  );

  const state = machine.state;
  const slot = currentSlot(state);
  // El overlay lo posee la MÁQUINA, no el componente. Duplicarlo en `useState` fue el primer intento y
  // deja dos fuentes de verdad para la misma pregunta: el reducer abre "sin corazones" al calificar y el
  // componente nunca se enteraba. Además, `OPEN_OVERLAY` pone `advanceAtMs` en null, así que el cronómetro
  // del paso se detiene mientras el alumno decide si sale — el tiempo del resumen no incluye esa pausa.
  const overlay = state.overlay;

  const [drafts, setDrafts] = useState<Readonly<Record<string, Json>>>({});
  const [live, setLive] = useState<LiveState>(EMPTY_LIVE);
  const [vitals, setVitals] = useState<LiveState>(EMPTY_LIVE);
  const [modality, setModality] = useState<InputModality>('pointer');
  const [practiceOverride, setPracticeOverride] = useState(false);
  const [gradedAtMs, setGradedAtMs] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const summaryRef = useRef<HTMLHeadingElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const armed = useRef(true);
  const liveRef = useRef(new LiveAnnouncer(setLive));
  const vitalsRef = useRef(new LiveAnnouncer(setVitals));

  /* --------------------------------------------------------------- el paso actual */

  const rawStep = slot === null ? null : (lesson.steps.find((s) => s.id === slot.stepId) ?? null);

  const prepared = useMemo(() => {
    if (rawStep === null) return null;
    return prepareStep(rawStep, [
      { kind: 'lesson', id: lesson.id, index: 0, title: lesson.title },
      { kind: 'step', id: rawStep.id, index: state.cursor, title: text('') },
    ]);
  }, [rawStep, lesson.id, lesson.title, state.cursor]);

  const hearts = useMemo(
    () =>
      resolveHearts({
        heartsSystemEnabled: econ.maxHearts > 0,
        maxHearts: econ.maxHearts,
        hostAllowsHearts: runtime.hostAllowsHearts,
        practiceOverride,
        unlimited: runtime.hearts.unlimited,
        lessonHeartsEnabled: lesson.heartsEnabled,
        dynamicConsumesHearts: prepared?.ok === true ? prepared.value.dynamic.consumesHearts : true,
      }),
    [
      econ.maxHearts,
      runtime.hostAllowsHearts,
      runtime.hearts.unlimited,
      practiceOverride,
      lesson.heartsEnabled,
      prepared,
    ],
  );

  const instanceId = slot?.instanceId ?? 'none';
  const draft = drafts[instanceId] ?? (prepared?.ok === true ? prepared.value.bound.emptyAnswer() : null);

  const rng = useCallback((salt: string) => u01(mix32(fnv1a(instanceId), fnv1a(salt), 0)), [instanceId]);

  const answered = state.phase !== 'answering' && state.phase !== 'checking';

  /* ------------------------------------------------- ejecutor de comandos de una vez */

  useEffect(() => {
    if (machine.queue.length === 0) return;
    const applied: string[] = [];
    for (const cmd of machine.queue) {
      applied.push(cmd.key);
      if (cmd.t === 'PlaySfx') runtime.playSfx(cmd.id);
      else if (cmd.t === 'Burst') runtime.burst(stageRef.current);
      else if (cmd.t === 'SpendHeart') runtime.spendHeart();
      else if (cmd.t === 'PersistAttempt') runtime.persistAttempt(cmd.attempt);
    }
    dispatch({ type: 'CMDS_APPLIED', keys: applied });
  }, [machine.queue, runtime]);

  /* ---------------------------------------------------------- guarda de navegación */

  /**
   * El gesto de atrás —deslizar desde el borde en móvil, el más frecuente que existe— destruiría el estado
   * en memoria de la sesión y con él el progreso de la lección. Un sentinel en el historial lo convierte en
   * lo que el alumno quería decir: "quiero salir", que es una pregunta, no una acción.
   */
  useEffect(() => {
    if (state.finished) return;
    history.pushState({ senda: 'lesson-guard' }, '');
    const onPop = (): void => {
      history.pushState({ senda: 'lesson-guard' }, '');
      dispatch({ type: 'OPEN_OVERLAY', overlay: 'exit-confirm', atMs: mono() });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [state.finished]);

  useEffect(() => {
    if (state.finished || state.attempts.length === 0) return;
    const onLeave = (event: BeforeUnloadEvent): void => event.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [state.finished, state.attempts.length]);

  /* ------------------------------------------------------------ foco y modalidad */

  useEffect(() => {
    const onKey = (): void => setModality('keyboard');
    const onPointer = (): void => setModality('pointer');
    window.addEventListener('keydown', onKey, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, []);

  // El foco va al ENCABEZADO del paso, no al botón: aterrizar en "Continuar" invita a pulsarlo antes de
  // leer el ejercicio y deja al lector de pantalla empezando por el final.
  useFocusDirective(state.finished ? 'summary' : `step:${String(state.cursor)}`, state.finished ? summaryRef : headingRef);
  useBodyFocusGuard(headingRef, !state.finished);
  useVisualViewportVars(rootRef);

  // Sin vidas: el anuncio va a la región ASSERTIVE porque cambia lo que el alumno PUEDE hacer, que es el
  // único caso que R9 reserva para assertive.
  useEffect(() => {
    if (state.hearts === 0 && hearts.consumes) vitalsRef.current.now('Te quedaste sin corazones.');
  }, [state.hearts, hearts.consumes]);

  // Un paso añadido a mitad de lección cambia el total. Sin decirlo, la barra parece retroceder sola.
  useEffect(() => {
    if (state.progressIntent === 'extend') liveRef.current.trailing('Se anadio un ejercicio de repaso.');
  }, [state.progressIntent, state.plannedSlots]);

  /* ------------------------------------------------------------------- acciones */

  const send = useCallback((event: SessionEvent) => dispatch(event), []);

  const check = useCallback(() => {
    if (prepared === null || !prepared.ok || draft === null) return;
    if (state.phase !== 'answering') return;

    // Sin respuesta, el botón NO se queda callado.
    //
    // Antes salía de aquí en silencio: el control se veía apagado, se podía pulsar, y no pasaba nada. Un
    // botón que no responde es indistinguible de uno roto, y quien no sabe que el ejercicio esperaba una
    // selección se queda mirando la pantalla. Ahora lo dice y sacude el paso, que es la única forma de
    // movimiento que el sistema permite en un control inerte.
    if (!prepared.value.bound.canSubmit(draft)) {
      liveRef.current.now('Todavía no has contestado. Elige una respuesta para continuar.');
      if (stageRef.current !== null) runtime.nudge(stageRef.current);
      return;
    }

    send({ type: 'CHECK', atMs: mono() });
    const graded = prepared.value.bound.grade(draft);
    if (!graded.ok) return;

    setGradedAtMs(mono());
    armed.current = false;
    send({
      type: 'GRADED',
      epoch: state.epoch,
      instanceId,
      correct: graded.value.correct,
      score: graded.value.score,
      weight: rawStep?.assessmentWeight ?? 1,
      atMs: mono(),
    });

    // El nombre accesible del botón cambia de "Comprobar" a "Continuar" bajo el foco. Sin decirlo, el
    // usuario de lector de pantalla pulsa lo que cree que sigue siendo Comprobar.
    const verdictText = graded.value.correct ? 'Correcto.' : 'Incorrecto.';
    liveRef.current.trailing(`${verdictText} Continuar.`);
  }, [prepared, draft, state.phase, state.epoch, instanceId, rawStep, send, runtime]);

  const advance = useCallback(() => {
    if (mono() - gradedAtMs < MIN_FEEDBACK_MS) return;
    send({ type: 'CONTINUE', atMs: mono() });
  }, [gradedAtMs, send]);

  // El handler lee la fase del ESTADO, no de una variable capturada al elegir qué función colgar: con un
  // solo nodo DOM que cambia de etiqueta, un pointerdown sobre "Comprobar" y un pointerup ya sobre
  // "Continuar" generan un click que avanzaría sin que el alumno llegue a ver el feedback.
  const onPrimary = useCallback(() => {
    if (state.phase === 'answering') check();
    else if (state.phase !== 'checking') advance();
  }, [state.phase, check, advance]);

  /* ------------------------------------------------------- un solo listener global */

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === 'Enter') armed.current = true;
    };
    const onKey = (event: KeyboardEvent): void => {
      // Con un <dialog> modal abierto el resto del documento es inerte, pero el listener sigue en `window`:
      // sin esta guarda, 1-9 seguiría marcando opciones en el paso de abajo y Enter lo calificaría.
      if (overlay !== 'none') return;
      // Teclas muertas y acentos en es-MX: durante la composición el evento llega con keyCode 229 y la tecla
      // NO es lo que el usuario quiso escribir. Sin esto, escribir "á" en completar el espacio dispara atajos.
      if (event.isComposing || event.keyCode === 229) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      const inField =
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]') !== null;

      if (event.key === 'Escape') {
        event.preventDefault();
        send({ type: 'OPEN_OVERLAY', overlay: 'exit-confirm', atMs: mono() });
        return;
      }
      if (inField && event.key !== 'Enter') return;

      if (event.key === '?') {
        event.preventDefault();
        send({ type: 'OPEN_OVERLAY', overlay: 'shortcuts', atMs: mono() });
        return;
      }
      if (event.key === 'Enter') {
        // Si el foco está en un botón o enlace, la activación NATIVA ya va a ocurrir. Manejarlo aquí además
        // dispara dos acciones: "Reportar este ejercicio" Y avanzar de paso.
        if (target instanceof HTMLElement && target.closest('button, a[href], summary') !== null) return;
        event.preventDefault();
        if (event.repeat || !armed.current) return;
        onPrimary();
        return;
      }
      // Las teclas numéricas no las interpreta el shell: activa el control que ya declaró esa tecla en el
      // DOM. Cero superficie de contrato y un solo listener para catorce dinámicas.
      if (!/^[1-9]$/.test(event.key) || state.phase !== 'answering' || event.repeat) return;
      if (activateHotkey(stageRef.current, event.key)) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [overlay, state.phase, onPrimary, send]);

  /* ------------------------------------------------------------------ resultado */

  const result = useMemo((): LessonResult | null => {
    if (!state.finished) return null;
    return gradeLesson(state.attempts, {
      econ,
      policy,
      difficulty: lesson.difficulty,
      xpWeightByStep: new Map(lesson.steps.map((s) => [s.id, s.xpWeight])),
      firstClear: true,
      estimatedSeconds: lesson.steps.length * 12,
    });
  }, [state.finished, state.attempts, econ, policy, lesson]);

  useEffect(() => {
    if (result !== null) onFinish(result);
  }, [result, onFinish]);

  /* --------------------------------------------------------------------- render */

  if (result !== null) {
    return <LessonSummary result={result} headingRef={summaryRef} onContinue={onExit} />;
  }

  const canSubmit = prepared !== null && prepared.ok && draft !== null && prepared.value.bound.canSubmit(draft);
  const lastAttempt = state.attempts[state.attempts.length - 1];
  const verdict =
    lastAttempt === undefined
      ? 'wrong'
      : lastAttempt.outcome === 'correct'
        ? 'correct'
        : lastAttempt.score > 0
          ? 'partial'
          : 'wrong';

  return (
    <div
      ref={rootRef}
      style={{
        // `--app-h` la escribe visualViewport; `100dvh` es el respaldo para navegadores sin la API.
        height: 'var(--app-h, 100dvh)',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        background: 'var(--bg-canvas)',
      }}
    >
      {/* El primer tabstop lleva al EJERCICIO, no a salir: hacer de la acción destructiva la más accesible
          es exactamente al revés de lo que un enlace de salto debe hacer. Salir vive en el encabezado. */}
      <a href="#paso" className="skip-link">
        Ir al ejercicio
      </a>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <button
          type="button"
          aria-label="Salir de la lección"
          onClick={() => send({ type: 'OPEN_OVERLAY', overlay: 'exit-confirm', atMs: mono() })}
          style={{
            minWidth: 'var(--tap-min)',
            minHeight: 'var(--tap-min)',
            border: 0,
            background: 'none',
            color: 'var(--fg-muted)',
            fontSize: 'var(--t-22)',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
        <LessonProgressBar
          value={progress(state)}
          intent={state.progressIntent}
          label={`Paso ${String(Math.min(state.cursor + 1, state.plannedSlots))} de ${String(state.plannedSlots)}`}
        />
        {hearts.hud !== 'hidden' && (
          <HeartBar
            econ={econ}
            current={state.hearts}
            infinite={hearts.hud === 'infinite'}
            badge={hearts.practiceBadge}
          />
        )}
        <button
          type="button"
          aria-label="Atajos de teclado"
          onClick={() => send({ type: 'OPEN_OVERLAY', overlay: 'shortcuts', atMs: mono() })}
          style={{
            minWidth: 'var(--tap-min)',
            minHeight: 'var(--tap-min)',
            border: 0,
            background: 'none',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
          }}
        >
          ?
        </button>
      </header>

      <div
        ref={stageRef}
        style={{ padding: '8px 16px 24px', maxWidth: 720, width: '100%', marginInline: 'auto', overflowY: 'auto' }}
      >
        {/* Fuera del límite de Suspense: si viviera dentro, resolver el chunk perezoso reemplazaría el nodo
            enfocado y el foco caería a `body` a mitad de cada paso. */}
        <h1 id="paso" ref={headingRef} tabIndex={-1} className="sr-only">
          {lesson.title}, paso {String(state.cursor + 1)} de {String(state.plannedSlots)}
        </h1>

        <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 32 }}>
          <ComboMeter run={state.comboRun} multiplier={comboMultiplier(econ, state.comboRun)} />
        </div>

        {prepared === null ? (
          <div className="skeleton" style={{ height: 200 }} />
        ) : !prepared.ok ? (
          <StepDefect issues={prepared.error.map((i) => ({ ...i, field: [] }))} />
        ) : (
          <PlayerSlot
            type={prepared.value.raw.type}
            data={prepared.value.raw.data}
            draft={draft ?? prepared.value.bound.emptyAnswer()}
            onDraft={(next) => setDrafts((d) => ({ ...d, [instanceId]: next }))}
            onSubmit={check}
            announce={(t) => liveRef.current.trailing(t)}
            phase={
              state.phase === 'checking'
                ? 'checking'
                : answered
                  ? verdict === 'correct'
                    ? 'correct'
                    : 'revealed'
                  : 'answering'
            }
            revealed={answered && policy.revealOnWrong ? prepared.value.bound.solution() : null}
            rng={rng}
            instanceId={instanceId}
            inputModality={modality}
            disabled={state.phase !== 'answering'}
          />
        )}
      </div>

      <footer style={{ display: 'grid', paddingBottom: 'var(--kb-inset, 0px)' }}>
        <FeedbackPanel
          open={answered}
          kind={verdict}
          explanation={rawStep?.explanation ?? null}
          detail={
            lastAttempt !== undefined && lastAttempt.score > 0 && lastAttempt.score < 1
              ? `${String(Math.round(lastAttempt.score * 100))}% de acierto`
              : null
          }
          onReport={() => {
            if (rawStep === null) return;
            runtime.reportStep({
              stepId: rawStep.id,
              lessonId: lesson.id,
              contentHash: instanceId,
              reason: 'unclear',
              comment: '',
              path: null,
            });
            liveRef.current.trailing('Gracias. El ejercicio quedo reportado.');
          }}
        />
        {/* El botón vive FUERA del panel: dentro quedaría inerte cada vez que el panel se cierra. */}
        <div style={{ padding: 16, background: 'var(--bg-paper)' }}>
          <Button3D
            full
            size="lg"
            variant={answered ? 'primary' : canSubmit ? 'success' : 'locked'}
            onClick={onPrimary}
          >
            {answered ? 'Continuar' : 'Comprobar'}
          </Button3D>
        </div>
      </footer>

      {/* Dos regiones, montadas VACÍAS desde el primer paint y nunca inertes. Una región que aparece junto
          con su primer mensaje no anuncia ese mensaje. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        <span>{live.a}</span>
        <span>{live.b}</span>
      </div>
      <div role="alert" className="sr-only">
        <span>{vitals.a}</span>
        <span>{vitals.b}</span>
      </div>

      <Modal
        open={overlay === 'exit-confirm'}
        onClose={() => send({ type: 'CLOSE_OVERLAY', atMs: mono() })}
        title="¿Salir de la lección?"
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Mascot state="wrong" size={96} />
          <div>
            <h2 style={{ fontSize: 'var(--t-22)', margin: 0 }}>¿Seguro que quieres salir?</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
              Se guarda lo que ya contestaste, pero el XP se otorga al terminar.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button3D size="md" variant="ghost" onClick={() => send({ type: 'CLOSE_OVERLAY', atMs: mono() })}>
            Seguir aquí
          </Button3D>
          <Button3D size="md" variant="danger" onClick={onExit}>
            Salir
          </Button3D>
        </div>
      </Modal>

      <Modal
        open={overlay === 'no-hearts'}
        onClose={() => send({ type: 'CLOSE_OVERLAY', atMs: mono() })}
        title="Te quedaste sin corazones"
        dismissable={false}
      >
        <h2 style={{ fontSize: 'var(--t-22)', margin: 0 }}>Te quedaste sin corazones</h2>
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
          Puedes recargarlos ahora, seguir practicando sin que cuente para tu progreso, o salir y esperar.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          <Button3D
            size="md"
            variant="primary"
            onClick={() => {
              runtime.refillHearts();
              send({ type: 'CLOSE_OVERLAY', atMs: mono() });
            }}
          >
            Recargar por {String(econ.priceHeartRefill)} gemas
          </Button3D>
          {/* La tercera salida es la que evita que la demo se congele aquí. No otorga progreso, y se dice. */}
          <Button3D
            size="md"
            variant="ghost"
            onClick={() => {
              setPracticeOverride(true);
              send({ type: 'CLOSE_OVERLAY', atMs: mono() });
              liveRef.current.trailing('Modo practica. Este intento no cuenta para tu progreso.');
            }}
          >
            Practicar sin corazones
          </Button3D>
          <Button3D size="md" variant="ghost" onClick={onExit}>
            Salir y esperar
          </Button3D>
        </div>
      </Modal>

      <Modal
        open={overlay === 'shortcuts'}
        onClose={() => send({ type: 'CLOSE_OVERLAY', atMs: mono() })}
        title="Atajos de teclado"
      >
        <h2 style={{ fontSize: 'var(--t-22)', margin: 0 }}>Atajos</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', margin: 0 }}>
          <dt>
            <kbd>1</kbd>–<kbd>9</kbd>
          </dt>
          <dd style={{ margin: 0 }}>Elegir opción</dd>
          <dt>
            <kbd>Enter</kbd>
          </dt>
          <dd style={{ margin: 0 }}>Comprobar y continuar</dd>
          <dt>
            <kbd>Espacio</kbd>
          </dt>
          <dd style={{ margin: 0 }}>Tomar y soltar al ordenar</dd>
          <dt>
            <kbd>Esc</kbd>
          </dt>
          <dd style={{ margin: 0 }}>Salir de la lección</dd>
        </dl>
        <Button3D size="md" variant="primary" onClick={() => send({ type: 'CLOSE_OVERLAY', atMs: mono() })}>
          Entendido
        </Button3D>
      </Modal>
    </div>
  );
}
