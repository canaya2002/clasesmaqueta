/**
 * Configuración de la paleta de SENDA.
 *
 * REGLA CENTRAL: el número del escalón es un CONTRATO DE CONTRASTE, no una etiqueta de intensidad.
 * Cada paso declara su objetivo numérico y `scripts/emit-tokens.mts` resuelve el hex por búsqueda binaria
 * sobre la luminosidad, conservando el tono del hex semilla. Por eso la paleta es correcta por construcción
 * y no por buen ojo — y por eso el mismo algoritmo sirve para el white-label con un hex arbitrario.
 *
 * El paso -500 es el ÚNICO sin contrato: es el color de firma, solo relleno grande. Marcar explícitamente
 * el escalón que no se puede prometer es lo que hace creíbles los otros cinco.
 */

export const SURFACE = {
  light: {
    paper: '#FFFFFF',
    canvas: '#F7F5FF',
    ink900: '#16121F',
    ink700: '#3A3350',
    ink500: '#6B6480',
    line200: '#E6E1F5',
    line400: '#BCB0DE',
  },
  dark: {
    paper: '#1A1428',
    canvas: '#100C1B',
    paperRaised: '#2A2140',
    ink900: '#F4F1FF',
    ink700: '#CFC9E6',
    ink500: '#9FA0BF',
    line200: '#2E2542',
    line300: '#3F3358',
    lineStrong: '#6E6090',
  },
} as const;

export type StepName = '300' | '400' | '500' | '600' | '700' | '800';

export const STEP_ROLE: Readonly<Record<StepName, string>> = {
  '300': 'tinte de fondo — sostiene texto tinta a >=14:1',
  '400': 'texto sobre papel oscuro — >=7:1, con margen para OLED',
  '500': 'color de firma, relleno grande — SIN contrato de contraste',
  '600': 'relleno que acepta texto blanco — >=4.5:1',
  '700': 'texto sobre papel claro — >=5.5:1',
  '800': 'extremo oscuro — texto sobre tinte y trazo de énfasis, >=9:1 sobre papel',
};

export type Seed =
  | { readonly kind: 'hex'; readonly hex: string }
  | { readonly kind: 'lch'; readonly l: number; readonly c: number; readonly h: number };

export interface FamilyConfig {
  readonly name: string;
  /** Escalones con hex fijado por la especificación. No se derivan: se respetan literalmente. */
  readonly pinned: Readonly<Partial<Record<StepName, string>>>;
  /** De dónde salen el tono y el croma base de la familia. */
  readonly seed: Seed;
  /** Qué escalón es la CARA del botón: define contra qué se mide la sombra -800. */
  readonly faceStep: StepName;
  readonly note: string;
}

export const FAMILIES: readonly FamilyConfig[] = [
  {
    name: 'brand',
    // La especificación fija los dos: #6C4CF1 como -600 y #5334D8 como -700.
    // Ninguno de los dos puede ser la sombra sólida: solo separan 1.38:1 (ver DECISIONS.md D5).
    pinned: { '600': '#6C4CF1', '700': '#5334D8' },
    seed: { kind: 'hex', hex: '#6C4CF1' },
    faceStep: '600',
    note: 'violeta eléctrico — CTA primario, camino activo. El único cromático que puede ser texto.',
  },
  {
    name: 'grape',
    // No viene de la especificación: sustituye a `lime` como color de sección (DECISIONS.md D7/R11),
    // porque un admin no debe poder publicar un camino ilegible. Tono elegido para separarse de
    // brand (violeta) y coral (rosa) por al menos 25 grados.
    pinned: {},
    seed: { kind: 'lch', l: 0.68, c: 0.21, h: 322 },
    faceStep: '500',
    note: 'sección — reemplaza a lime en el enum de paleta de sección.',
  },
  {
    name: 'lime',
    pinned: { '500': '#B6F03C' },
    seed: { kind: 'hex', hex: '#B6F03C' },
    faceStep: '500',
    note: 'acento, XP, destellos. Cara del botón de éxito, con etiqueta TINTA (13.61:1).',
  },
  {
    name: 'mint',
    pinned: { '500': '#3DD68C' },
    seed: { kind: 'hex', hex: '#3DD68C' },
    faceStep: '500',
    note: 'correcto. Como TEXTO de estado usa el -700; el relleno no admite texto blanco.',
  },
  {
    name: 'coral',
    pinned: { '500': '#FF5470' },
    seed: { kind: 'hex', hex: '#FF5470' },
    faceStep: '500',
    note: 'incorrecto, corazones.',
  },
  {
    name: 'amber',
    pinned: { '500': '#FFB020' },
    seed: { kind: 'hex', hex: '#FFB020' },
    faceStep: '500',
    note: 'racha, cofres, oro.',
  },
  {
    name: 'sky',
    pinned: { '500': '#38BDF8' },
    seed: { kind: 'hex', hex: '#38BDF8' },
    faceStep: '500',
    note: 'gemas, audio.',
  },
];

/** Croma relativo al de la semilla, por escalón. */
export const CHROMA_SCALE: Readonly<Record<StepName, number>> = {
  '300': 0.55,
  '400': 0.8,
  '500': 1,
  '600': 1,
  '700': 0.95,
  '800': 0.85,
};

/** Umbral de deslumbramiento en OLED: por encima de esto, un relleno extenso se remapea en tema oscuro. */
export const DARK_FILL_MAX_CONTRAST = 9;

/** Colores de cliente de referencia para probar el white-label. */
export const WHITE_LABEL_PROBES: readonly string[] = [
  '#6C4CF1', // el propio violeta de SENDA
  '#FFD400', // amarillo puro: el caso que rompe los pickers que fuerzan texto blanco
  '#E11D48', // rosa fuerte
  '#0F766E', // verde petróleo
  '#1B2A6B', // azul marino muy oscuro
  '#FF6B00', // naranja
  '#111111', // casi negro
  '#B6F03C', // lima: el caso claro extremo
  '#22D3EE', // cian
];
