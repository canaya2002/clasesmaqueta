#!/usr/bin/env node
/**
 * El script inline de arranque tiende a crecer: gate + tema + marca + racha + scrollRestoration, y cada
 * resolución futura le añade una línea hasta que bloquea el parseo del documento de forma medible.
 * Presupuesto declarado y verificado: nada que no afecte al PRIMER paint entra ahí.
 */
import { readFileSync } from 'node:fs';

const budgets = JSON.parse(readFileSync('perf/budgets.json', 'utf8'));
const layout = readFileSync('src/app/layout.tsx', 'utf8');
const m = /const BOOT_SCRIPT = `([\s\S]*?)`;/.exec(layout);

if (m === null) {
  console.error('No se encontró BOOT_SCRIPT en src/app/layout.tsx.');
  process.exit(1);
}

const minified = (m[1] ?? '').replace(/\n/g, '').replace(/\s{2,}/g, ' ');
const kb = Buffer.byteLength(minified, 'utf8') / 1024;
const limit = budgets.inlineBootScriptKb;
const ok = kb <= limit;

console.log(`script inline: ${kb.toFixed(2)} KB / ${limit.toFixed(2)} KB  ${ok ? 'OK' : 'EXCEDIDO'}`);
if (!ok) process.exit(1);
