'use client';

import { useMemo } from 'react';
import { defineDynamicUi, type PlayerProps } from '@/content/engine/ui';
import { multipleChoice } from './meta';
import { DraftEditor } from '../_shared/DraftEditor';
import { OptionRow } from '../_shared/OptionRow';
import { StepDefect } from '../_shared/StepDefect';
import { type MultipleChoiceAnswer, type MultipleChoiceData } from './schema';

function Player({ data, draft, onDraft, phase, revealed, rng, disabled, inputModality }: PlayerProps<MultipleChoiceData, MultipleChoiceAnswer>) {
  /**
   * Barajado determinista: se calcula una clave de orden por id y se ordena por ella, con desempate por id.
   * Un Fisher-Yates sobre un flujo compartido cambiaría el orden en cada repintado.
   */
  const options = useMemo(() => {
    if (!data.shuffle) return [...data.options];
    return [...data.options].sort((a, b) => {
      const ka = rng(`mc:order:${a.id}`);
      const kb = rng(`mc:order:${b.id}`);
      return ka === kb ? (a.id < b.id ? -1 : 1) : ka - kb;
    });
  }, [data.options, data.shuffle, rng]);

  const answered = phase !== 'answering';
  const solution = revealed?.optionId ?? null;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 id="step-prompt" tabIndex={-1} style={{ fontSize: 'var(--t-22)', lineHeight: 'var(--lh-22)' }}>
        {data.prompt}
      </h2>
      <div role="group" aria-labelledby="step-prompt" style={{ display: 'grid', gap: 8 }}>
        {options.map((o, i) => (
          <span key={o.id} {...(inputModality === 'keyboard' && !answered ? { 'data-hotkey': String(i + 1) } : {})}>
            <OptionRow
              label={o.text}
              selected={draft.optionId === o.id}
              verdict={
                !answered
                  ? null
                  : o.id === solution
                    ? 'correct'
                    : draft.optionId === o.id
                      ? 'wrong'
                      : null
              }
              disabled={disabled}
              hotkey={inputModality === 'keyboard' ? String(i + 1) : null}
              multiple={false}
              onPick={() => onDraft({ optionId: o.id })}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

export const ui = defineDynamicUi(multipleChoice, {
  Player,
  Editor: DraftEditor,
  renderDefect: (issues) => <StepDefect issues={issues} />,
});
