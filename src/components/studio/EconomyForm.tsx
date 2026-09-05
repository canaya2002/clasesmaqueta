'use client';

import { useState } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { useEconomy } from '@/lib/hooks/useEconomy';
import { resetEconomy, updateEconomy } from '@/mock/economy-store';
import type { EconomyConfig } from '@/content/engine/economy';

/**
 * El panel de gamificación. Es la pantalla que demuestra el criterio de aceptación entero.
 *
 * Mover `xpBase` aquí cambia el XP del HUD **sin recargar**, y no porque haya un `postMessage`: el
 * contenido guarda `xpWeight` y no XP, así que el total se DERIVA del ledger con la economía vigente. El
 * número no se guarda en ningún sitio; se calcula cada vez.
 *
 * Los campos se dividen en dos grupos porque su efecto es distinto y esconderlo sería mentir: los
 * RETROACTIVOS reescriben la historia entera al instante; los PROSPECTIVOS solo afectan a lo que pase a
 * partir de ahora, porque su valor viajó congelado en cada evento del pasado.
 */
interface Knob {
  readonly key: keyof EconomyConfig;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly help: string;
}

const RETROACTIVE: readonly Knob[] = [
  { key: 'xpBase', label: 'XP base por paso', min: 1, max: 50, help: 'Multiplica el XP de TODA la historia al instante.' },
  { key: 'bonusPerfectXp', label: 'Bono por lección perfecta', min: 0, max: 200, help: 'Se recalcula sobre las perfectas ya hechas.' },
  { key: 'bonusFirstClearXp', label: 'Bono por primera vez', min: 0, max: 200, help: 'Se recalcula sobre las primeras veces ya hechas.' },
  { key: 'levelBase', label: 'XP del nivel 1 al 2', min: 10, max: 500, help: 'Mueve la curva entera: el nivel puede subir o bajar.' },
];

const PROSPECTIVE: readonly Knob[] = [
  { key: 'maxHearts', label: 'Corazones máximos', min: 0, max: 10, help: '0 apaga los corazones en todo el producto.' },
  { key: 'heartRefillMinutes', label: 'Minutos por corazón', min: 1, max: 240, help: 'Afecta a la recarga en curso.' },
  { key: 'gemsPerfectLesson', label: 'Gemas por lección perfecta', min: 0, max: 100, help: 'Las ya otorgadas NO se re-tarifan.' },
  { key: 'priceHeartRefill', label: 'Precio de recargar', min: 0, max: 1000, help: 'Las compras hechas conservan su precio.' },
];

/**
 * El campo guarda su propio TEXTO mientras se escribe, y solo confirma al salir o con Enter.
 *
 * Confirmar en cada pulsación parecía más reactivo y hacía el campo inutilizable: para cambiar "XP del
 * nivel 1 al 2" de 60 a 80 hay que teclear un 8, y 8 está por debajo del mínimo de 10, así que el valor se
 * rechazaba, el campo volvía de golpe a 60 y el segundo dígito nunca llegaba. Con un mínimo de dos cifras,
 * NINGÚN valor nuevo se podía teclear.
 *
 * Vaciar el campo tampoco confirma: un campo vacío es alguien a mitad de escribir, no un cero.
 */
function Field({ knob, value }: { readonly knob: Knob; readonly value: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = (raw: string): void => {
    setDraft(null);
    if (raw.trim() === '') {
      setError(null);
      return;
    }
    const next = Number(raw);
    if (!Number.isFinite(next)) {
      setError('Eso no es un número');
      return;
    }
    const r = updateEconomy({ [knob.key]: next });
    setError(r.ok ? null : r.reason);
  };

  return (
    <label className="econ-field">
      <span className="econ-field__label">{knob.label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={knob.min}
        max={knob.max}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(e.currentTarget.value);
          }
        }}
      />
      <span className="econ-field__help">
        {error ?? (draft !== null ? `Pulsa Enter o sal del campo para aplicar · ${String(knob.min)}–${String(knob.max)}` : knob.help)}
      </span>
    </label>
  );
}

export function EconomyForm() {
  const econ = useEconomy();

  const group = (title: string, body: string, knobs: readonly Knob[]) => (
    <section className="card" style={{ display: 'grid', gap: 12 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 'var(--t-16)' }}>{title}</h2>
        <p style={{ margin: '2px 0 0', color: 'var(--fg-muted)', fontSize: 'var(--t-12)' }}>{body}</p>
      </div>
      <div className="econ-grid">
        {knobs.map((k) => {
          const raw = econ[k.key];
          return <Field key={String(k.key)} knob={k} value={typeof raw === 'number' ? raw : 0} />;
        })}
      </div>
    </section>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {group(
        'Retroactivos',
        'Reescriben los números históricos al instante, porque el XP se deriva del ledger con la economía vigente.',
        RETROACTIVE,
      )}
      {group(
        'Prospectivos',
        'Solo afectan a lo que pase a partir de ahora: su valor viajó congelado en cada evento del pasado.',
        PROSPECTIVE,
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button3D size="md" variant="ghost" onClick={() => resetEconomy()}>
          Restaurar valores por defecto
        </Button3D>
        <span style={{ color: 'var(--fg-muted)', fontSize: 'var(--t-12)' }}>
          Versión {String(econ.version)} · abre <strong>/aprende</strong> en otra pestaña y verás el HUD
          moverse sin recargar.
        </span>
      </div>
    </div>
  );
}
