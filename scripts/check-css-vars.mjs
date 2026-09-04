/**
 * Toda `var(--x)` sin respaldo tiene que existir.
 *
 * Una variable CSS inexistente NO falla: la propiedad se descarta y el elemento hereda. `color:
 * var(--fg-brand)` con esa variable mal escrita no pinta de rojo ni avisa en consola — pinta del color del
 * padre, que casi siempre se ve razonable. Así se colaron cinco tokens fantasma en la Fase 4, incluido el
 * color de marca del número de XP de la pantalla de recompensa.
 *
 * `var(--x, respaldo)` se permite: llevar respaldo es declarar que la variable puede no existir, y las que
 * escribe JavaScript en tiempo de ejecución (`--app-h`, `--kb-inset`) son justo ese caso.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(css|tsx?|mts)$/.test(entry)) files.push(p);
  }
})(ROOT);

/** Las inyecta `next/font` sobre <html>, fuera de cualquier hoja del repo. */
const EXTERNAL = new Set(['--font-fredoka', '--font-nunito']);

const defined = new Set(EXTERNAL);
for (const f of files.filter((f) => f.endsWith('.css'))) {
  const txt = readFileSync(f, 'utf8');
  // Cualquier `--x:` que no sea el primer argumento de un var(). tokens.css declara tres por línea.
  for (const m of txt.matchAll(/(?<!var\()(--[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
}

const missing = new Map();
for (const f of files) {
  const txt = readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/var\((--[a-z0-9-]+)\s*(,)?/g)) {
    if (m[2] !== undefined || defined.has(m[1])) continue;
    const at = (missing.get(m[1]) ?? new Set()).add(f);
    missing.set(m[1], at);
  }
}

if (missing.size > 0) {
  console.error(`check-css-vars: ${missing.size} variable(s) usadas sin definir y sin respaldo.\n`);
  for (const [name, where] of [...missing].sort()) {
    console.error(`  ${name}\n    ${[...where].join('\n    ')}`);
  }
  console.error('\nUsa el nombre real del token o añade un respaldo: var(--x, algo).');
  process.exit(1);
}
console.log(`check-css-vars: ${defined.size} definidas, ninguna referencia rota.`);
