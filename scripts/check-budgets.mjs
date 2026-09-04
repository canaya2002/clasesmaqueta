#!/usr/bin/env node
/**
 * Compara el build real contra `perf/budgets.json` y SALE CON CÓDIGO 1.
 *
 * Escribir los números en el README y confiar es lo que hace que nadie los mida. Aquí el informe de fase
 * es un artefacto generado: si el reporte existe, la medición ocurrió.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const budgets = JSON.parse(readFileSync('perf/budgets.json', 'utf8'));
const NEXT = '.next';

if (!existsSync(NEXT)) {
  console.error('No hay build. Corre `pnpm build` antes de `pnpm budgets`.');
  process.exit(1);
}

function gzipKb(file) {
  if (!existsSync(file)) return 0;
  return gzipSync(readFileSync(file)).length / 1024;
}

const rows = [];
let failed = 0;

/* --- JS por ruta ---------------------------------------------------------------------------- */
const manifestPath = join(NEXT, 'app-build-manifest.json');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const [route, limit] of Object.entries(budgets.firstLoadJsGzipKb)) {
    const key = route === '/' ? '/page' : `${route}/page`;
    // Las rutas viven bajo grupos —(marketing), (app), (player)— que NO aparecen en la URL. Buscar la
    // clave exacta y rendirse deja el presupuesto midiendo 0 KB, que es peor que no tenerlo: queda verde
    // para siempre y nadie se entera de que dejo de medir.
    const suffix = key;
    const match =
      manifest.pages[key] ??
      Object.entries(manifest.pages).find(([k]) => k.replace(/\/\([^)]*\)/g, '') === suffix)?.[1];
    if (match === undefined) {
      console.error(`check-budgets: la ruta ${route} no existe en el manifiesto. Presupuesto sin medir.`);
      failed += 1;
      rows.push({ metric: `First Load JS ${route}`, measured: 'SIN MEDIR', budget: `${limit} KB`, delta: '—', verdict: 'ERROR' });
      continue;
    }
    const unique = [...new Set(match)];
    const kb = unique.reduce((sum, f) => sum + gzipKb(join(NEXT, f)), 0);
    const ok = kb <= limit && kb > 0;
    if (!ok) failed += 1;
    rows.push({ metric: `First Load JS ${route}`, measured: `${kb.toFixed(1)} KB`, budget: `${limit} KB`, delta: `${(kb - limit).toFixed(1)} KB`, verdict: ok ? 'OK' : 'EXCEDIDO' });
  }
}

/* --- fuentes ---------------------------------------------------------------------------------
 *
 * Se mide lo que el NAVEGADOR PIDE, no lo que hay en disco.
 *
 * `subsets: ['latin']` en next/font controla qué rangos se PRECARGAN, no qué archivos se guardan: Next
 * conserva los @font-face de todos los rangos que Google publica (cirílico, hebreo, vietnamita, math) para
 * que un glifo inesperado siga renderizando. Esos archivos existen en disco y el navegador nunca los pide,
 * porque su `unicode-range` no aparece en la página.
 *
 * Los archivos precargados llevan el sufijo `-s.p.woff2`. Ese es el coste real del primer paint, y es el
 * único que tiene sentido presupuestar. La primera versión de este script sumaba los 8 archivos y reportaba
 * 176 KB de "coste" que nadie paga. */
const mediaDir = join(NEXT, 'static', 'media');
let preloadKb = 0;
let preloadCount = 0;
let onDemandKb = 0;
let onDemandCount = 0;
if (existsSync(mediaDir)) {
  for (const f of readdirSync(mediaDir).filter((x) => x.endsWith('.woff2'))) {
    const kb = statSync(join(mediaDir, f)).size / 1024;
    if (f.includes('-s.p.')) {
      preloadKb += kb;
      preloadCount += 1;
    } else {
      onDemandKb += kb;
      onDemandCount += 1;
    }
  }
}
const fontOk = preloadKb <= budgets.fontsPreloadedWoff2Kb && preloadKb > 0;
if (!fontOk) failed += 1;
rows.push({
  metric: `Fuentes precargadas (${preloadCount} archivos)`,
  measured: `${preloadKb.toFixed(1)} KB`,
  budget: `${budgets.fontsPreloadedWoff2Kb} KB`,
  delta: `${(preloadKb - budgets.fontsPreloadedWoff2Kb).toFixed(1)} KB`,
  verdict: fontOk ? 'OK' : 'EXCEDIDO',
});
rows.push({
  metric: `  (bajo demanda, no se piden: ${onDemandCount})`,
  measured: `${onDemandKb.toFixed(1)} KB`,
  budget: '—',
  delta: '—',
  verdict: 'informativo',
});

const width = { metric: 34, measured: 12, budget: 10, delta: 11 };
console.log('\nmétrica'.padEnd(width.metric) + 'medido'.padStart(width.measured) + 'presupuesto'.padStart(width.budget + 2) + 'delta'.padStart(width.delta) + '   veredicto');
console.log('-'.repeat(84));
for (const r of rows) {
  console.log(
    r.metric.padEnd(width.metric) +
      r.measured.padStart(width.measured) +
      r.budget.padStart(width.budget + 2) +
      r.delta.padStart(width.delta) +
      '   ' + r.verdict,
  );
}
console.log('');

if (failed > 0) {
  console.error(`${failed} presupuesto(s) excedido(s).`);
  process.exit(1);
}
console.log('Todos los presupuestos dentro de rango.');
