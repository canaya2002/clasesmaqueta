'use client';

import { useMemo } from 'react';
import { defineDynamicUi, type PlayerProps } from '@/content/engine/ui';
import { DraftEditor } from '../_shared/DraftEditor';
import { OptionRow } from '../_shared/OptionRow';
import { StepDefect } from '../_shared/StepDefect';
import { multipleSelect } from './meta';
import { multipleSelectAnswer, type MultipleSelectAnswer, type MultipleSelectData } from './schema';

function Player({ data, draft, onDraft, phase, revealed, rng, disabled, inputModality }: PlayerProps<MultipleSelectData, MultipleSelectAnswer>) {
  const options = useMemo(
    () =>
      [...data.options].sort((a, b) => {
        const ka = rng(`ms:order:${a.id}`);
        const kb = rng(`ms:order:${b.id}`);
        return ka === kb ? (a.id < b.id ? -1 : 1) : ka - kb;
      }),
    [data.options, rng],
  );

  const chosen = new Set<string>(draft.optionIds);
  const answered = phase !== 'answering';
  const solution = new Set<string>(revealed?.optionIds ?? []);

  const toggle = (id: string): void => {
    const next = chosen.has(id) ? draft.optionIds.filter((x) => x !== id) : [...draft.optionIds, id];
    onDraft(multipleSelectAnswer.parse({ optionIds: next }));
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 id="step-prompt" tabIndex={-1} style={{ fontSize: 'var(--t-22)', lineHeight: 'var(--lh-22)' }}>
        {data.prompt}
      </h2>
      <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
        {data.revealCount
          ? `Elige ${String(data.correctOptionIds.length)}.`
          : 'Puede haber más de una respuesta correcta.'}
      </p>
      <div role="group" aria-labelledby="step-prompt" style={{ display: 'grid', gap: 8 }}>
        {options.map((o, i) => (
          <span key={o.id} {...(inputModality === 'keyboard' && !answered ? { 'data-hotkey': String(i + 1) } : {})}>
            <OptionRow
              label={o.text}
              selected={chosen.has(o.id)}
              verdict={
                !answered ? null : solution.has(o.id) ? 'correct' : chosen.has(o.id) ? 'wrong' : null
              }
              disabled={disabled}
              hotkey={inputModality === 'keyboard' ? String(i + 1) : null}
              multiple
              onPick={() => toggle(o.id)}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

export const ui = defineDynamicUi(multipleSelect, {
  Player,
  Editor: DraftEditor,
  renderDefect: (issues) => <StepDefect issues={issues} />,
});
