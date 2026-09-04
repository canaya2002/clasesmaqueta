/**
 * El criterio de aceptación de la fase 4, ejecutable: una lección de diez pasos de punta a punta SIN tocar
 * el ratón, y perder la última vida anunciando en `assertive` con el modal de tres salidas.
 *
 * La prueba solo emite eventos de teclado. Si en algún momento el foco cae a `body`, o si el botón primario
 * deja de responder a Enter, la lección se queda a medias y la prueba falla por lo que le importa al
 * alumno: no llegó al final.
 */

import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { LessonShell } from '../LessonShell';
import '@/content/dynamics/index';
import { MotionRoot } from '@/design/MotionRoot';
import { DEFAULT_ECONOMY } from '@/content/engine/economy';
import { lessonSchema, type Lesson } from '@/content/engine/schema';
import type { LessonRuntime } from '@/content/engine/runtime';
import { initClock } from '@/lib/clock';

initClock({ storedAnchorMs: Date.parse('2026-03-02T10:00:00Z'), epochSeed: 'test-lesson-keyboard' });

const STEP_COUNT = 10;

function makeLesson(): Lesson {
  return lessonSchema.parse({
    id: 'lsn_teclado-e2e',
    title: 'Recepción de clientes',
    kind: 'practice',
    difficulty: 2,
    heartsEnabled: true,
    steps: Array.from({ length: STEP_COUNT }, (_, i) => ({
      id: `stp_teclado-${String(i + 1).padStart(2, '0')}`,
      type: 'multiple-choice',
      data: {
        prompt: `Pregunta ${String(i + 1)}`,
        options: [
          { id: 'opt_aa01', text: 'La correcta' },
          { id: 'opt_aa02', text: 'La otra' },
        ],
        correctOptionId: 'opt_aa01',
        shuffle: false,
        figure: null,
      },
      hint: null,
      explanation: 'Porque el protocolo lo pide.',
      xpWeight: 1,
      assessmentWeight: 1,
      skills: ['skl_recepcion'],
      tags: [],
    })),
  });
}

function makeRuntime(over: Partial<LessonRuntime> = {}): LessonRuntime {
  return {
    hostAllowsHearts: true,
    awardsProgress: true,
    hearts: { enabled: true, current: 5, max: 5, nextRefillAtRealMs: null, unlimited: false },
    spendHeart: () => undefined,
    refillHearts: () => undefined,
    playSfx: () => undefined,
    burst: () => undefined,
    persistAttempt: () => undefined,
    reportStep: () => undefined,
    ...over,
  };
}

function press(key: string): void {
  const target = document.activeElement ?? document.body;
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
  });
}

/** El piso perceptual entre calificar y avanzar es real; en la prueba se salta moviendo el reloj monótono. */
function skipFeedbackFloor(): void {
  const base = performance.now();
  vi.spyOn(performance, 'now').mockImplementation(() => base + 10_000);
}

function renderLesson(runtime: LessonRuntime, onFinish = (): void => undefined) {
  return render(
    <MotionRoot>
      <LessonShell
        lesson={makeLesson()}
        runtime={runtime}
        econ={DEFAULT_ECONOMY}
        onExit={() => undefined}
        onFinish={onFinish}
      />
    </MotionRoot>,
  );
}

describe('lección completa solo con teclado', () => {
  it('recorre los diez pasos sin que el foco caiga nunca a body', async () => {
    const finished = vi.fn();
    renderLesson(makeRuntime(), finished);

    for (let step = 0; step < STEP_COUNT; step += 1) {
      // El player es perezoso: se espera a que resuelva su chunk, igual que esperaría una persona.
      await screen.findByText(`Pregunta ${String(step + 1)}`);

      // Y AQUÍ está la aserción que importa: resolver el chunk NO se llevó el foco. El encabezado vive
      // fuera del límite de Suspense justamente para eso; dentro, cada paso empezaría en `body`.
      expect(document.activeElement).not.toBe(document.body);
      expect(document.activeElement?.tagName).toBe('H1');

      // "1" activa la opción que declaró esa tecla en el DOM. El shell no sabe qué dinámica es.
      press('1');
      press('Enter');

      await screen.findByText('Porque el protocolo lo pide.');

      skipFeedbackFloor();
      press('Enter');
      vi.restoreAllMocks();
    }

    await waitFor(() => {
      expect(finished).toHaveBeenCalled();
    });
    expect(await screen.findByRole('heading', { level: 1 })).toHaveProperty(
      'textContent',
      expect.stringContaining('Lección'),
    );
  });

  it('Enter sostenido NO se salta el panel de feedback', async () => {
    renderLesson(makeRuntime());
    await screen.findByText('Pregunta 1');

    press('1');
    const target = document.activeElement ?? document.body;
    act(() => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      // Sin keyup entremedio: exactamente lo que produce mantener la tecla pulsada.
      for (let i = 0; i < 40; i += 1) {
        target.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }),
        );
      }
    });

    // El panel sigue abierto: el candado no es tiempo, es una pulsación física nueva.
    expect(await screen.findByText('Porque el protocolo lo pide.')).toBeDefined();
    expect(screen.getByText(/paso 1 de 10/i)).toBeDefined();
  });
});

describe('quedarse sin corazones', () => {
  it('anuncia en assertive y abre el modal con las tres salidas', async () => {
    renderLesson(makeRuntime({ hearts: { enabled: true, current: 1, max: 5, nextRefillAtRealMs: null, unlimited: false } }));
    await screen.findByText('Pregunta 1');

    press('2'); // la incorrecta
    press('Enter');

    const alert = await screen.findByRole('alert');
    await waitFor(() => {
      expect(alert.textContent).toContain('sin corazones');
    });

    // Las tres salidas, y ninguna de ellas es "cerrar y quedarse atascado".
    expect(screen.getByText(/Recargar por/)).toBeDefined();
    expect(screen.getByText('Practicar sin corazones')).toBeDefined();
    expect(screen.getByText('Salir y esperar')).toBeDefined();
  });
});
