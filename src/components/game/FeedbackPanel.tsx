'use client';

import { motion } from '@/design/m';
import { useVariant } from '@/design/MotionRoot';
import { Verdict, type VerdictKind } from '@/content/dynamics/_shared/Verdict';

export interface FeedbackPanelProps {
  readonly open: boolean;
  readonly kind: VerdictKind;
  readonly explanation: string | null;
  readonly detail: string | null;
  readonly onReport: () => void;
}

/**
 * El panel SIEMPRE está montado, con su altura reservada.
 *
 * Montarlo condicionalmente con `AnimatePresence` —que es lo que enseña la documentación— hace que el
 * cuerpo del ejercicio salte hacia arriba en el momento en que el alumno acaba de contestar, justo cuando
 * está mirando. Con altura reservada, abrirlo es solo `transform` y no mueve nada.
 *
 * El panel NO lleva región `aria-live` dentro. Estando cerrado va `inert`, y `inert` saca el subárbol del
 * árbol de accesibilidad: una región viva ahí dentro deja de anunciar exactamente cuando se necesita, y una
 * que nace no-inerte junto con su primer mensaje tampoco anuncia. El veredicto lo dice la región del shell,
 * que está montada y vacía desde el primer paint y nunca recibe `inert`.
 *
 * `inert` y no `aria-hidden`: `aria-hidden` esconde del lector pero NO saca del orden de tabulación, así que
 * con el panel cerrado se tabula a "Continuar" antes de haber contestado — y tabular dentro de un subárbol
 * `aria-hidden` es comportamiento indefinido en NVDA y VoiceOver.
 */
export function FeedbackPanel({ open, kind, explanation, detail, onReport }: FeedbackPanelProps) {
  const variants = useVariant(kind === 'correct' ? 'feedbackCorrect' : 'feedbackWrong');

  return (
    <motion.div
      variants={variants}
      initial="out"
      animate={open ? 'in' : 'out'}
      inert={!open}
      style={{
        minHeight: 168,
        padding: '16px 20px',
        borderTopLeftRadius: 'var(--r-xl)',
        borderTopRightRadius: 'var(--r-xl)',
        background:
          kind === 'correct'
            ? 'var(--bg-success-subtle)'
            : kind === 'partial'
              ? 'var(--bg-warning-subtle)'
              : 'var(--bg-danger-subtle)',
        color: 'var(--ink-fixed)',
        display: 'grid',
        gap: 8,
        alignContent: 'start',
      }}
    >
      <div>
        {open && (
          <>
            <Verdict kind={kind}>{detail ?? undefined}</Verdict>
            {explanation !== null && (
              <p style={{ margin: '4px 0 0', fontSize: 'var(--t-14)', lineHeight: 'var(--lh-14)', maxWidth: 'var(--measure)' }}>
                {explanation}
              </p>
            )}
          </>
        )}
      </div>
      {open && (
        <button
          type="button"
          onClick={onReport}
          style={{
            justifySelf: 'start',
            minHeight: 'var(--tap-min)',
            padding: '0 4px',
            border: 0,
            background: 'none',
            color: 'inherit',
            opacity: 0.75,
            font: 'inherit',
            fontSize: 'var(--t-12)',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Reportar este ejercicio
        </button>
      )}
    </motion.div>
  );
}
