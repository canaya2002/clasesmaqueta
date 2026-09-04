/**
 * SENDA — el esquema de la economía.
 *
 * El TIPO y los rangos viven en el motor; los VALORES viven en `src/mock/economy.ts` y se editan desde
 * /studio/gamification. Esa separación es la que hace posible el criterio de aceptación "cambiar el XP se
 * refleja de inmediato": el motor recibe la configuración como argumento y no la busca, así que la misma
 * función pura califica con la economía de hoy o con la que el admin acaba de guardar.
 *
 * Un diseño anterior tenía CUATRO nombres en circulación para el mismo parámetro (`xpPerWeight`,
 * `xpPerLesson`, `xpPerCompletion`, `baseXp`) y ningún dueño. Con cuatro nombres, el criterio no se puede
 * demostrar sin que un número contradiga a otro en la misma pantalla.
 *
 * Cada campo lleva `.describe()`: /studio/gamification se RENDERIZA desde el schema, así que añadir una
 * perilla aquí hace aparecer un control allá sin escribir UI.
 */

import { z } from 'zod';

export const economySchema = z.object({
  version: z.number().int().min(1),

  /* --- XP ------------------------------------------------------------------------------------- */
  xpBase: z.number().int().min(1).max(50).describe('XP base de un paso de peso 1 y dificultad 1'),
  difficultyFactor: z
    .tuple([z.number(), z.number(), z.number(), z.number(), z.number()])
    .describe('Multiplicador por dificultad de lección, de 1 a 5'),
  comboTiers: z
    .array(z.object({ at: z.number().int().min(0), mult: z.number().min(1).max(4) }))
    .min(1)
    .describe('Escalones del combo: a partir de N aciertos seguidos, multiplicador M'),
  /** Un paso re-encolado tras fallar otorga esta fracción. Ni el 100% (destruye la métrica) ni 0 (no enseña). */
  replayXpFactor: z.number().min(0).max(1).describe('Fracción del XP al acertar un paso re-encolado'),
  hintXpFactor: z.number().min(0).max(1).describe('Fracción del XP si se usó la pista'),
  bonusPerfectXp: z.number().int().min(0).max(200).describe('Bono por lección perfecta'),
  bonusFirstClearXp: z.number().int().min(0).max(200).describe('Bono la primera vez que se completa'),
  bonusPaceXp: z.number().int().min(0).max(200).describe('Bono por terminar por debajo del tiempo estimado'),

  /* --- niveles -------------------------------------------------------------------------------- */
  levelBase: z.number().int().min(10).max(500).describe('XP para pasar del nivel 1 al 2'),
  levelStep: z.number().int().min(1).max(200).describe('Incremento lineal por nivel'),
  levelExponent: z.number().min(1).max(2.5).describe('Exponente de la curva'),
  levelCap: z.number().int().min(50).max(2000).describe('Techo de XP por nivel'),
  maxLevel: z.number().int().min(5).max(100),

  /* --- corazones ------------------------------------------------------------------------------ */
  maxHearts: z.number().int().min(0).max(10).describe('0 apaga los corazones globalmente'),
  heartRefillMinutes: z.number().int().min(1).max(240).describe('Minutos por corazón recuperado'),
  heartsByLessonKind: z
    .object({
      learn: z.boolean(),
      practice: z.boolean(),
      test: z.boolean(),
      story: z.boolean(),
      checkpoint: z.boolean(),
    })
    .describe('En qué tipos de lección se descuentan corazones'),

  /* --- gemas y tienda ------------------------------------------------------------------------- */
  gemsPerfectLesson: z.number().int().min(0).max(100),
  gemsPerQuest: z.number().int().min(0).max(100),
  gemsLevelUp: z.number().int().min(0).max(200),
  priceHeartRefill: z.number().int().min(0).max(1000),
  priceStreakFreeze: z.number().int().min(0).max(1000),
  priceUnlimitedHearts: z.number().int().min(0).max(2000),

  /* --- ligas ---------------------------------------------------------------------------------- */
  leagueRoomSize: z.number().int().min(5).max(50),
  leaguePromote: z.number().int().min(1).max(20),
  leagueDemote: z.number().int().min(0).max(20),

  /**
   * Interruptor DECLARADO de generosidad.
   *
   * El default de una maqueta es tunear como si hubiera usuarios reales, o dejar 0 gemas "porque es lo
   * realista" y que la tienda se vea vacía en la demo. Aquí es una perilla con etiqueta, y el guion de demo
   * la menciona en voz alta al abrir la tienda.
   */
  generosity: z.enum(['sales', 'realistic']),
});

export type EconomyConfig = z.output<typeof economySchema>;

export const DEFAULT_ECONOMY: EconomyConfig = economySchema.parse({
  version: 1,
  xpBase: 4,
  difficultyFactor: [0.9, 1.0, 1.15, 1.3, 1.5],
  comboTiers: [
    { at: 0, mult: 1 },
    { at: 3, mult: 1.25 },
    { at: 5, mult: 1.5 },
    { at: 8, mult: 1.75 },
    { at: 12, mult: 2 },
  ],
  replayXpFactor: 0.5,
  hintXpFactor: 0.75,
  bonusPerfectXp: 15,
  bonusFirstClearXp: 10,
  bonusPaceXp: 5,
  levelBase: 60,
  levelStep: 14,
  levelExponent: 1.35,
  levelCap: 420,
  maxLevel: 30,
  maxHearts: 5,
  heartRefillMinutes: 30,
  // Las lecciones de aprender y de historia NO gastan vidas: el muro de corazones en capacitación
  // obligatoria no monetiza, genera tickets a Recursos Humanos.
  heartsByLessonKind: { learn: false, practice: true, test: true, story: false, checkpoint: true },
  gemsPerfectLesson: 5,
  gemsPerQuest: 10,
  gemsLevelUp: 20,
  priceHeartRefill: 90,
  priceStreakFreeze: 200,
  priceUnlimitedHearts: 350,
  leagueRoomSize: 30,
  leaguePromote: 7,
  leagueDemote: 5,
  generosity: 'sales',
});

/** Multiplicador vigente para una racha de aciertos. */
export function comboMultiplier(econ: EconomyConfig, run: number): number {
  let mult = 1;
  for (const tier of econ.comboTiers) {
    if (run >= tier.at) mult = tier.mult;
  }
  return mult;
}

/**
 * Curva de niveles: potencia con techo lineal.
 *
 * La exponencial ×1.3 por nivel que copia todo el mundo pide 414,000 XP para el nivel 30 con una base de 60:
 * cuarenta veces todo el contenido del despacho. El usuario semilla quedaría clavado en el nivel 9 y el
 * medidor de XP no se movería nunca durante la demo. Lineal puro es el otro default y mata el techo: llegar
 * al 30 se sentiría igual que llegar al 3.
 */
export function xpToNextLevel(econ: EconomyConfig, level: number): number {
  const raw = Math.round(econ.levelBase + econ.levelStep * Math.pow(Math.max(0, level - 1), econ.levelExponent));
  return Math.min(Math.max(raw, econ.levelBase), econ.levelCap);
}

/** Tabla de prefijos acumulados. Se calcula una vez por versión de configuración. */
export function levelThresholds(econ: EconomyConfig): readonly number[] {
  const out: number[] = [0];
  let acc = 0;
  for (let level = 1; level < econ.maxLevel; level += 1) {
    acc += xpToNextLevel(econ, level);
    out.push(acc);
  }
  return out;
}

export function levelAt(thresholds: readonly number[], totalXp: number): number {
  let lo = 0;
  let hi = thresholds.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const threshold = thresholds[mid];
    if (threshold !== undefined && totalXp >= threshold) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}
