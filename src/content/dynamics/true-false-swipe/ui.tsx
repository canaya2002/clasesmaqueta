'use client';

import { useCallback, useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from '@/design/m';
import { useIsReducedMotion, useSpringT, useVariant } from '@/design/MotionRoot';
import { defineDynamicUi, type PlayerProps } from '@/content/engine/ui';
import { DraftEditor } from '../_shared/DraftEditor';
import { StepDefect } from '../_shared/StepDefect';
import { trueFalseSwipe } from './meta';
import { type TrueFalseAnswer, type TrueFalseData } from './schema';

const THRESHOLD = 96;
const FLICK_VELOCITY = 480;

function Player({ data, draft, onDraft, onSubmit, announce, phase, disabled }: PlayerProps<TrueFalseData, TrueFalseAnswer>) {
  const reduced = useIsReducedMotion();
  const snap = useSpringT('snap');
  const stamp = useVariant('stampIn');
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-9, 9]);
  const trueOpacity = useTransform(x, [24, THRESHOLD], [0, 1]);
  const falseOpacity = useTransform(x, [-THRESHOLD, -24], [1, 0]);

  useEffect(() => {
    if (phase === 'answering') void animate(x, 0, snap);
  }, [phase, x, snap]);

  const choose = useCallback(
    (value: boolean, viaGesture: boolean) => {
      if (disabled) return;
      onDraft({ value });
      announce(value ? data.trueLabel : data.falseLabel);
      // El gesto ya carga la intención: es la ÚNICA excepción a "seleccionar y confirmar son dos actos".
      if (viaGesture) onSubmit();
    },
    [announce, data.falseLabel, data.trueLabel, disabled, onDraft, onSubmit],
  );

  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <motion.div
        drag={reduced || disabled ? false : 'x'}
        dragElastic={0.22}
        dragConstraints={{ left: -220, right: 220 }}
        dragMomentum={false}
        style={{ x, rotate, touchAction: 'pan-y' }}
        onDragEnd={(_, info) => {
          const far = Math.abs(info.offset.x) > THRESHOLD;
          // Umbral DOBLE: distancia o velocidad con el mismo signo. Sin la velocidad, un flick corto de
          // 40 px —que es lo que hace la gente con prisa— no cuenta y el gesto se siente roto.
          const flicked =
            Math.abs(info.velocity.x) > FLICK_VELOCITY && Math.sign(info.velocity.x) === Math.sign(info.offset.x);
          if (far || flicked) choose(info.offset.x > 0, true);
          else void animate(x, 0, snap);
        }}
        // El nodo NO es el control accesible: los dos botones de abajo lo son. Arrastrar es una afordancia,
        // no el único camino.
        aria-hidden="true"
        style-role="presentation"
        className="opt"
      >
        <div style={{ position: 'relative', padding: 24, minHeight: 150, display: 'grid', placeItems: 'center', maxWidth: 420 }}>
          <p style={{ margin: 0, fontSize: 'var(--t-18)', lineHeight: 'var(--lh-18)', textAlign: 'center' }}>
            {data.statement}
          </p>
          <motion.span
            variants={stamp}
            style={{ opacity: trueOpacity, position: 'absolute', top: 12, right: 12, color: 'var(--fg-success)', fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            {data.trueLabel}
          </motion.span>
          <motion.span
            variants={stamp}
            style={{ opacity: falseOpacity, position: 'absolute', top: 12, left: 12, color: 'var(--fg-danger)', fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            {data.falseLabel}
          </motion.span>
        </div>
      </motion.div>

      <p id="tf-statement" className="sr-only">
        {data.statement}
      </p>

      {/* Siempre presentes, siempre de 44px: quien usa un puntero grueso, un lector de pantalla o un
          dispositivo sin arrastre fino resuelve el ejercicio por aquí, no por una ruta secundaria. */}
      <div role="group" aria-labelledby="tf-statement" style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          className="opt"
          data-hotkey="2"
          style={{ width: 150, justifyContent: 'center' }}
          aria-pressed={draft.value === false}
          data-selected={draft.value === false ? 'true' : 'false'}
          disabled={disabled}
          onClick={() => choose(false, false)}
        >
          {data.falseLabel}
        </button>
        <button
          type="button"
          className="opt"
          data-hotkey="1"
          style={{ width: 150, justifyContent: 'center' }}
          aria-pressed={draft.value === true}
          data-selected={draft.value === true ? 'true' : 'false'}
          disabled={disabled}
          onClick={() => choose(true, false)}
        >
          {data.trueLabel}
        </button>
      </div>
    </div>
  );
}

export const ui = defineDynamicUi(trueFalseSwipe, {
  Player,
  Editor: DraftEditor,
  renderDefect: (issues) => <StepDefect issues={issues} />,
});
