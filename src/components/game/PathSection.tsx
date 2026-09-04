'use client';

import { memo } from 'react';
import { PathNode } from './PathNode';
import type { NodeState } from '@/game/path';

export interface PathLesson {
  readonly id: string;
  readonly title: string;
  readonly kind: string;
}

export interface PathUnit {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly lessons: readonly PathLesson[];
}

export interface PathSectionProps {
  readonly title: string;
  readonly units: readonly PathUnit[];
  readonly states: ReadonlyMap<string, NodeState>;
  readonly index: number;
}

/**
 * Una sección del camino. `memo` con comparación por identidad del mapa de estados.
 *
 * El criterio de aislamiento se apoya en esto: el mapa que devuelve el fold tiene identidad estable
 * mientras el ledger no cambie, así que perder un corazón —que no toca el ledger— no crea un mapa nuevo y
 * `memo` corta el repintado aquí. Si `PathScreen` construyera el mapa en cada render, `memo` no serviría
 * de nada y las 26 unidades repintarían con cada latido del contador de corazones.
 */
export const PathSection = memo(function PathSection({ title, units, states, index }: PathSectionProps) {
  return (
    <section aria-labelledby={`sec-${String(index)}`} style={{ display: 'grid', gap: 20, paddingBlock: 28 }}>
      <h2
        id={`sec-${String(index)}`}
        data-section={index % 2 === 0 ? 'brand' : 'lime'}
        style={{
          justifySelf: 'center',
          margin: 0,
          padding: '8px 20px',
          borderRadius: 'var(--r-full)',
          background: 'var(--section-fill)',
          color: 'var(--section-on-fill)',
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--t-16)',
        }}
      >
        {title}
      </h2>

      {units.map((unit) => (
        <div key={unit.id} style={{ display: 'grid', gap: 14 }}>
          <h3
            style={{
              justifySelf: 'center',
              margin: 0,
              color: 'var(--fg-muted)',
              fontSize: 'var(--t-14)',
              fontWeight: 700,
              textAlign: 'center',
              maxWidth: 'var(--measure)',
            }}
          >
            {unit.title}
          </h3>
          {unit.lessons.map((lesson, i) => (
            <PathNode
              key={lesson.id}
              lessonId={lesson.id}
              title={lesson.title}
              kind={lesson.kind}
              state={states.get(lesson.id) ?? 'locked'}
              // El serpenteo: seno discreto sobre el índice. Un camino recto se lee como una lista.
              offset={[0, 46, 66, 46, 0, -46, -66, -46][i % 8] ?? 0}
            />
          ))}
        </div>
      ))}
    </section>
  );
});
