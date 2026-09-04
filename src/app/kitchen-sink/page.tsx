'use client';

import { useEffect, useState } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { Mascot } from '@/components/game/mascot/Mascot';
import { MascotSolid } from '@/components/game/mascot/MascotSolid';
import type { MascotState } from '@/components/game/mascot/types';
import * as fx from '@/design/fx';
import { audioBus } from '@/lib/audio/synth';
import { MICRO_INTERACTIONS } from '@/design/motion';
import type { SfxId } from '@/design/sound';
import type { ButtonSize, ButtonVariant } from '@/components/ui/Button3D';

const VARIANTS: readonly ButtonVariant[] = ['primary', 'success', 'danger', 'ghost', 'locked'];
const SIZES: readonly ButtonSize[] = ['sm', 'md', 'lg'];
const STATES: readonly MascotState[] = ['idle', 'think', 'correct', 'wrong', 'celebrate'];
const SFX_IDS: readonly SfxId[] = [
  'correct',
  'wrong',
  'combo',
  'levelUp',
  'chestOpen',
  'tap',
  'whoosh',
  'streakFire',
];
const FAMILIES = ['brand', 'grape', 'lime', 'mint', 'coral', 'amber', 'sky'] as const;
const STEPS = ['300', '400', '500', '600', '700', '800'] as const;
const SECTIONS = ['brand', 'grape', 'mint', 'coral', 'amber', 'sky'] as const;
const STREAKS = ['cold', 'warm', 'hot', 'blaze'] as const;

type Theme = 'light' | 'dark' | 'system';

function Section({ title, hint, children }: { readonly title: string; readonly hint?: string; readonly children: React.ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 12, paddingBlock: 28, borderTop: '2px solid var(--border-default)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--t-22)', lineHeight: 'var(--lh-22)', letterSpacing: 'var(--tr-22)' }}>{title}</h2>
        {hint !== undefined && (
          <p style={{ margin: '4px 0 0', color: 'var(--fg-muted)', fontSize: 'var(--t-14)', lineHeight: 'var(--lh-14)', maxWidth: 'var(--measure)' }}>
            {hint}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function KitchenSink(): React.ReactElement {
  const [theme, setTheme] = useState<Theme>('system');
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [streak, setStreak] = useState<(typeof STREAKS)[number]>('warm');
  const [audio, setAudio] = useState(audioBus.status());
  const [combo, setCombo] = useState(1);

  useEffect(() => audioBus.subscribe(setAudio), []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-streak', streak);
  }, [streak]);

  return (
    <main style={{ padding: '32px clamp(16px, 4vw, 48px) 96px', maxWidth: 1180, marginInline: 'auto' }}>
      <header style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 20 }}>
        <h1 style={{ fontSize: 'var(--t-36)', lineHeight: 'var(--lh-36)', letterSpacing: 'var(--tr-36)' }}>
          Kitchen sink
        </h1>
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
          {(['light', 'dark', 'system'] as const).map((t) => (
            <Button3D key={t} size="sm" variant={theme === t ? 'primary' : 'ghost'} onClick={() => setTheme(t)}>
              {t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Sistema'}
            </Button3D>
          ))}
        </div>
      </header>

      <Section
        title="Botón 3D · 5 variantes × 3 tamaños"
        hint="La sombra es una losa aparte e inmóvil; lo único que se mueve al pulsar es la cara. El borde inferior nunca existe como border-width, así que la pulsación no dispara layout. `locked` sigue enfocable y hace clunk."
      >
        <div style={{ display: 'grid', gap: 16 }}>
          {SIZES.map((size) => (
            <div key={size} style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <code style={{ width: 32, color: 'var(--fg-muted)', fontSize: 'var(--t-12)' }}>{size}</code>
              {VARIANTS.map((variant) => (
                <Button3D key={variant} variant={variant} size={size}>
                  {variant === 'locked' ? '🔒 Bloqueado' : variant}
                </Button3D>
              ))}
            </div>
          ))}
          <Button3D full size="lg" variant="success" onClick={() => fx.play('correct')}>
            Comprobar
          </Button3D>
        </div>
      </Section>

      <Section
        title="Anillo de foco compuesto"
        hint="El anillo lima simple da 1.35:1 sobre papel e incumple WCAG 1.4.11. El compuesto —lima + casing tinta— cumple sobre CUALQUIER superficie: peor caso 3.71:1. Navega con Tab y compruébalo sobre el papel y sobre la barra lima."
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button3D variant="ghost">Foco sobre papel</Button3D>
          <div style={{ background: 'var(--bg-xp-solid)', padding: 16, borderRadius: 'var(--r-md)', display: 'flex', gap: 12 }}>
            <Button3D variant="ghost">Foco sobre lima</Button3D>
          </div>
          <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 'var(--r-md)' }}>
            <Button3D variant="ghost">Foco sobre violeta</Button3D>
          </div>
        </div>
      </Section>

      <Section
        title="Cuati · 5 estados"
        hint="Rig por capas: el shake de `wrong` vive en la cabeza y no en el root (sacudir el root lee como tambaleo; sacudir la cabeza con el cuerpo plantado lee como negación). La punta de la cola es el estado de la racha, resuelto por atributo en <html>, no por prop."
      >
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Mascot state={mascotState} size={240} trackPointer onPoke={() => fx.play('tap')} label="Cuati" />
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATES.map((s) => (
                <Button3D key={s} size="sm" variant={mascotState === s ? 'primary' : 'ghost'} onClick={() => setMascotState(s)}>
                  {s}
                </Button3D>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--t-14)', color: 'var(--fg-muted)' }}>Racha:</span>
              {STREAKS.map((s) => (
                <Button3D key={s} size="sm" variant={streak === s ? 'primary' : 'ghost'} onClick={() => setStreak(s)}>
                  {s}
                </Button3D>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', paddingTop: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <Mascot state="idle" size={48} />
                <div style={{ fontSize: 'var(--t-12)', color: 'var(--fg-muted)' }}>chip 48</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Mascot state="idle" size={32} />
                <div style={{ fontSize: 'var(--t-12)', color: 'var(--fg-muted)' }}>chip 32</div>
              </div>
              <div style={{ textAlign: 'center', width: 48 }}>
                <MascotSolid />
                <div style={{ fontSize: 'var(--t-12)', color: 'var(--fg-muted)' }}>solid</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Audio sintetizado · los 8 SFX"
        hint={`Estado del bus: ${audio}. El AudioContext se crea DENTRO del primer gesto: en Safari/iOS crearlo antes lo deja suspendido para siempre. El combo sube por una pentatónica mayor de Re, no por semitonos, para no disonar contra el cue de acierto.`}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {SFX_IDS.map((id) => (
            <Button3D key={id} size="sm" variant="ghost" onClick={() => fx.play(id)}>
              {id}
            </Button3D>
          ))}
          <span style={{ width: 24 }} />
          <Button3D
            size="sm"
            variant="primary"
            onClick={() => {
              const next = combo >= 8 ? 1 : combo + 1;
              setCombo(next);
              fx.playCombo(next);
            }}
          >
            combo ×{combo}
          </Button3D>
          <Button3D size="sm" variant="danger" onClick={() => audioBus.setMuted(true)}>
            silenciar
          </Button3D>
          <Button3D size="sm" variant="success" onClick={() => audioBus.setMuted(false)}>
            activar
          </Button3D>
        </div>
      </Section>

      <Section
        title="Rampas · el número del escalón es un contrato de contraste"
        hint="Generadas por `pnpm tokens` con búsqueda binaria sobre la luminosidad, no elegidas a ojo. El -500 es el único sin contrato: es el color de firma. Los cinco hexes de la especificación se conservan literalmente."
      >
        <div style={{ display: 'grid', gap: 6 }}>
          {FAMILIES.map((fam) => (
            <div key={fam} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <code style={{ width: 60, fontSize: 'var(--t-12)', color: 'var(--fg-muted)' }}>{fam}</code>
              {STEPS.map((step) => (
                <div
                  key={step}
                  style={{
                    flex: 1,
                    height: 44,
                    background: `var(--${fam}-${step})`,
                    borderRadius: 'var(--r-sm)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 'var(--t-12)',
                    color: step === '300' || step === '400' ? 'var(--ink-fixed)' : 'var(--paper-fixed)',
                  }}
                >
                  {step}
                </div>
              ))}
              <div style={{ width: 60, height: 44, background: `var(--${fam}-shadow)`, borderRadius: 'var(--r-sm)', display: 'grid', placeItems: 'center', fontSize: 'var(--t-12)', color: 'var(--paper-fixed)' }}>
                sh
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Color de sección · siempre en pares fill/on-fill"
        hint="`lime` NO está en el enum: con él, un administrador no técnico podría publicar un camino ilegible desde el Studio. Cada token viaja con su pareja de texto y su prueba de contraste."
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {SECTIONS.map((s) => (
            <div
              key={s}
              data-section={s}
              style={{
                background: 'var(--section-fill)',
                color: 'var(--section-on-fill)',
                padding: '14px 20px',
                borderRadius: 'var(--r-lg)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Efectos · degradan solos con movimiento reducido"
        hint="El shake NO degrada a un fade: un fade no comunica error. Degrada a un destello de borde. El confetti simplemente no se monta. Activa «Reducir movimiento» en el sistema y vuelve a probar."
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button3D size="sm" variant="ghost" onClick={(e) => fx.shake(e.currentTarget)}>
            shake
          </Button3D>
          <Button3D size="sm" variant="ghost" onClick={(e) => fx.burst(e.currentTarget)}>
            partículas DOM
          </Button3D>
          <Button3D size="sm" variant="ghost" onClick={() => void fx.confetti({ x: 0.5, y: 0.6 }, 2)}>
            confetti (2 oleadas)
          </Button3D>
        </div>
      </Section>

      <Section title="Esqueletos" hint="Barrido por transform, jamás por background-position: lo segundo repinta el fondo entero en cada frame.">
        <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <div className="skeleton" style={{ height: 44 }} />
          <div className="skeleton" style={{ height: 44, width: '70%' }} />
          <div className="skeleton" style={{ height: 44, width: '45%' }} />
        </div>
      </Section>

      <Section
        title={`Matriz de las 27 micro-interacciones (${MICRO_INTERACTIONS.length})`}
        hint="Existe como DATO desde la Fase 1, no como una tabla en un documento con casillas que alguien marca a mano. En la Fase 6 un test cruza esta constante contra un grep del árbol y falla si alguna no tiene implementación declarada."
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 'var(--t-14)', minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--fg-muted)' }}>
                <th style={{ padding: '6px 10px' }}>#</th>
                <th style={{ padding: '6px 10px' }}>Micro-interacción</th>
                <th style={{ padding: '6px 10px' }}>Dueño</th>
                <th style={{ padding: '6px 10px' }}>Canal</th>
                <th style={{ padding: '6px 10px' }}>Fase</th>
              </tr>
            </thead>
            <tbody>
              {MICRO_INTERACTIONS.map((mi) => (
                <tr key={mi.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '6px 10px', color: 'var(--fg-muted)' }}>{mi.id}</td>
                  <td style={{ padding: '6px 10px' }}>{mi.name}</td>
                  <td style={{ padding: '6px 10px' }}><code>{mi.owner}</code></td>
                  <td style={{ padding: '6px 10px', color: 'var(--fg-muted)' }}>{mi.channel}</td>
                  <td style={{ padding: '6px 10px' }}>
                    <span style={{ background: mi.phase === 1 ? 'var(--bg-success-subtle)' : 'var(--border-default)', color: 'var(--ink-fixed)', padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: 'var(--t-12)' }}>
                      F{mi.phase}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}
