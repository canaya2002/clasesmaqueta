'use client';

import { useEffect, useState } from 'react';
import { bootClient } from '@/mock/boot-client';
import { kpis, dailyActive, type Kpis } from '@/mock/repo/analytics';
import { HISTORY_DAYS } from '@/lib/clock';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * El panel. Todo sale del MISMO índice de bits que alimenta el heatmap del alumno.
 *
 * Es la propiedad que hace creíble la demo: si el panel dijera 412 activos hoy y el perfil de una persona
 * enseñara un día en blanco, la maqueta se cae sola en cuanto alguien cruza las dos pantallas. Aquí no
 * pueden discrepar porque no hay dos fuentes.
 */
export function Dashboard() {
  const [data, setData] = useState<{ readonly k: Kpis; readonly dau: readonly number[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    bootClient();
    let alive = true;
    void Promise.all([kpis(), dailyActive()]).then(([a, b]) => {
      if (!alive) return;
      if (a.ok && b.ok) setData({ k: a.value, dau: b.value });
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <EmptyState
        mood="think"
        title="No se pudo leer la analítica"
        body="La capa de datos devolvió un error. Recarga la página; si sigue, el mundo de la demo se puede reconstruir desde Ajustes."
        action={null}
      />
    );
  }

  if (data === null) {
    return (
      <div className="kpi-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton" style={{ height: 92, borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  const pct = (n: number): string => `${((n / data.k.enrolled) * 100).toFixed(1)}%`;
  const cells: readonly { readonly label: string; readonly value: string; readonly foot: string }[] = [
    { label: 'Activos hoy', value: String(data.k.dau), foot: `${pct(data.k.dau)} de la plantilla` },
    { label: 'Activos esta semana', value: String(data.k.wau), foot: pct(data.k.wau) },
    { label: 'Activos este mes', value: String(data.k.mau), foot: pct(data.k.mau) },
    { label: 'Inscritos', value: String(data.k.enrolled), foot: '9 cohortes, 3 oficinas' },
    { label: 'Racha de 7+', value: String(data.k.withStreak7), foot: pct(data.k.withStreak7) },
    { label: 'Racha de 30+', value: String(data.k.withStreak30), foot: pct(data.k.withStreak30) },
  ];

  const max = Math.max(...data.dau, 1);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div className="kpi-grid">
        {cells.map((c) => (
          <div key={c.label} className="kpi">
            <p className="kpi__label">{c.label}</p>
            <p className="kpi__value u-counter">{c.value}</p>
            <p className="kpi__foot">{c.foot}</p>
          </div>
        ))}
      </div>

      <section className="card" style={{ display: 'grid', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--t-16)' }}>Actividad diaria</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--fg-muted)', fontSize: 'var(--t-12)' }}>
            Últimos {String(HISTORY_DAYS)} días. El valle del fin de semana es real: sale del mismo modelo
            que las rachas.
          </p>
        </div>
        {/* Barras en CSS puro: 120 divs pesan menos que traer una librería de gráficas para un sparkline. */}
        <div className="spark" role="img" aria-label={`Actividad diaria de los últimos ${String(HISTORY_DAYS)} días, máximo ${String(max)} personas`}>
          {data.dau.map((n, i) => (
            <span key={i} style={{ height: `${String(Math.max(2, (n / max) * 100))}%` }} />
          ))}
        </div>
      </section>
    </div>
  );
}
