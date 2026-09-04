import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Cero red en runtime: no hay dominios de imagen remota permitidos, a propósito.
  images: { remotePatterns: [] },
  eslint: {
    // `pnpm verify` corre eslint por separado con la flat config completa;
    // el lint de `next build` usaría un subconjunto y duplicaría el tiempo.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Igual: `pnpm typecheck` es la puerta, y corre antes que el build en `verify`.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
