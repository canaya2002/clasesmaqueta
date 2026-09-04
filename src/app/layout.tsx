import type { Metadata, Viewport } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import { MotionRoot } from '@/design/MotionRoot';
import './globals.css';
import '@/design/mascot.tokens.css';

/**
 * Dos familias variables, auto-hospedadas, solo el eje `wght`.
 *
 * `subsets: ['latin']` únicamente: es-MX no necesita `latin-ext` (á é í ó ú ñ ü ¿ ¡ están en latin), y
 * descartarlo ahorra peso real. Sin itálicas: SENDA no usa cursivas en ningún lugar del sistema, y la cara
 * itálica de Nunito son ~26 KB que nadie vería. `adjustFontFallback` en su valor por defecto genera el
 * @font-face de respaldo con `size-adjust` calculado, que es lo que lleva el CLS a 0.
 */
const fredoka = Fredoka({
  subsets: ['latin'],
  // SIN `weight`: pedir pesos concretos hace que next/font descargue una INSTANCIA ESTÁTICA por peso.
  // Con tres pesos por familia salen 8 archivos y 176 KB — el presupuesto lo cazó en la primera medición.
  // Omitirlo trae la fuente VARIABLE: un archivo por familia y el eje wght completo.
  display: 'swap',
  variable: '--font-fredoka',
  fallback: ['ui-rounded', 'system-ui', '-apple-system', 'sans-serif'],
});

const nunito = Nunito({
  subsets: ['latin'],
  // `style: ['normal']` a propósito: la cara itálica variable de Nunito son ~26 KB que SENDA no usa en
  // ningún lugar del sistema.
  style: ['normal'],
  display: 'swap',
  variable: '--font-nunito',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
});

export const metadata: Metadata = {
  title: { default: 'SENDA', template: '%s · SENDA' },
  description: 'Plataforma de aprendizaje gamificada para equipos.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F5FF' },
    { media: '(prefers-color-scheme: dark)', color: '#100C1B' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Script inline de arranque. Se ejecuta ANTES del primer paint para que el tema, la marca y el estado de
 * la racha no parpadeen. Presupuesto declarado: 1.0 KB minificado, verificado en CI
 * (`pnpm inline-size`). Nada que no afecte al PRIMER paint entra aquí.
 */
const BOOT_SCRIPT = `(function(){try{
var d=document.documentElement;
var raw=localStorage.getItem('senda:v1:boot-digest');
var b=raw?JSON.parse(raw):null;
if(b&&b.theme&&b.theme!=='system')d.setAttribute('data-theme',b.theme);
if(b&&b.streak)d.setAttribute('data-streak',b.streak);else d.setAttribute('data-streak','cold');
if(b&&typeof b.brandHue==='number')d.style.setProperty('--brand-h',String(b.brandHue));
if('scrollRestoration' in history)history.scrollRestoration='manual';
}catch(e){d.setAttribute('data-streak','cold');}})();`;

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="es-MX" className={`${fredoka.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <MotionRoot>{children}</MotionRoot>
      </body>
    </html>
  );
}
