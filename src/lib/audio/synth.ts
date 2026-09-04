/**
 * SENDA — bus de audio sintetizado con Web Audio. Cero archivos, cero red.
 *
 * Tres cosas que no son obvias y que deciden si la demo suena o no:
 *
 * 1. El AudioContext se CREA DENTRO del primer gesto del usuario. Crearlo en el import lo deja en
 *    `suspended` para siempre en Safari/iOS, y la primera respuesta correcta de la demo suena a nada.
 * 2. La cadena master pasa por un soft clip y un compresor. Sin ellos, apilar `correct` + `combo` +
 *    `chestOpen` satura y suena a distorsión de bocina de laptop.
 * 3. Silenciar es una RAMPA de 12ms, no `gain.value = 0` (produce un clic de una muestra) ni
 *    `ctx.suspend()` inmediato (en iOS exige otro gesto para volver, y el usuario que apaga y prende el
 *    sonido en Ajustes se queda mudo para siempre). Y nunca se llama `close()`.
 */

import { MAX_VOICES, SFX, type SfxId } from '@/design/sound';

export type AudioStatus = 'idle' | 'unlocking' | 'ready' | 'unavailable';

interface Voice {
  readonly id: SfxId;
  readonly priority: 1 | 2 | 3;
  readonly cost: number;
  readonly startedAt: number;
  readonly nodes: readonly AudioNode[];
  readonly gain: GainNode;
}

interface PlayOptions {
  /** Multiplicador de tono. `combo` lo usa para recorrer la pentatónica. */
  readonly pitch?: number;
  readonly gain?: number;
}

const SOFT_CLIP_CURVE_LENGTH = 1024;

// `Float32Array<ArrayBuffer>` y no `Float32Array` a secas: desde TS 5.7 el tipo es genérico sobre el
// búfer, y `WaveShaperNode.curve` no acepta un `SharedArrayBuffer`.
function makeSoftClipCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(SOFT_CLIP_CURVE_LENGTH);
  for (let i = 0; i < SOFT_CLIP_CURVE_LENGTH; i += 1) {
    const x = (i / (SOFT_CLIP_CURVE_LENGTH - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6);
  }
  return curve;
}

class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private voices: Voice[] = [];
  private lastPlayed = new Map<SfxId, number>();
  private muted = false;
  private state: AudioStatus = 'idle';
  private listeners = new Set<(s: AudioStatus) => void>();
  private suspendTimer: number | null = null;
  private unlockBound = false;

  status(): AudioStatus {
    return this.state;
  }

  subscribe(fn: (s: AudioStatus) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private setState(s: AudioStatus): void {
    if (this.state === s) return;
    this.state = s;
    for (const fn of this.listeners) fn(s);
  }

  /**
   * Engancha el desbloqueo al primer gesto. Idempotente y seguro en servidor.
   * NO usa `once`: el primer intento puede fallar, y los listeners se retiran cuando el estado es `ready`.
   */
  install(): void {
    if (typeof window === 'undefined' || this.unlockBound) return;
    this.unlockBound = true;

    if (typeof window.AudioContext === 'undefined') {
      this.setState('unavailable');
      return;
    }

    const onGesture = (): void => {
      void this.unlock();
    };
    window.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
    window.addEventListener('keydown', onGesture, { capture: true, passive: true });

    const cleanup = (): void => {
      window.removeEventListener('pointerdown', onGesture, { capture: true });
      window.removeEventListener('keydown', onGesture, { capture: true });
    };
    this.subscribe((s) => {
      if (s === 'ready' || s === 'unavailable') cleanup();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Debounce de 250ms: bajar el centro de notificaciones no debe matar el sonido de una lección.
        this.suspendTimer = window.setTimeout(() => {
          void this.ctx?.suspend();
        }, 250);
      } else {
        if (this.suspendTimer !== null) {
          window.clearTimeout(this.suspendTimer);
          this.suspendTimer = null;
        }
        if (!this.muted) void this.ctx?.resume();
      }
    });
  }

  private async unlock(): Promise<void> {
    if (this.state === 'ready' || this.state === 'unavailable') return;
    this.setState('unlocking');
    try {
      const ctx = new AudioContext({ latencyHint: 'interactive' });

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 1;

      const shaper = ctx.createWaveShaper();
      shaper.curve = makeSoftClipCurve();
      shaper.oversample = '2x';

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 12;
      comp.ratio.value = 3;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;

      master.connect(shaper);
      shaper.connect(comp);
      comp.connect(ctx.destination);

      // Buffer de ruido de 1s, reutilizado por todos los cues que lo necesitan.
      const frames = ctx.sampleRate;
      const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buf.getChannelData(0);
      // Ruido determinista: la demo suena igual en cada máquina. `Math.random` está prohibido por lint.
      let seed = 0x9e3779b9;
      for (let i = 0; i < frames; i += 1) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[i] = (seed / 0xffffffff) * 2 - 1;
      }

      // Un frame silencioso: en iOS es lo que confirma el desbloqueo.
      const silent = ctx.createBufferSource();
      silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      silent.connect(master);
      silent.start(0);

      await ctx.resume();

      this.ctx = ctx;
      this.master = master;
      this.noiseBuffer = buf;
      this.setState('ready');
    } catch {
      this.setState('unavailable');
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const ctx = this.ctx;
    const master = this.master;
    if (ctx === null || master === null) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(muted ? 0 : 1, now, 0.012);
    if (muted) {
      window.setTimeout(() => {
        if (this.muted) void ctx.suspend();
      }, 60);
    } else {
      void ctx.resume();
    }
  }

  /** Baja el master mientras corre una cinemática, para que la voz de la cinemática destaque. */
  duck(amount: number, durationMs: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (ctx === null || master === null || this.muted) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(amount, now, 0.03);
    master.gain.setTargetAtTime(1, now + durationMs / 1000, 0.12);
  }

  private reclaim(cost: number): boolean {
    const used = this.voices.reduce((n, v) => n + v.cost, 0);
    if (used + cost <= MAX_VOICES) return true;
    // Robo por PRIORIDAD, no FIFO: el feedback pedagógico nunca se pierde por culpa de un adorno.
    const victims = this.voices
      .filter((v) => v.priority < 3)
      .sort((a, b) => a.priority - b.priority || a.startedAt - b.startedAt);
    let freed = 0;
    for (const v of victims) {
      if (used - freed + cost <= MAX_VOICES) break;
      this.stopVoice(v);
      freed += v.cost;
    }
    return used - freed + cost <= MAX_VOICES;
  }

  private stopVoice(v: Voice): void {
    const ctx = this.ctx;
    if (ctx === null) return;
    const now = ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setTargetAtTime(0, now, 0.012);
    window.setTimeout(() => {
      for (const n of v.nodes) n.disconnect();
      v.gain.disconnect();
    }, 40);
    this.voices = this.voices.filter((x) => x !== v);
  }

  play(id: SfxId, opts: PlayOptions = {}): void {
    if (this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    if (ctx === null || master === null || this.state !== 'ready') return;

    const spec = SFX[id];
    const nowMs = ctx.currentTime * 1000;
    const last = this.lastPlayed.get(id);
    if (last !== undefined && nowMs - last < spec.throttleMs) return;
    if (!this.reclaim(spec.cost)) return;
    this.lastPlayed.set(id, nowMs);

    const t0 = ctx.currentTime;
    const { attack, decay, sustain, release } = spec.env;
    const dur = spec.durationMs / 1000;
    const pitch = opts.pitch ?? 1;
    const level = opts.gain ?? 1;

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;
    voiceGain.gain.setValueAtTime(0, t0);
    voiceGain.gain.linearRampToValueAtTime(level, t0 + attack);
    voiceGain.gain.linearRampToValueAtTime(level * sustain, t0 + attack + decay);
    voiceGain.gain.setTargetAtTime(0, t0 + Math.max(attack + decay, dur - release), release / 3);

    let tail: AudioNode = voiceGain;
    const nodes: AudioNode[] = [];

    if (spec.filter !== null) {
      const biquad = ctx.createBiquadFilter();
      biquad.type = spec.filter.kind;
      biquad.frequency.value = spec.filter.freq;
      voiceGain.connect(biquad);
      biquad.connect(master);
      nodes.push(biquad);
      tail = biquad;
    } else {
      voiceGain.connect(master);
    }
    void tail;

    for (const layer of spec.tones) {
      const osc = ctx.createOscillator();
      osc.type = layer.wave;
      osc.detune.value = layer.detuneCents;
      const start = t0 + layer.delay;
      osc.frequency.setValueAtTime(layer.freq * pitch, start);
      if (layer.toFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, layer.toFreq * pitch),
          start + dur * 0.85,
        );
      }
      const g = ctx.createGain();
      g.gain.value = layer.gain;
      osc.connect(g);
      g.connect(voiceGain);
      osc.start(start);
      osc.stop(t0 + dur + release + 0.05);
      nodes.push(osc, g);
    }

    if (spec.noise.length > 0 && this.noiseBuffer !== null) {
      for (const layer of spec.noise) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const biquad = ctx.createBiquadFilter();
        biquad.type = layer.filter;
        biquad.Q.value = layer.q;
        const start = t0 + layer.delay;
        biquad.frequency.setValueAtTime(layer.freq, start);
        if (layer.toFreq !== null) {
          biquad.frequency.exponentialRampToValueAtTime(
            Math.max(40, layer.toFreq),
            start + dur * 0.85,
          );
        }
        const g = ctx.createGain();
        g.gain.value = layer.gain;
        src.connect(biquad);
        biquad.connect(g);
        g.connect(voiceGain);
        src.start(start);
        src.stop(t0 + dur + release + 0.05);
        nodes.push(src, biquad, g);
      }
    }

    const voice: Voice = {
      id,
      priority: spec.priority,
      cost: spec.cost,
      startedAt: nowMs,
      nodes,
      gain: voiceGain,
    };
    this.voices.push(voice);
    window.setTimeout(
      () => {
        this.voices = this.voices.filter((v) => v !== voice);
        for (const n of nodes) n.disconnect();
        voiceGain.disconnect();
      },
      (dur + release) * 1000 + 120,
    );
  }
}

export const audioBus = new AudioBus();
