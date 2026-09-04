'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { bootClient } from '@/mock/boot-client';
import { cohortFacets, list, type CohortFacet, type UserRow } from '@/mock/repo/users';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button3D } from '@/components/ui/Button3D';

const ROW_HEIGHT = 44;

/**
 * Las 1,247 personas, virtualizadas.
 *
 * Pintar 1,247 filas son ~15,000 nodos y el teclado se siente pegajoso al teclear en el buscador; con
 * virtualización se montan las ~20 visibles y la búsqueda responde en el mismo frame. El repositorio sirve
 * esta lectura en nivel `instant` justamente por eso: está dirigida por teclado y no puede pagar los
 * 80–260 ms de latencia simulada que sí pagan las pantallas.
 */
export function UsersTable() {
  const [query, setQuery] = useState('');
  const [cohort, setCohort] = useState<string | null>(null);
  const [rows, setRows] = useState<readonly UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<readonly CohortFacet[]>([]);
  const [ready, setReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bootClient();
    void cohortFacets().then((r) => {
      if (r.ok) setFacets(r.value);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    void list({ query, cohortSlug: cohort, offset: 0, limit: 1500 }).then((r) => {
      if (!alive || !r.ok) return;
      setRows(r.value.rows);
      setTotal(r.value.total);
      setReady(true);
      scrollRef.current?.scrollTo({ top: 0 });
    });
    return () => {
      alive = false;
    };
  }, [query, cohort]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const items = virtualizer.getVirtualItems();
  const facetTotal = useMemo(() => facets.reduce((n, f) => n + f.count, 0), [facets]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="users-bar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Buscar por nombre, correo, puesto u oficina"
          aria-label="Buscar personas"
          className="users-search"
        />
        <span className="users-count u-counter" role="status">
          {ready ? `${String(total)} de ${String(facetTotal)}` : '—'}
        </span>
      </div>

      <div className="users-facets">
        <button type="button" data-on={cohort === null ? 'true' : undefined} onClick={() => setCohort(null)}>
          Todas
        </button>
        {facets.map((f) => (
          <button
            key={f.slug}
            type="button"
            data-on={cohort === f.slug ? 'true' : undefined}
            onClick={() => setCohort(f.slug)}
          >
            {f.name} <span>{String(f.count)}</span>
          </button>
        ))}
      </div>

      {ready && rows.length === 0 ? (
        <EmptyState
          mood="think"
          title="Nadie coincide con esa búsqueda"
          body="La búsqueda pliega acentos y mayúsculas, así que «muno» encuentra a Muñoz. Prueba con menos letras o quita el filtro de cohorte."
          action={
            <Button3D size="md" variant="ghost" onClick={() => { setQuery(''); setCohort(null); }}>
              Limpiar filtros
            </Button3D>
          }
          compact
        />
      ) : (
        <div className="users-table">
          <div className="users-row users-row--head" role="presentation">
            <span>Persona</span>
            <span>Puesto</span>
            <span>Oficina</span>
            <span className="users-num">Racha</span>
          </div>
          <div ref={scrollRef} className="users-scroll">
            <div style={{ height: `${String(virtualizer.getTotalSize())}px`, position: 'relative' }}>
              {items.map((v) => {
                const row = rows[v.index];
                if (row === undefined) return null;
                return (
                  <div
                    key={row.id}
                    className="users-row"
                    data-inactive={row.active ? undefined : 'true'}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: `${String(ROW_HEIGHT)}px`,
                      transform: `translateY(${String(v.start)}px)`,
                    }}
                  >
                    <span>
                      <strong>{row.name}</strong>
                      <em>{row.email}</em>
                    </span>
                    <span>{row.role}</span>
                    <span>{row.office}</span>
                    <span className="users-num">{String(row.streak)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
