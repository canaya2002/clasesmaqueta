'use client';

/**
 * SENDA — la implementación de sesión REAL del puerto `LessonRuntime`.
 *
 * Su gemela es `createPreviewRuntime`, que el Studio usa en el editor. Que sean dos objetos distintos y no
 * un flag `isPreview` es deliberado: el día que alguien olvide pasar el flag, un preview del Studio gastaría
 * corazones de verdad y escribiría intentos en la analítica. Aquí eso no compila, porque el preview
 * simplemente no tiene de dónde sacar `spendHeart`.
 */

import * as fx from '@/design/fx';
import type { EconomyConfig } from '@/content/engine/economy';
import type { Attempt } from '@/content/engine/session';
import type { LessonRuntime, SessionSfxId, StepReport } from '@/content/engine/runtime';
import { refillAll, snapshot, spendHeart } from './hearts';
import { read, write } from './persist';

const ATTEMPT_LOG_CAP = 400;

function appendJson(key: 'progress' | 'audit', entry: unknown, cap: number): void {
  const raw = read(key);
  let list: unknown[] = [];
  if (raw !== null) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }
  list.push(entry);
  // El log es append-only pero no infinito: sin tope, una demo larga desaloja contenido publicado.
  write(key, JSON.stringify(list.slice(-cap)));
}

export interface SessionRuntimeOptions {
  readonly econ: EconomyConfig;
  /** `false` en el test de nivel del onboarding y en cualquier anfitrión sin economía. */
  readonly hostAllowsHearts?: boolean;
  readonly awardsProgress?: boolean;
}

export function createSessionRuntime(opts: SessionRuntimeOptions): LessonRuntime {
  const econ = opts.econ;
  return {
    hostAllowsHearts: opts.hostAllowsHearts ?? true,
    awardsProgress: opts.awardsProgress ?? true,
    hearts: snapshot(econ),
    spendHeart: () => {
      spendHeart(econ);
    },
    refillHearts: () => {
      refillAll(econ);
    },
    playSfx: (id: SessionSfxId) => {
      fx.play(id);
    },
    burst: (element: Element | null) => {
      if (element !== null) fx.burst(element);
    },
    persistAttempt: (attempt: Attempt) => {
      if (opts.awardsProgress === false) return;
      appendJson('progress', attempt, ATTEMPT_LOG_CAP);
    },
    reportStep: (report: StepReport) => {
      appendJson('audit', { kind: 'step-report', ...report }, 200);
    },
  };
}

/** El runtime del editor: se juega igual, no gasta nada y no escribe nada. */
export function createPreviewRuntime(econ: EconomyConfig): LessonRuntime {
  return {
    hostAllowsHearts: false,
    awardsProgress: false,
    hearts: { enabled: false, current: econ.maxHearts, max: econ.maxHearts, nextRefillAtRealMs: null, unlimited: false },
    spendHeart: () => undefined,
    refillHearts: () => undefined,
    playSfx: (id: SessionSfxId) => {
      fx.play(id);
    },
    burst: (element: Element | null) => {
      if (element !== null) fx.burst(element);
    },
    persistAttempt: () => undefined,
    reportStep: () => undefined,
  };
}
