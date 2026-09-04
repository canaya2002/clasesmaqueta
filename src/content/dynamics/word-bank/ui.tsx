'use client';

import { useMemo } from 'react';
import { LayoutGroup, motion } from '@/design/m';
import { useIsReducedMotion } from '@/design/MotionRoot';
import { defineDynamicUi, type PlayerProps } from '@/content/engine/ui';
import { wordBank } from './meta';
import { DraftEditor } from '../_shared/DraftEditor';
import { StepDefect } from '../_shared/StepDefect';
import type { WordBankAnswer, WordBankData } from './schema';

function Player({ data, draft, onDraft, announce, phase, revealed, rng, instanceId, disabled }: PlayerProps<WordBankData, WordBankAnswer>) {
  const reduced = useIsReducedMotion();
  const all = useMemo(() => [...data.tokens, ...data.decoys], [data.tokens, data.decoys]);
  const byId = useMemo(() => new Map<string, (typeof all)[number]>(all.map((t) => [t.id, t])), [all]);

  const bank = useMemo(
    () =>
      [...all].sort((a, b) => {
        const ka = rng(`wb:bank:${a.id}`);
        const kb = rng(`wb:bank:${b.id}`);
        return ka === kb ? (a.id < b.id ? -1 : 1) : ka - kb;
      }),
    [all, rng],
  );

  const placed = new Set<string>(draft.order);
  const answered = phase !== 'answering';

  const place = (id: (typeof all)[number]['id']): void => {
    if (placed.has(id)) return;
    onDraft({ order: [...draft.order, id] });
    announce(`${byId.get(id)?.text ?? ''} colocada. ${String(draft.order.length + 1)} de ${String(data.tokens.length)}.`);
  };

  const remove = (id: (typeof all)[number]['id']): void => {
    onDraft({ order: draft.order.filter((x) => x !== id) });
    announce(`${byId.get(id)?.text ?? ''} devuelta al banco.`);
  };

  return (
    /**
     * `layoutId` es GLOBAL dentro del grupo raíz implícito. Con dos pasos montados a la vez durante una
     * transición de ruta, dos fichas con el mismo id se tratarían como el MISMO elemento compartido y
     * Framer animaría un vuelo de la ficha del paso viejo hacia la del nuevo, cruzando la pantalla. El
     * grupo por instancia lo acota; y el id se compone del id de ficha, nunca del texto, que se repite.
     */
    <LayoutGroup id={instanceId}>
      <div style={{ display: 'grid', gap: 16 }}>
        <h2 id="step-prompt" tabIndex={-1} style={{ fontSize: 'var(--t-22)', lineHeight: 'var(--lh-22)' }}>
          {data.prompt}
        </h2>

        <div
          role="group"
          aria-label={`Frase en construcción, ${String(draft.order.length)} de ${String(data.tokens.length)} fichas`}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            minHeight: 64,
            padding: 12,
            borderRadius: 'var(--r-md)',
            border: '2px dashed var(--border-strong)',
            background: 'var(--bg-canvas)',
          }}
        >
          {draft.order.length === 0 && (
            <span style={{ color: 'var(--fg-muted)', alignSelf: 'center' }}>Toca las fichas para armar la frase</span>
          )}
          {draft.order.map((id, i) => (
            <motion.button
              key={id}
              type="button"
              className="chip"
              data-placed="true"
              {...(reduced ? {} : { layoutId: `${instanceId}:tok:${id}` })}
              disabled={disabled}
              aria-label={`${byId.get(id)?.text ?? ''}, posición ${String(i + 1)}. Activa para devolverla al banco.`}
              onClick={() => remove(id)}
            >
              {byId.get(id)?.text}
            </motion.button>
          ))}
        </div>

        <div role="group" aria-label="Banco de fichas" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {bank.map((t, i) =>
            placed.has(t.id) ? null : (
              <motion.button
                key={t.id}
                type="button"
                className="chip"
                {...(i < 9 ? { 'data-hotkey': String(i + 1) } : {})}
                {...(reduced ? {} : { layoutId: `${instanceId}:tok:${t.id}` })}
                disabled={disabled}
                onClick={() => place(t.id)}
              >
                {t.text}
              </motion.button>
            ),
          )}
        </div>

        {answered && revealed !== null && (
          <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
            Respuesta: {revealed.order.map((id) => byId.get(id)?.text ?? '').join(' ')}
          </p>
        )}
      </div>
    </LayoutGroup>
  );
}

export const ui = defineDynamicUi(wordBank, {
  Player,
  Editor: DraftEditor,
  renderDefect: (issues) => <StepDefect issues={issues} />,
});
