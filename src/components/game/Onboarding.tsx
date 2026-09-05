'use client';

import { useMemo, useReducer, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { Button3D } from '@/components/ui/Button3D';
import { Mascot } from '@/components/game/mascot/Mascot';
import { PlayerSlot } from './PlayerSlot';
import { StepDefect } from '@/content/dynamics/_shared/StepDefect';
import '@/content/dynamics/index';
import {
  GOAL_OPTIONS,
  INITIAL,
  ROLE_OPTIONS,
  clampStep,
  onboardingReducer,
  type RoleChoice,
} from '@/game/onboarding';
import { placementResult } from '@/game/placement';
import { prepareStep } from '@/content/engine/step';
import { text, type Json } from '@/content/engine/primitives';
import { bootClient } from '@/mock/boot-client';
import { fnv1a, mix32, u01 } from '@/lib/rng';
import type { RawStep } from '@/content/engine/schema';

/** Cuántas preguntas tiene el test de nivel. Cuatro: suficiente para acreditar, corto para no cansar. */
const PROBES = 4;

interface Probe {
  readonly unitIndex: number;
  readonly unitTitle: string;
  readonly step: RawStep;
}

interface Catalog {
  readonly probesByCourse: readonly (readonly Probe[])[];
  readonly unitsByCourse: readonly number[];
}

let cache: Catalog | null = null;

/**
 * Las preguntas del test salen del CATÁLOGO REAL, no de un cuestionario aparte.
 *
 * Es la diferencia entre un test de nivel y una encuesta con aspecto de test: se califican con el mismo
 * motor, con las mismas dinámicas y con el mismo contenido que el alumno verá después. Un cuestionario
 * propio se desincroniza del curso en la primera edición desde el Studio.
 */
function readCatalog(): Catalog {
  if (cache !== null) return cache;
  const probesByCourse: (readonly Probe[])[] = [];
  const unitsByCourse: number[] = [];

  for (const course of bootClient().world.courses) {
    const units: { index: number; title: string; steps: readonly RawStep[] }[] = [];
    let index = 0;
    for (const section of course.sections) {
      for (const unit of section.units) {
        const first = unit.lessons[0];
        if (first !== undefined) units.push({ index, title: unit.title, steps: first.steps });
        index += 1;
      }
    }
    unitsByCourse.push(index);

    // Cuatro sondas repartidas por el curso: si todas salieran del principio, acertarlas no diría nada
    // sobre las unidades del final, que es justo lo que el test tiene que decidir.
    const picks: Probe[] = [];
    for (let i = 0; i < PROBES; i += 1) {
      const at = Math.floor(((i + 1) / (PROBES + 1)) * units.length);
      const unit = units[Math.min(at, units.length - 1)];
      if (unit === undefined) continue;
      const step = unit.steps[Math.floor(u01(mix32(fnv1a(course.id), i, 0)) * unit.steps.length)];
      if (step !== undefined) picks.push({ unitIndex: unit.index, unitTitle: unit.title, step });
    }
    probesByCourse.push(picks);
  }

  cache = { probesByCourse, unitsByCourse };
  return cache;
}

const subscribe = (): (() => void) => () => undefined;
const server = (): Catalog | null => null;

export function Onboarding() {
  const router = useRouter();
  const catalog = useSyncExternalStore(subscribe, readCatalog, server);
  const [state, dispatch] = useReducer(onboardingReducer, INITIAL);
  const [rawStep, setStep] = useQueryState('paso', parseAsString.withDefault('bienvenida'));
  const [draft, setDraft] = useState<Json>(null);

  const step = clampStep(rawStep, state, PROBES);
  const role = ROLE_OPTIONS.find((r) => r.id === state.role) ?? null;
  const probes = role === null ? [] : (catalog?.probesByCourse[role.courseIndex] ?? []);
  const probe = probes[state.probeCount];

  const prepared = useMemo(() => {
    if (probe === undefined) return null;
    return prepareStep(probe.step, [{ kind: 'step', id: probe.step.id, index: 0, title: text('') }]);
  }, [probe]);

  const go = (next: string): void => {
    void setStep(next);
  };

  /*
   * El catálogo se exige SOLO donde hace falta: en el test de nivel.
   *
   * Antes bloqueaba la pantalla entera, así que `/bienvenida` se servía como un esqueleto y las cuatro
   * pantallas que no necesitan datos —bienvenida, puesto, meta, resultado— tampoco aparecían hasta que el
   * mundo mockeado terminara de construirse en el cliente. Si la hidratación fallaba por lo que fuera, el
   * usuario se quedaba mirando un rectángulo gris: "no hace nada", literalmente.
   *
   * Ahora la primera pantalla llega en el HTML y el flujo sobrevive aunque el mundo tarde o falle.
   */

  /* ------------------------------------------------------------------ los cinco pasos */

  if (step === 'bienvenida') {
    return (
      <Wrap step={1}>
        <Mascot state="celebrate" size={96} />
        <h1 className="onb__title">Bienvenido a SENDA</h1>
        <p className="onb__body">
          Cinco minutos al día. Casos reales del despacho, no teoría. Empezamos por saber qué haces.
        </p>
        <Button3D size="lg" variant="primary" full onClick={() => go('puesto')}>
          Empezar
        </Button3D>
      </Wrap>
    );
  }

  if (step === 'puesto') {
    return (
      <Wrap step={2}>
        <h1 className="onb__title">¿Qué haces en el despacho?</h1>
        <p className="onb__body">Con eso elegimos tu curso. Se puede cambiar después.</p>
        <div style={{ display: 'grid', gap: 10, width: '100%' }}>
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className="onb__choice"
              aria-pressed={state.role === r.id}
              onClick={() => {
                dispatch({ type: 'PICK_ROLE', role: r.id satisfies RoleChoice });
                go('meta');
              }}
            >
              <strong>{r.label}</strong>
              <span>{r.body}</span>
            </button>
          ))}
        </div>
      </Wrap>
    );
  }

  if (step === 'meta') {
    return (
      <Wrap step={3}>
        <h1 className="onb__title">¿Cuánto quieres practicar?</h1>
        <p className="onb__body">Es tu meta diaria. Cumplirla mantiene viva la racha.</p>
        <div style={{ display: 'grid', gap: 10, width: '100%' }}>
          {GOAL_OPTIONS.map((g) => (
            <button
              key={g.minutes}
              type="button"
              className="onb__choice"
              aria-pressed={state.goalXp === g.xp}
              onClick={() => {
                dispatch({ type: 'PICK_GOAL', xp: g.xp });
                go('test');
              }}
            >
              <strong>
                {g.label} · {String(g.minutes)} min
              </strong>
              <span>{String(g.xp)} XP al día</span>
            </button>
          ))}
        </div>
      </Wrap>
    );
  }

  if (step === 'test' && catalog === null) {
    return (
      <Wrap step={4}>
        <h1 className="onb__title">Preparando tu test</h1>
        <div className="skeleton" style={{ height: 220, width: '100%', borderRadius: 20 }} />
        <span className="sr-only" role="status">
          Cargando las preguntas del test de nivel
        </span>
      </Wrap>
    );
  }

  if (step === 'test' && probe !== undefined && prepared !== null) {
    return (
      <Wrap step={4}>
        <h1 className="onb__title">Vamos a ver por dónde empiezas</h1>
        <p className="onb__body">
          Pregunta {String(state.probeCount + 1)} de {String(probes.length)} · {probe.unitTitle}
        </p>
        {!prepared.ok ? (
          <StepDefect issues={prepared.error.map((i) => ({ ...i, field: [] }))} />
        ) : (
          <div style={{ width: '100%', display: 'grid', gap: 16 }}>
            <PlayerSlot
              type={prepared.value.raw.type}
              data={prepared.value.raw.data}
              draft={draft ?? prepared.value.bound.emptyAnswer()}
              onDraft={setDraft}
              onSubmit={() => undefined}
              announce={() => undefined}
              phase="answering"
              revealed={null}
              rng={(salt) => u01(mix32(fnv1a(probe.step.id), fnv1a(salt), 0))}
              instanceId={probe.step.id}
              inputModality="pointer"
              disabled={false}
            />
            <Button3D
              size="lg"
              variant="success"
              full
              onClick={() => {
                const answer = draft ?? prepared.value.bound.emptyAnswer();
                const graded = prepared.value.bound.grade(answer);
                dispatch({
                  type: 'PROBE',
                  unitIndex: probe.unitIndex,
                  // Se califica con el MOTOR, no con una comparación propia: la misma función que usará
                  // el alumno en la lección número cuarenta.
                  correct: graded.ok && graded.value.correct,
                });
                setDraft(null);
                if (state.probeCount + 1 >= probes.length) go('listo');
              }}
            >
              Comprobar
            </Button3D>
            <button
              type="button"
              className="onb__skip"
              onClick={() => {
                // Hace falta el evento: sin marcar el salto, `listo` sigue exigiendo el test contestado y
                // el recorte devolvía al alumno a la misma pregunta. El botón existía y no hacía nada.
                dispatch({ type: 'SKIP_TEST' });
                go('listo');
              }}
            >
              Prefiero empezar desde el principio
            </button>
          </div>
        )}
      </Wrap>
    );
  }

  const total = role === null ? 26 : (catalog?.unitsByCourse[role.courseIndex] ?? 26);
  const result = placementResult(state.probes, total);

  return (
    <Wrap step={5}>
      <Mascot state={result.creditedUnits > 0 ? 'celebrate' : 'idle'} size={96} />
      <h1 className="onb__title">
        {result.creditedUnits > 0 ? `Te saltas ${String(result.creditedUnits)} unidades` : 'Empezamos por el principio'}
      </h1>
      <p className="onb__body">
        {result.reason === 'sin-credito'
          ? 'Vamos desde la primera unidad. Si ya lo dominas, avanzarás rápido y quedará registrado.'
          : result.reason === 'tope-alcanzado'
            ? 'Acreditamos hasta la mitad del curso. Un test de cuatro preguntas no puede certificar más que eso.'
            : `Contestaste bien hasta ${role?.label.toLocaleLowerCase('es-MX') ?? 'ahí'}, así que empiezas más adelante.`}
      </p>
      <Button3D
        size="lg"
        variant="primary"
        full
        onClick={() => {
          dispatch({ type: 'FINISH' });
          router.push('/aprende');
        }}
      >
        Ir a mi camino
      </Button3D>
    </Wrap>
  );
}

function Wrap({ step, children }: { readonly step: number; readonly children: React.ReactNode }) {
  return (
    <main className="onb">
      {/* El progreso del onboarding es una lista ordenada de verdad, no cinco puntos decorativos. */}
      <ol className="onb__dots" aria-label={`Paso ${String(step)} de 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <li key={n} data-done={n <= step ? 'true' : undefined} />
        ))}
      </ol>
      {children}
    </main>
  );
}
