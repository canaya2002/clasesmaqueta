'use client';

import type { Json } from '@/content/engine/primitives';
import type { LocalIssue } from '@/content/engine/issues';

/**
 * Editor genérico de borrador: el NIVEL 1 de los tres del diseño.
 *
 * Recorre el borrador y renderiza un control por campo de texto reconocible. No es el `SchemaForm` de la
 * Fase 9 —ese lee el `ZodObject` y respeta las pistas de UI de cada dinámica—, pero ya cumple lo esencial:
 * escribe sobre el BORRADOR laxo, así que un enunciado vacío o una lista de opciones a medias no lo
 * rompen, y pinta los problemas sin bloquear la escritura.
 */
export interface DraftEditorProps {
  readonly draft: unknown;
  readonly onDraft: (next: Json) => void;
  readonly issues: readonly LocalIssue[];
}

/** Predicado de tipo, no un cast: el borrador que llega del editor ya es una estructura Json. */
function isRecord(value: unknown): value is Record<string, Json> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isTextItem(value: unknown): value is { id: string; text: string } {
  return isRecord(value) && typeof value['id'] === 'string' && typeof value['text'] === 'string';
}

const LABELS: Readonly<Record<string, string>> = {
  prompt: 'Enunciado',
  statement: 'Afirmación',
  template: 'Texto con huecos',
  options: 'Opciones',
  items: 'Elementos, en el orden correcto',
  tokens: 'Fichas, en el orden correcto',
  decoys: 'Distractores',
};

export function DraftEditor({ draft, onDraft, issues }: DraftEditorProps) {
  if (!isRecord(draft)) return <p style={{ color: 'var(--fg-muted)' }}>Borrador vacío.</p>;

  const setField = (key: string, value: Json): void => {
    const next: Record<string, Json> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (k === key) continue;
      next[k] = v;
    }
    next[key] = value;
    onDraft(next);
  };

  const issueFor = (key: string, index?: number): LocalIssue | undefined =>
    issues.find((i) => i.field[0] === key && (index === undefined || i.field[1] === index));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {Object.entries(draft).map(([key, value]) => {
        const label = LABELS[key] ?? key;
        const problem = issueFor(key);

        if (typeof value === 'string') {
          return (
            <label key={key} style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 'var(--t-14)', color: 'var(--fg-muted)' }}>{label}</span>
              <textarea
                value={value}
                rows={value.length > 90 ? 3 : 1}
                onChange={(e) => setField(key, e.target.value)}
                style={{
                  font: 'inherit',
                  padding: 10,
                  minHeight: 'var(--tap-min)',
                  borderRadius: 'var(--r-sm)',
                  border: `2px solid ${problem === undefined ? 'var(--border-strong)' : 'var(--border-danger)'}`,
                  background: 'var(--bg-paper)',
                  color: 'var(--fg-default)',
                  resize: 'vertical',
                }}
              />
              {problem !== undefined && (
                <span style={{ color: 'var(--fg-danger)', fontSize: 'var(--t-12)' }}>{problem.message}</span>
              )}
            </label>
          );
        }

        if (typeof value === 'boolean') {
          return (
            <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 'var(--tap-min)' }}>
              <input type="checkbox" checked={value} onChange={(e) => setField(key, e.target.checked)} />
              <span style={{ fontSize: 'var(--t-14)' }}>{label}</span>
            </label>
          );
        }

        if (Array.isArray(value) && value.every(isTextItem)) {
          return (
            <fieldset key={key} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}>
              <legend style={{ fontSize: 'var(--t-14)', color: 'var(--fg-muted)', padding: 0 }}>{label}</legend>
              {value.map((item, i) => (
                <input
                  key={item.id}
                  value={item.text}
                  onChange={(e) => {
                    const next = value.map((x, j) => (j === i ? { id: x.id, text: e.target.value } : x));
                    setField(key, next);
                  }}
                  style={{
                    font: 'inherit',
                    padding: '8px 10px',
                    minHeight: 'var(--tap-min)',
                    borderRadius: 'var(--r-sm)',
                    border: `2px solid ${issueFor(key, i) === undefined ? 'var(--border-strong)' : 'var(--border-danger)'}`,
                    background: 'var(--bg-paper)',
                    color: 'var(--fg-default)',
                  }}
                />
              ))}
            </fieldset>
          );
        }

        return null;
      })}

      {issues.length > 0 && (
        <ul style={{ margin: 0, paddingInlineStart: 18, color: 'var(--fg-danger)', fontSize: 'var(--t-14)' }}>
          {issues.map((i, n) => (
            <li key={`${i.code}-${String(n)}`}>{i.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
