import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Sin `@vitejs/plugin-react`: su versión 6.1.1 importa `vite/internal`, un subpath que Vite 7 no exporta,
 * y el plugin no aporta nada que esbuild no haga. El runtime JSX automático de esbuild cubre las pruebas
 * de componentes de la Fase 3 sin traer Fast Refresh, que en `vitest run` no se usa.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@senda/content': fileURLToPath(new URL('./src/content/index.ts', import.meta.url)),
    },
  },
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/lib/__tests__/setup.ts'],
  },
});
