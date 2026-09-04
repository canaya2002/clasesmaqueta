'use client';

import { memo } from 'react';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { useHearts } from '@/lib/hooks/useGameState';
import { HeartBar } from './HeartBar';

/**
 * Los corazones del HUD, suscritos a su propia fuente.
 *
 * `HeartBar` recibe el conteo como prop a propósito: dentro de una lección el conteo que manda es el de la
 * SESIÓN, no el del almacenamiento —la máquina puede tener corazones congelados por la política de la
 * lección— y un componente que se suscribiera siempre se pelearía con ella. Aquí, fuera de la lección, la
 * fuente sí es el almacenamiento, y la suscripción vive en esta envoltura.
 */
export const HeartsChip = memo(function HeartsChip() {
  const hearts = useHearts(DEFAULT_ECONOMY);
  if (hearts === null || !hearts.enabled) return null;
  return (
    <HeartBar econ={DEFAULT_ECONOMY} current={hearts.current} infinite={hearts.unlimited} badge={false} />
  );
});
