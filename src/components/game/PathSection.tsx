'use client';

import { memo } from 'react';
import { PathNode } from './PathNode';
import type { NodeState } from '@/game/path';
import { LessonIcon } from '@/components/ui/icons';

/** Las seis paletas de sección declaradas en los tokens. El camino las rota para dar ritmo visual. */
const PALETTES = ['brand', 'mint', 'amber', 'sky', 'coral', 'grape'] as const;

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
      {/* El banner de sección: ancho completo, con el color de su paleta. Es lo que rompe el camino en
          capítulos; una píldora centrada se lee como una etiqueta más y no separa nada. */}
      <div className="path-banner-section" data-section={PALETTES[index % PALETTES.length]}>
        <div>
          <p className="path-banner-section__eyebrow">Sección {String(index + 1)}</p>
          <h2 id={`sec-${String(index)}`} className="path-banner-section__title">
            {title}
          </h2>
        </div>
        <LessonIcon size={30} strokeWidth={2.2} aria-hidden="true" style={{ opacity: 0.85 }} />
      </div>

      {units.map((unit) => (
        <div key={unit.id} style={{ display: 'grid', gap: 14 }}>
          <h3 className="path-unit">
            <span className="path-unit__line" aria-hidden="true" />
            <span>{unit.title}</span>
            <span className="path-unit__line" aria-hidden="true" />
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
