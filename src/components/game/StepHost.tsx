'use client';

/**
 * Anfitrión de UN paso: es lo que hace que las dinámicas se puedan jugar antes de que exista el
 * `LessonShell` completo de la Fase 4.
 *
 * Implementa la misma interfaz que el shell va a implementar —fase, draft, envío, anuncios— con sumideros
 * en memoria: no gasta corazones ni escribe intentos. Esa es la razón de que exista como pieza aparte y no
 * como un modo del shell: el preview del Studio va a usar exactamente esta, y con un flag `isPreview`
 * dentro del shell, el día que alguien lo olvide el editor empieza a gastar vidas reales.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import type { ErasedDynamic, GradeResult } from '@/content/engine/dynamic';
import type { Json } from '@/content/engine/primitives';
import { playerRegistry } from '@/content/dynamics/ui-registry';
import type { ErasedPlayerProps, InputModality, StepUiPhase } from '@/content/engine/ui';
import { EMPTY_LIVE, LiveAnnouncer, type LiveState } from '@/lib/a11y/live-announcer';
import { Button3D } from '@/components/ui/Button3D';
import { Verdict } from '@/content/dynamics/_shared/Verdict';
import * as fx from '@/design/fx';
import { fnv1a, mix32, u01 } from '@/lib/rng';

export interface StepHostProps {
  readonly dynamic: ErasedDynamic;
  readonly data: Json;
  readonly instanceId: string;
  readonly explanation?: string;
}

export function StepHost({ dynamic, data, instanceId, explanation }: StepHostProps) {
  const [draft, setDraft] = useState<Json>(null);
  const [phase, setPhase] = useState<StepUiPhase>('answering');
  const [result, setResult] = useState<GradeResult<Json> | null>(null);
  const [movement, setMovement] = useState<LiveState>(EMPTY_LIVE);
  const [verdictLive, setVerdictLive] = useState<LiveState>(EMPTY_LIVE);
  const [modality, setModality] = useState<InputModality>('pointer');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const bound = useMemo(() => dynamic.bind(data), [dynamic, data]);
  // Indexación PURA del registro, no una llamada que devuelva un componente: el `lazy` se creó en tiempo
  // de módulo, así que el tipo de elemento es el mismo objeto en cada repintado y React nunca remonta.
  const table: Readonly<Record<string, ComponentType<ErasedPlayerProps> | undefined>> = playerRegistry;
  const Player = table[dynamic.type] ?? null;

  const movementLive = useRef(new LiveAnnouncer(setMovement));
  const verdictAnnouncer = useRef(new LiveAnnouncer(setVerdictLive));

  /**
   * El paso se reinicia AJUSTANDO ESTADO EN RENDER, no desde un efecto.
   *
   * Un `useEffect` que llama a `setState` provoca un repintado en cascada: se pinta el paso nuevo con el
   * draft del anterior y se corrige un frame después. Con un ejercicio de ordenar, ese frame muestra el
   * orden del paso pasado. Comparar contra el valor previo durante el render es el patrón oficial de React
   * para "reiniciar estado cuando cambia una prop".
   */
  const [seenBound, setSeenBound] = useState(bound);
  if (seenBound !== bound) {
    setSeenBound(bound);
    setDraft(bound.ok ? bound.value.emptyAnswer() : null);
    setPhase('answering');
    setResult(null);
  }

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

  /**
   * Aleatoriedad determinista por instancia de paso.
   *
   * Llamar mil veces con la misma sal devuelve el mismo número, así que barajar en render es estable entre
   * repintados. El barajado con `Math.random` no es reproducible entre recargas, es imposible de asertar en
   * el arnés, y está prohibido por lint.
   */
  const rng = useCallback(
    (salt: string) => u01(mix32(fnv1a(instanceId), fnv1a(salt), 0)),
    [instanceId],
  );

  /**
   * Los anuncios de MOVIMIENTO se agrupan con un borde de salida de 400 ms.
   *
   * Mover una ficha ocho posiciones con la flecha genera ocho mensajes de los que solo importa el último, y
   * un anuncio tarda más de un segundo en locutarse. Los lectores no encolan de verdad: reemplazan.
   */
  const announce = useCallback((text: string) => movementLive.current.trailing(text), []);

  const canSubmit = bound.ok && draft !== null && bound.value.canSubmit(draft);

  const submit = useCallback(() => {
    if (!bound.ok || draft === null || phase !== 'answering') return;
    if (!bound.value.canSubmit(draft)) return;
    setPhase('checking');
    const graded = bound.value.grade(draft);
    if (!graded.ok) {
      setPhase('answering');
      return;
    }
    setResult(graded.value);
    setPhase(graded.value.correct ? 'correct' : 'revealed');
    // El veredicto tira la cola de movimiento: una corrección no puede llegar detrás de ocho anuncios de
    // posición que ya no le importan a nadie.
    movementLive.current.cancel();
    setMovement(EMPTY_LIVE);
    verdictAnnouncer.current.now(graded.value.correct ? 'Correcto.' : 'Respuesta incorrecta.');
    fx.play(graded.value.correct ? 'correct' : 'wrong');
    if (graded.value.correct && containerRef.current !== null) fx.burst(containerRef.current);
  }, [bound, draft, phase]);

  const retry = useCallback(() => {
    if (!bound.ok) return;
    setDraft(bound.value.emptyAnswer());
    setPhase('answering');
    setResult(null);
  }, [bound]);

  /**
   * UN solo listener de teclado para las teclas numéricas, no catorce.
   *
   * El anfitrión no conoce el significado de "3" en cada dinámica, así que no lo interpreta: busca el
   * control que ya declaró esa tecla en el DOM (`data-hotkey`) y lo activa. Cero superficie de contrato,
   * cero listeners compitiendo entre plugins, y funciona con cualquier dinámica futura que quiera atajos
   * sin tocar el motor.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Enter' && phase === 'answering') {
        event.preventDefault();
        submit();
        return;
      }
      if (!/^[1-9]$/.test(event.key) || phase !== 'answering') return;
      const node = containerRef.current?.querySelector(`[data-hotkey="${event.key}"]`);
      if (node instanceof HTMLElement) {
        event.preventDefault();
        node.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, submit]);

  if (!bound.ok) {
    return (
      <div style={{ padding: 16, border: '2px solid var(--border-danger)', borderRadius: 'var(--r-md)' }}>
        <Verdict kind="wrong">Este ejercicio no se puede mostrar</Verdict>
        <ul style={{ margin: '8px 0 0', color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
          {bound.error.map((i, n) => (
            <li key={`${i.code}-${String(n)}`}>{i.message}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: 'grid', gap: 14 }}>
      {Player === null ? (
        <div className="skeleton" style={{ height: 180 }} />
      ) : (
        // El Suspense va PEGADO al player: si envolviera el paso entero, el enunciado y el botón
        // parpadearían con cada carga de chunk.
        <Suspense fallback={<div className="skeleton" style={{ height: 180 }} />}>
        <Player
          data={data}
          draft={draft ?? bound.value.emptyAnswer()}
          onDraft={setDraft}
          onSubmit={submit}
          announce={announce}
          phase={phase}
          revealed={phase === 'revealed' ? bound.value.solution() : null}
          rng={rng}
          instanceId={instanceId}
          inputModality={modality}
          disabled={phase !== 'answering'}
        />
        </Suspense>
      )}

      {result !== null && (
        <div>
          <Verdict kind={result.correct ? 'correct' : result.score > 0 ? 'partial' : 'wrong'}>
            {result.score > 0 && result.score < 1 ? `${String(Math.round(result.score * 100))}% de acierto` : undefined}
          </Verdict>
          {explanation !== undefined && (
            <p style={{ margin: '4px 0 0', color: 'var(--fg-muted)', fontSize: 'var(--t-14)', maxWidth: 'var(--measure)' }}>
              {explanation}
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {phase === 'answering' ? (
          <Button3D variant={canSubmit ? 'success' : 'locked'} size="md" onClick={submit}>
            Comprobar
          </Button3D>
        ) : (
          <Button3D variant="primary" size="md" onClick={retry}>
            Intentar de nuevo
          </Button3D>
        )}
        {modality === 'keyboard' && phase === 'answering' && (
          <span style={{ color: 'var(--fg-muted)', fontSize: 'var(--t-12)' }}>
            Enter para comprobar · 1–9 para elegir
          </span>
        )}
      </div>

      {/*
        DOS regiones, montadas VACÍAS desde el primer paint y nunca desmontadas: una región que aparece
        junto con su primer mensaje no anuncia ese mensaje. Y dos nodos por región, que se alternan, porque
        los lectores no vuelven a locutar un texto idéntico al anterior.
      */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        <span>{movement.a}</span>
        <span>{movement.b}</span>
      </div>
      <div role="alert" className="sr-only">
        <span>{verdictLive.a}</span>
        <span>{verdictLive.b}</span>
      </div>
    </div>
  );
}
