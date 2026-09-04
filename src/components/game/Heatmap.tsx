'use client';

import { useEconomy } from '@/lib/hooks/useEconomy';
import { useFold } from '@/lib/hooks/useGameState';
import { HISTORY_DAYS } from '@/lib/clock';
import { dayKeyFromEpochDay } from '@/game/day';

/**
 * Los 120 días. Cuatro intensidades, y el título de cada celda dice la fecha y el XP.
 *
 * Se dibuja desde `xpByDayKey`, el mismo mapa del que sale todo lo demás, así que no puede contradecir a
 * la racha del HUD. Un heatmap con su propia fuente de días es el clásico "el calendario dice que practiqué
 * el martes y la racha dice que no".
 */
const COLUMNS = Math.ceil(HISTORY_DAYS / 7);

function level(xp: number): 0 | 1 | 2 | 3 | 4 {
  if (xp <= 0) return 0;
  if (xp < 30) return 1;
  if (xp < 70) return 2;
  if (xp < 120) return 3;
  return 4;
}

export function Heatmap() {
  const econ = useEconomy();
  const fold = useFold(econ);
  if (fold === null) return <div className="skeleton" style={{ height: 120 }} />;

  const cells: { key: string; xp: number }[] = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i -= 1) {
    // La clave se reconstruye del ordinal absoluto con aritmética civil: ni se lee el reloj en el render
    // —el fold ya trajo el "hoy" con el que se plegó— ni se crean 120 objetos `Date` por repintado.
    const key = dayKeyFromEpochDay(fold.todayEpochDay - i);
    cells.push({ key, xp: fold.xpByDayKey.get(key) ?? 0 });
  }

  return (
    <div>
      <div className="heatmap" style={{ gridTemplateColumns: `repeat(${String(COLUMNS)}, 1fr)` }}>
        {cells.map((c) => (
          <span key={c.key} className="heatmap__cell" data-level={level(c.xp)} title={`${c.key}: ${String(c.xp)} XP`} />
        ))}
      </div>
      <p className="sr-only">
        Actividad de los últimos {String(HISTORY_DAYS)} días: {String(cells.filter((c) => c.xp > 0).length)} días
        con práctica.
      </p>
    </div>
  );
}
