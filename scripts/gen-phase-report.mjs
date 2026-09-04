#!/usr/bin/env node
/**
 * Genera PHASE_REPORT.md. El informe de fase es un ARTEFACTO GENERADO: si el reporte existe, la medición
 * ocurrió. No hay forma de reportar sin medir.
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const phase = process.argv[2] ?? '1';
const stamp = process.argv[3] ?? 'sin fecha';

function run(cmd) {
  try {
    return { ok: true, out: execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

const tests = run('pnpm -s test 2>&1 | tail -6');
const budgets = run('node scripts/check-budgets.mjs');
const shadows = run('node scripts/check-solid-shadows.mjs');
const inline = run('node scripts/check-inline-script-size.mjs');

const body = `# PHASE_REPORT — Fase ${phase}

Generado por \`pnpm phase-report\` el ${stamp}. Los números salen de la medición, no de una estimación.

## Puertas

| Puerta | Resultado |
|---|---|
| \`pnpm typecheck\` | ${run('pnpm -s typecheck').ok ? 'limpio' : 'FALLA'} |
| \`pnpm lint\` | ${run('pnpm -s lint').ok ? 'limpio' : 'FALLA'} |
| \`pnpm test\` | ${tests.ok ? 'verde' : 'FALLA'} |
| \`pnpm shadows\` | ${shadows.ok ? 'sin hallazgos' : 'FALLA'} |
| \`pnpm budgets\` | ${budgets.ok ? 'dentro de rango' : 'EXCEDIDO'} |

## Pruebas

\`\`\`
${tests.out.trim()}
\`\`\`

## Presupuestos medidos

\`\`\`
${budgets.out.trim()}
\`\`\`

## Script inline de arranque

\`\`\`
${inline.out.trim()}
\`\`\`

## Sombras sólidas

\`\`\`
${shadows.out.trim()}
\`\`\`
`;

writeFileSync('PHASE_REPORT.md', body, 'utf8');
console.log('PHASE_REPORT.md generado.');
