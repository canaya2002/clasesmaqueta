'use client';

import { useMemo, useRef } from 'react';
import { defineDynamicUi, type PlayerProps } from '@/content/engine/ui';
import { fillBlank } from './meta';
import { DraftEditor } from '../_shared/DraftEditor';
import { StepDefect } from '../_shared/StepDefect';
import { splitTemplate, type FillBlankAnswer, type FillBlankData } from './schema';

function Player({ data, draft, onDraft, onSubmit, announce, phase, revealed, rng, disabled }: PlayerProps<FillBlankData, FillBlankAnswer>) {
  const segments = useMemo(() => splitTemplate(data.template), [data.template]);
  // La clave es `string`: las marcas salen de la plantilla, que es texto plano, no ids marcados.
  const indexOf = useMemo(() => new Map<string, number>(data.blanks.map((b, i) => [b.id, i])), [data.blanks]);
  const inputs = useRef(new Map<number, HTMLInputElement>());
  const answered = phase !== 'answering';

  const bank = useMemo(() => {
    if (data.mode !== 'bank') return [];
    const words = [...data.blanks.map((b) => b.accepted[0] ?? ''), ...data.decoys];
    return words
      .map((w, i) => ({ w, k: rng(`fb:bank:${String(i)}`) }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.w);
  }, [data.blanks, data.decoys, data.mode, rng]);

  const setValue = (index: number, value: string): void => {
    const next = data.blanks.map((_, i) => (i === index ? value : (draft.values[i] ?? '')));
    onDraft({ values: next });
  };

  const firstEmpty = (): number => data.blanks.findIndex((_, i) => (draft.values[i] ?? '').trim().length === 0);

  const place = (word: string): void => {
    const target = firstEmpty();
    if (target < 0) return;
    setValue(target, word);
    announce(`${word} colocada en el hueco ${String(target + 1)}.`);
    // Tras colocar, el foco va al siguiente hueco vacío: si no, cae a body y el usuario de teclado se pierde.
    const next = data.blanks.findIndex((_, i) => i !== target && (draft.values[i] ?? '').trim().length === 0);
    if (next >= 0) inputs.current.get(next)?.focus();
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p id="step-prompt" style={{ fontSize: 'var(--t-18)', lineHeight: 2.2, margin: 0, maxWidth: 'var(--measure)' }}>
        {segments.map((seg, i) => {
          if (seg.kind === 'text') return <span key={`t${String(i)}`}>{seg.value}</span>;
          const index = indexOf.get(seg.value) ?? 0;
          const value = draft.values[index] ?? '';
          const ok = revealed !== null ? value.trim().toLowerCase() === (revealed.values[index] ?? '').toLowerCase() : null;
          return (
            <input
              key={seg.value}
              ref={(node) => {
                if (node === null) inputs.current.delete(index);
                else inputs.current.set(index, node);
              }}
              className="blank"
              value={value}
              readOnly={data.mode === 'bank'}
              disabled={disabled}
              aria-label={`Hueco ${String(index + 1)} de ${String(data.blanks.length)}`}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              {...(answered && ok !== null ? { 'data-verdict': ok ? 'correct' : 'wrong' } : {})}
              onChange={(e) => setValue(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              style={{ width: `${String(Math.max(8, Math.min(24, (revealed?.values[index] ?? 'xxxxxxxx').length + 2)))}ch` }}
            />
          );
        })}
      </p>

      {data.mode === 'bank' && (
        <div role="group" aria-label="Banco de palabras" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {bank.map((w, i) => (
            <button
              key={`${w}-${String(i)}`}
              type="button"
              className="chip"
              {...(i < 9 ? { 'data-hotkey': String(i + 1) } : {})}
              disabled={disabled}
              data-placed={draft.values.includes(w) ? 'true' : 'false'}
              onClick={() => place(w)}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {answered && revealed !== null && (
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
          Respuesta: {revealed.values.join(' · ')}
        </p>
      )}
    </div>
  );
}

export const ui = defineDynamicUi(fillBlank, {
  Player,
  Editor: DraftEditor,
  renderDefect: (issues) => <StepDefect issues={issues} />,
});
