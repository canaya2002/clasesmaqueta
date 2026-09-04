// @ts-check
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

/**
 * SENDA — flat config (ESLint 9).
 *
 * Aquí no hay reglas de estilo: hay INVARIANTES. Cada bloque de `no-restricted-*` convierte una promesa
 * del plan en un error de compilación, porque una convención escrita en el README no sobrevive a la fase 8
 * con prisa.
 *
 * Nota de por qué es flat config y no `.eslintrc`: un diseño anterior escribió las mismas reglas en un
 * `.eslintrc.clock.cjs` con `module.exports` y `overrides`. ESLint 9 nunca carga ese archivo, así que todas
 * sus garantías de determinismo eran decorativas.
 */

const DETERMINISM = [
  {
    selector: "MemberExpression[object.name='Date'][property.name='now']",
    message: 'Usa clock.now() / clock.nowReal(). Date.now rompe la reproducibilidad de la demo.',
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'Usa clock.now(). `new Date()` sin argumentos rompe la reproducibilidad de la demo.',
  },
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: 'Usa el rng sembrado. Math.random hace que la demo no sea idéntica en cada máquina.',
  },
  {
    selector: "MemberExpression[object.name='performance'][property.name='now']",
    message: 'performance.now() solo en src/lib/clock.ts, que es el dueño del reloj monótono.',
  },
  {
    selector: "MemberExpression[object.name='crypto'][property.name='randomUUID']",
    message: 'Usa mintId() del motor: los ids deben ser deterministas.',
  },
  {
    selector: 'CallExpression[callee.property.name=/^toLocale(Date|Time)String$/]',
    message: 'Usa el formateador centralizado con date-fns y locale es: toLocaleDateString varía por equipo.',
  },
  {
    selector: "Identifier[name='localStorage']",
    message: 'Todo acceso a almacenamiento pasa por src/mock/persist.ts (presupuesto y desalojo).',
  },
  {
    selector: "Identifier[name='sessionStorage']",
    message: 'Todo acceso a almacenamiento pasa por src/mock/persist.ts.',
  },
];

const MOTION_DISCIPLINE = [
  {
    selector: "JSXAttribute[name.name='transition']",
    message:
      'Ningún transition inline: usa un spring nombrado de design/motion.ts vía useSpringT() o un variant.',
  },
  {
    selector: "JSXAttribute[name.name='style'] Property[key.name=/^transition/]",
    message: 'Ningún transition inline en style: la duración vive en design/motion.ts.',
  },
];

const NO_CASTS = [
  {
    selector: "TSAsExpression:not([typeAnnotation.typeName.name='const'])",
    message:
      'Cero casts. Un tipo marcado se produce por parse (Zod .brand) o por su fábrica; `as const` es la única excepción.',
  },
];

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'src/design/tokens.generated.css'] },

  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: { 'react-hooks': reactHooks, import: importPlugin },
    rules: {
      ...reactHooks.configs.recommended.rules,

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-syntax': ['error', ...DETERMINISM, ...MOTION_DISCIPLINE, ...NO_CASTS],

      // La frontera del "paquete": src/content es reutilizable, y eso se COMPRUEBA con pnpm lint en vez
      // de por revisión humana. Es lo que se compra del monorepo sin pagar su tooling.
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/content',
              from: './src/app',
              message: 'src/content es el paquete reutilizable: no puede depender de las rutas.',
            },
            {
              target: './src/content',
              from: './src/mock',
              message: 'src/content no puede depender de la capa mock: el motor recibe datos, no los busca.',
            },
            {
              target: './src/content',
              from: './src/components',
              message: 'src/content no puede depender de los componentes de la app.',
            },
            {
              target: './src/content/engine',
              from: './src/content/dynamics',
              message: 'El motor no conoce las dinámicas concretas: solo el registro.',
            },
            {
              target: './src/app',
              from: './src/mock/seed.ts',
              message: 'La UI nunca importa el seed: solo habla con mock/repo/*.',
            },
            {
              target: './src/components',
              from: './src/mock/seed.ts',
              message: 'La UI nunca importa el seed: solo habla con mock/repo/*.',
            },
          ],
        },
      ],

      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'motion/react',
              message:
                'motion solo se importa desde src/design/**. Los componentes piden variants con useVariants().',
            },
            {
              name: 'canvas-confetti',
              message: 'canvas-confetti solo desde src/design/fx.ts, que es quien lo degrada.',
            },
          ],
        },
      ],
    },
  },

  /* --- dueños declarados de cada invariante ------------------------------------------------------ */

  {
    // El dueño del reloj. Es el único que puede tocar Date y performance.
    files: ['src/lib/clock.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...MOTION_DISCIPLINE, ...NO_CASTS],
    },
  },
  {
    // El dueño del almacenamiento.
    files: ['src/mock/persist.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...DETERMINISM.filter((r) => !r.selector.includes('Storage')),
        ...MOTION_DISCIPLINE,
        ...NO_CASTS,
      ],
    },
  },
  {
    // El sistema de movimiento: aquí SÍ se escriben transitions, porque este es el sitio donde viven.
    files: ['src/design/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...DETERMINISM, ...NO_CASTS],
      'no-restricted-imports': 'off',
    },
  },
  {
    // El rig de la mascota consume springs del sistema y los pasa a motion; no define duraciones nuevas.
    files: ['src/components/game/mascot/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...DETERMINISM, ...NO_CASTS],
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/lib/__tests__/**', 'src/mock/__tests__/**'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    // Los .mjs de configuración no están en el programa de TypeScript, así que no se tipan.
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-restricted-syntax': 'off', 'no-console': 'off' },
  },
  {
    files: ['scripts/**/*.{mjs,mts}', '*.config.{ts,mjs}'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-restricted-syntax': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
);
