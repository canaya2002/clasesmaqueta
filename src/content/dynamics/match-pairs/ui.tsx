'use client';

import { useMemo, useState } from 'react';
import { motion } from '@/design/m';
import { useVariant } from '@/design/MotionRoot';
import { defineDynamicUi, type PlayerProps } from '@/content/engine/ui';
import { matchPairs } from './meta';
import { DraftEditor } from '../_shared/DraftEditor';
import { StepDefect } from '../_shared/StepDefect';
import type { MatchPairsAnswer, MatchPairsData } from './schema';
import type { LocalId } from '../_shared/ids';

function Player({ data, draft, onDraft, announce, disabled }: PlayerProps<MatchPairsData, MatchPairsAnswer>) {
  const solved = useVariant('pairSolved');
  const [picked, setPicked] = useState<{ side: 'left' | 'right'; id: LocalId } | null>(null);
  const [flash, setFlash] = useState<LocalId | null>(null);

  const rights = useMemo(
    () => [
      ...data.pairs.map((p) => ({ id: p.id, text: p.right })),
      ...data.extraRights.map((r) => ({ id: r.id, text: r.text })),
    ],
    [data.pairs, data.extraRights],
  );

  const matchedLeft = new Set(draft.matched.map((m) => m.leftId));
  const matchedRight = new Set(draft.matched.map((m) => m.rightId));

  const resolve = (side: 'left' | 'right', id: LocalId): void => {
    if (disabled) return;
    if (picked === null) {
      setPicked({ side, id });
      announce('Seleccionado. Elige su pareja en la otra columna.');
      return;
    }
    // Tocar en la MISMA columna mueve la selección: nunca es un error, porque cambiar de idea antes de
    // emparejar no es equivocarse.
    if (picked.side === side) {
      setPicked({ side, id });
      return;
    }
    const leftId = side === 'left' ? id : picked.id;
    const rightId = side === 'left' ? picked.id : id;

    if (leftId === rightId) {
      onDraft({ matched: [...draft.matched, { leftId, rightId }], mistakes: draft.mistakes });
      announce('Pareja correcta.');
    } else {
      onDraft({ matched: draft.matched, mistakes: draft.mistakes + 1 });
      setFlash(id);
      window.setTimeout(() => setFlash(null), 220);
      announce('Esa no es la pareja.');
    }
    setPicked(null);
  };

  const column = (side: 'left' | 'right', items: readonly { id: LocalId; text: string }[]) => (
    <ul
      aria-label={side === 'left' ? 'Situaciones' : 'Acciones'}
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, flex: 1 }}
    >
      {items.map((item) => {
        const isMatched = side === 'left' ? matchedLeft.has(item.id) : matchedRight.has(item.id);
        return (
          <li key={item.id}>
            <motion.button
              type="button"
              className="opt"
              variants={solved}
              initial="rest"
              animate={isMatched ? 'solved' : 'rest'}
              // `aria-disabled` y NO `disabled`: un elemento deshabilitado deja de ser navegable, así que
              // el usuario de lector de pantalla pierde el rastro de lo que ya emparejó.
              aria-disabled={isMatched || disabled}
              aria-pressed={picked?.id === item.id && picked.side === side}
              data-selected={picked?.id === item.id && picked.side === side ? 'true' : 'false'}
              {...(flash === item.id ? { 'data-verdict': 'wrong' as const } : {})}
              onClick={() => {
                if (isMatched || disabled) return;
                resolve(side, item.id);
              }}
            >
              {item.text}
            </motion.button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <h2 id="step-prompt" tabIndex={-1} style={{ fontSize: 'var(--t-22)', lineHeight: 'var(--lh-22)' }}>
        {data.prompt}
      </h2>
      <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 'var(--t-14)' }}>
        {String(draft.matched.length)} de {String(data.pairs.length)} emparejadas
        {draft.mistakes > 0 ? ` · ${String(draft.mistakes)} error(es)` : ''}
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {column('left', data.pairs.map((p) => ({ id: p.id, text: p.left })))}
        {column('right', rights)}
      </div>
    </div>
  );
}

export const ui = defineDynamicUi(matchPairs, {
  Player,
  Editor: DraftEditor,
  renderDefect: (issues) => <StepDefect issues={issues} />,
});
