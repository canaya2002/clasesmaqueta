'use client';

import { Suspense, type ComponentType } from 'react';
import { playerRegistry } from '@/content/dynamics/ui-registry';
import type { ErasedPlayerProps, InputModality, StepUiPhase } from '@/content/engine/ui';
import type { Json } from '@/content/engine/primitives';

export interface PlayerSlotProps {
  readonly type: string;
  readonly data: Json;
  readonly draft: Json;
  readonly onDraft: (next: Json) => void;
  readonly onSubmit: () => void;
  readonly announce: (text: string) => void;
  readonly phase: StepUiPhase;
  readonly revealed: Json | null;
  readonly rng: (salt: string) => number;
  readonly instanceId: string;
  readonly inputModality: InputModality;
  readonly disabled: boolean;
}

/**
 * Monta el player de una dinámica sin conocerla.
 *
 * La indexación es PURA: el `lazy()` se creó en tiempo de módulo, así que el tipo de elemento es el mismo
 * objeto en cada repintado. Un `lazy` creado dentro de un componente cambiaría de tipo con cualquier
 * repintado de caché fría y desmontaría el ejercicio a media respuesta.
 *
 * Y el `Suspense` va pegado al player, no arriba: si envolviera el paso entero, el enunciado, los corazones
 * y el botón parpadearían con cada carga de chunk.
 */
export function PlayerSlot(props: PlayerSlotProps) {
  const table: Readonly<Record<string, ComponentType<ErasedPlayerProps> | undefined>> = playerRegistry;
  const Player = table[props.type] ?? null;

  if (Player === null) return <div className="skeleton" style={{ height: 180 }} />;

  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 180 }} />}>
      <Player
        data={props.data}
        draft={props.draft}
        onDraft={props.onDraft}
        onSubmit={props.onSubmit}
        announce={props.announce}
        phase={props.phase}
        revealed={props.revealed}
        rng={props.rng}
        instanceId={props.instanceId}
        inputModality={props.inputModality}
        disabled={props.disabled}
      />
    </Suspense>
  );
}
