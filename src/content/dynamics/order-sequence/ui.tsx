'use client';

import { useCallback, useMemo } from 'react';
import { motion } from '@/design/m';
import { useVariant } from '@/design/MotionRoot';
import { useGrabList } from '@/lib/hooks/useGrabList';
import { defineDynamicUi, type PlayerProps } from '@/content/engine/ui';
import { orderSequence } from './meta';
import { DraftEditor } from '../_shared/DraftEditor';
import { StepDefect } from '../_shared/StepDefect';
import type { OrderSequenceAnswer, OrderSequenceData } from './schema';

function Player({ data, draft, onDraft, announce, phase, revealed, instanceId, disabled }: PlayerProps<OrderSequenceData, OrderSequenceAnswer>) {
  const grab = useVariant('itemGrab');
  const byId = useMemo(() => new Map(data.items.map((i) => [i.id, i.text])), [data.items]);
  const order = draft.order.length === data.items.length ? draft.order : data.items.map((i) => i.id);
  const answered = phase !== 'answering';

  const move = useCallback(
    (from: number, to: number) => {
      const next = [...order];
      const moved = next.splice(from, 1)[0];
      if (moved === undefined) return;
      next.splice(to, 0, moved);
      onDraft({ order: next });
    },
    [onDraft, order],
  );

  const list = useGrabList({
    length: order.length,
    onMove: move,
    announce,
    labelAt: (i) => {
      const id = order[i];
      return id === undefined ? '' : (byId.get(id) ?? '');
    },
    optionId: (i) => `${instanceId}-opt-${String(i)}`,
    disabled,
  });

  const solution = revealed?.order ?? null;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <h2 id={`${instanceId}-prompt`} tabIndex={-1} style={{ fontSize: 'var(--t-22)', lineHeight: 'var(--lh-22)' }}>
        {data.prompt}
      </h2>

      {/*
        Patrón de LISTBOX, no una pila de botones.
        La lista entera es UN tabstop y el elemento activo se marca con `aria-activedescendant`, que es lo
        que hace que los lectores de pantalla entren en modo foco y las flechas lleguen al componente. Con
        cada ficha como botón enfocable harían falta ocho Tab solo para cruzar el ejercicio.
      */}
      <ul
        role="listbox"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={`${instanceId}-prompt`}
        aria-activedescendant={list.activeDescendant}
        aria-roledescription="lista ordenable"
        onKeyDown={list.onKeyDown}
        style={{ listStyle: 'none', margin: 0, padding: 4, display: 'grid', gap: 8, borderRadius: 'var(--r-md)' }}
      >
        {order.map((id, i) => {
          const active = i === list.activeIndex;
          const held = active && list.grabbed;
          const rightPlace = solution !== null && solution[i] === id;
          return (
            <motion.li
              key={id}
              id={`${instanceId}-opt-${String(i)}`}
              role="option"
              aria-selected={active}
              aria-posinset={i + 1}
              aria-setsize={order.length}
              className="opt"
              variants={grab}
              initial="rest"
              animate={held ? 'grabbed' : 'rest'}
              data-selected={active ? 'true' : 'false'}
              {...(answered ? { 'data-verdict': rightPlace ? ('correct' as const) : ('wrong' as const) } : {})}
              onClick={() => {
                list.setActiveIndex(i);
                if (!disabled) list.toggleGrab();
              }}
              style={{ cursor: disabled ? 'default' : 'pointer' }}
            >
              <span className="opt__key" aria-hidden="true">
                {i + 1}
              </span>
              <span style={{ flex: 1 }}>{byId.get(id)}</span>
              {held && (
                <span style={{ color: 'var(--fg-primary)', fontSize: 'var(--t-12)' }} aria-hidden="true">
                  tomada
                </span>
              )}
            </motion.li>
          );
        })}
      </ul>

      {/*
        La barra es la RUTA GARANTIZADA, no un extra. En modo navegación de NVDA o JAWS el cursor virtual se
        come las flechas, pero Enter y Espacio sí llegan al elemento con foco en los tres lectores
        principales. Y va fuera de la lista porque un <button> dentro de un <li role="option"> rompe la
        semántica del listbox.
      */}
      <div role="toolbar" aria-label="Mover el elemento activo" style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="chip" disabled={disabled} onClick={() => list.moveActive(-1)}>
          ↑ Subir
        </button>
        <button type="button" className="chip" disabled={disabled} onClick={() => list.moveActive(1)}>
          ↓ Bajar
        </button>
        <span style={{ alignSelf: 'center', color: 'var(--fg-muted)', fontSize: 'var(--t-12)' }}>
          {list.grabbed ? 'Tomada · Esc cancela' : 'Espacio para tomar'}
        </span>
      </div>
    </div>
  );
}

export const ui = defineDynamicUi(orderSequence, {
  Player,
  Editor: DraftEditor,
  renderDefect: (issues) => <StepDefect issues={issues} />,
});
