#!/usr/bin/env node
/**
 * La identidad de SENDA son SOMBRAS SÓLIDAS. Un `box-shadow` con blur la contradice.
 *
 * La única excepción son los overlays que flotan sobre fondo arbitrario —modal, drawer, popover, command
 * palette, toast—, y esa excepción vive en un token con nombre (`--overlay-shadow`) para que aparezca en el
 * diff cuando alguien la use.
 *
 * Escribir la regla en el CONTRIBUTING y confiar en el revisor es lo que hace que en el PR 30 ya no se aplique.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN = ['src'];
const EXT = /\.(css|tsx|ts)$/;
const ALLOWED_FILES = new Set(['src/design/tokens.css']);
const ALLOWED_TOKENS = ['--overlay-shadow', '--edge-highlight', 'var(--e0', 'var(--e1', 'var(--e2', 'var(--e3', 'var(--e4'];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(entry)) out.push(full);
  }
  return out;
}

const violations = [];

for (const file of SCAN.flatMap((d) => walk(join(ROOT, d)))) {
  const rel = relative(ROOT, file);
  if (ALLOWED_FILES.has(rel)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const m = /(box-shadow|boxShadow)\s*[:=]\s*([^;,\n]*(?:,[^;\n]*)*)/.exec(line);
    if (m === null) return;
    const value = m[2] ?? '';
    if (ALLOWED_TOKENS.some((t) => value.includes(t))) return;
    // Un box-shadow sólido tiene exactamente offset-x, offset-y, spread (blur = 0 o ausente en 3ª posición).
    const numbers = value.match(/-?\d*\.?\d+px/g) ?? [];
    const blur = numbers[2];
    if (blur !== undefined && Number.parseFloat(blur) !== 0) {
      violations.push(`${rel}:${i + 1}  blur ${blur} en \`${line.trim().slice(0, 90)}\``);
    }
  });
}

if (violations.length > 0) {
  console.error('Sombras con blur fuera de los overlays autorizados:\n');
  for (const v of violations) console.error(`  ${v}`);
  console.error(`\n${violations.length} violación(es). La sombra sólida es la identidad del producto.`);
  process.exit(1);
}
console.log('check-solid-shadows: sin hallazgos.');
