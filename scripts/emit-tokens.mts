/**
 * Genera `src/design/tokens.generated.css` desde el algoritmo de rampas.
 *
 * La paleta NO se escribe a mano. Se resuelve por búsqueda binaria sobre la luminosidad contra objetivos de
 * contraste declarados, y este script escribe el resultado con el ratio medido en un comentario al lado de
 * cada token. Correr `pnpm tokens` es reproducible: mismo input, mismo output, bit a bit.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contrast, contrastFloor2, hexToOklch, solveLightness } from '../src/design/color.ts';
import { darkFillOverride, deriveBrand, resolveFamily, solveShadow, STEPS } from '../src/design/ramp.ts';
import { FAMILIES, STEP_ROLE, SURFACE, WHITE_LABEL_PROBES } from '../src/design/palette.config.ts';

const L = SURFACE.light;
const D = SURFACE.dark;

const f2 = (n: number): string => n.toFixed(2);
const lines: string[] = [];
const report: string[] = [];

lines.push('/* ============================================================================');
lines.push(' * GENERADO POR `pnpm tokens` — NO EDITAR A MANO.');
lines.push(' * Fuente: src/design/palette.config.ts + src/design/ramp.ts');
lines.push(' *');
lines.push(' * Cada valor lleva el contraste MEDIDO sobre el hex resultante, no el prometido.');
lines.push(' * El número del escalón es un contrato de contraste, no una etiqueta de intensidad:');
for (const step of STEPS) lines.push(` *   -${step}: ${STEP_ROLE[step]}`);
lines.push(' * ========================================================================== */');
lines.push('');
lines.push(':root {');

const darkOverrides: string[] = [];
const darkShadows: string[] = [];

for (const family of FAMILIES) {
  const resolved = resolveFamily(family);
  const seedHex =
    family.seed.kind === 'hex'
      ? family.seed.hex
      : (resolved.find((r) => r.step === '500')?.hex ?? L.paper);
  const hue = hexToOklch(seedHex).h;

  lines.push('');
  lines.push(`  /* --- ${family.name} · tono ${hue.toFixed(1)}° · ${family.note} */`);
  report.push(`\n${family.name.toUpperCase()}  (tono ${hue.toFixed(1)}°)`);

  const face = resolved.find((r) => r.step === family.faceStep);

  for (const r of resolved) {
    const tag = r.source === 'pinned' ? 'FIJADO' : r.source === 'fallback' ? 'FALLBACK' : '';
    lines.push(
      `  --${family.name}-${r.step}: ${r.hex};` +
        ` /* ${f2(r.measured)}:1 vs ${r.against}${tag ? ` · ${tag}` : ''} */`,
    );
    report.push(
      `  -${r.step}  ${r.hex}  ${f2(r.measured).padStart(6)}:1 vs ${r.against.padEnd(26)} ${tag}`,
    );
  }

  // Orden de la rampa. Los cinco hexes de firma de la especificación son colores MUY claros y no caben
  // en la posición 500 de una rampa monótona: lima tiene Y=0.726 y el tinte -300 vive cerca del blanco.
  // No se esconde: se detecta y se documenta, escalón por escalón.
  const inversions: string[] = [];
  for (let i = 1; i < resolved.length; i += 1) {
    const prev = resolved[i - 1];
    const cur = resolved[i];
    if (prev === undefined || cur === undefined) continue;
    if (hexToOklch(cur.hex).l >= hexToOklch(prev.hex).l) {
      inversions.push(`-${prev.step} → -${cur.step}`);
    }
  }
  if (inversions.length > 0) {
    lines.push(
      `  /* NOTA de orden: ${inversions.join(', ')} no decrecen en luminosidad.` +
        ` El hex de firma de la especificación es más claro que su vecino; el número del escalón es un` +
        ` contrato de contraste, no una escala de intensidad. Ningún componente escribe un escalón numerado. */`,
    );
    report.push(`  ORDEN: inversión en ${inversions.join(', ')} (esperado: el -500 de firma es muy claro)`);
  }

  // La sombra sólida como relación con la cara, no como escalón. Se verifica la banda [1.9, 2.7].
  if (face) {
    const sh = solveShadow(face.hex, 1.9);
    const verdict = sh.separation >= 1.9 && sh.separation <= 2.7 ? 'OK' : sh.separation > 2.7 ? 'DEMASIADA' : 'INSUFICIENTE';
    lines.push(
      `  --${family.name}-shadow: ${sh.hex};` +
        ` /* sombra sólida de la cara -${family.faceStep} · separación ${f2(sh.separation)}:1 → ${verdict} */`,
    );
    report.push(
      `  sombra ${sh.hex} bajo la cara -${family.faceStep} = ${f2(sh.separation)}:1 → ${verdict} (banda 1.9–2.7)`,
    );
    // La cara puede estar remapeada en oscuro (los rellenos que deslumbran en OLED). La sombra se mide
    // contra la cara que realmente se pinta, no contra la del tema claro.
    const darkFace = darkFillOverride(face.hex) ?? face.hex;
    const shDark = solveShadow(darkFace, 2.6);
    const okDark = shDark.separation >= 2.6 && shDark.separation <= 3.4;
    darkShadows.push(
      `    --${family.name}-shadow: ${shDark.hex};` +
        ` /* ${f2(shDark.separation)}:1 en oscuro${okDark ? '' : ' · FUERA DE BANDA 2.6–3.4'} */`,
    );
  }

  // ¿Deslumbra el relleno en OLED? Si sí, el override oscuro no se elige: se resuelve.
  const fill = resolved.find((r) => r.step === family.faceStep);
  if (fill) {
    const override = darkFillOverride(fill.hex);
    const before = contrast(fill.hex, D.canvas);
    if (override !== null) {
      const after = contrast(override, D.canvas);
      darkOverrides.push(
        `    --${family.name}-${family.faceStep}: ${override};` +
          ` /* relleno extenso en oscuro: ${f2(before)}:1 deslumbraba → ${f2(after)}:1 */`,
      );
      report.push(
        `  oscuro: relleno remapeado ${fill.hex} → ${override} (${f2(before)}:1 → ${f2(after)}:1)`,
      );
    }
  }
}

lines.push('');
lines.push('  /* --- tinta que NO voltea con el tema ------------------------------------------------');
lines.push('   * `--ink-900` es un token de TEMA: en oscuro vale #F4F1FF. Usarlo como "tinta sobre relleno');
lines.push('   * claro" produce texto casi blanco sobre un menta claro en cuanto se cambia de tema. Todo rol');
lines.push('   * del tipo "on-fill" usa estos dos, que valen lo mismo en los dos temas. */');
lines.push(`  --ink-fixed: ${L.ink900};`);
lines.push(`  --paper-fixed: ${L.paper};`);
lines.push('');
lines.push('  /* --- superficies y tinta, tema claro --- */');
lines.push(`  --paper: ${L.paper};`);
lines.push(`  --canvas: ${L.canvas};`);
lines.push(`  --ink-900: ${L.ink900}; /* ${f2(contrast(L.ink900, L.paper))}:1 vs papel */`);
lines.push(`  --ink-700: ${L.ink700}; /* ${f2(contrast(L.ink700, L.paper))}:1 vs papel */`);
lines.push(`  --ink-500: ${L.ink500}; /* ${f2(contrast(L.ink500, L.paper))}:1 vs papel */`);
lines.push(`  --line-200: ${L.line200};`);
lines.push(`  --line-400: ${L.line400}; /* ${f2(contrast(L.line400, L.paper))}:1 vs papel — decorativo, NO borde de control */`);
// El borde de un control debe alcanzar 3:1 (WCAG 1.4.11). `--line-400` da 2.03:1 y no sirve para eso.
//
// Se resuelve contra el LIENZO, no contra el papel: el lienzo es la superficie más oscura de las dos, así
// que un borde que cumple ahí cumple también sobre papel. Resolverlo contra el papel daba 3.05:1 sobre
// papel y 2.84:1 sobre lienzo — un input dentro de una tarjeta pasaba y el mismo input sobre el fondo no.
const lineSeed = hexToOklch(L.line200);
const lineControl =
  solveLightness({
    hue: lineSeed.h,
    chroma: lineSeed.c * 1.6,
    satisfies: (hex) => contrast(hex, L.canvas) >= 3.05,
    prefer: 'lightest',
  }) ?? L.ink500;
lines.push(
  `  --line-control: ${lineControl}; /* ${f2(contrast(lineControl, L.paper))}:1 vs papel · ${f2(contrast(lineControl, L.canvas))}:1 vs lienzo — el único borde permitido en controles */`,
);
lines.push('}');
lines.push('');

const darkBody: string[] = [];
darkBody.push(`    --paper: ${D.paper};`);
darkBody.push(`    --canvas: ${D.canvas};`);
darkBody.push(`    --paper-raised: ${D.paperRaised}; /* ${f2(contrast(D.paperRaised, D.canvas))}:1 vs lienzo */`);
darkBody.push(`    --ink-900: ${D.ink900}; /* ${f2(contrast(D.ink900, D.paper))}:1 vs papel oscuro */`);
darkBody.push(`    --ink-700: ${D.ink700}; /* ${f2(contrast(D.ink700, D.paper))}:1 */`);
darkBody.push(
  `    --ink-500: ${D.ink500}; /* ${f2(contrast(D.ink500, D.paper))}:1 — el #6B6480 claro daba ${f2(contrast(L.ink500, D.paper))}:1 y FALLABA */`,
);
darkBody.push(`    --line-200: ${D.line200};`);
darkBody.push(`    --line-300: ${D.line300};`);
darkBody.push(
  `    --line-strong: ${D.lineStrong}; /* ${f2(contrast(D.lineStrong, D.paper))}:1 vs papel · ${f2(contrast(D.lineStrong, D.canvas))}:1 vs lienzo — único borde permitido en controles */`,
);
if (darkShadows.length > 0) {
  darkBody.push('');
  darkBody.push('    /* sombras sólidas: en oscuro la separación sube a 2.6–3.4, o leerían como halo */');
  for (const o of darkShadows) darkBody.push(o);
}
if (darkOverrides.length > 0) {
  darkBody.push('');
  darkBody.push('    /* rellenos extensos que deslumbran en OLED (umbral medido, no elegido) */');
  for (const o of darkOverrides) darkBody.push(o);
}

lines.push('/* Tema oscuro. El @media envuelve al selector, JAMÁS al revés: un selector con @media embebido');
lines.push('   es sintaxis inválida y el navegador descarta la regla completa. */');
lines.push('@media (prefers-color-scheme: dark) {');
lines.push('  :root:not([data-theme="light"]) {');
for (const l of darkBody) lines.push(`  ${l}`);
lines.push('  }');
lines.push('}');
lines.push('');
lines.push('/* Tercer bloque: el toggle explícito gana en ambos sentidos. */');
lines.push(':root[data-theme="dark"] {');
for (const l of darkBody) lines.push(l);
lines.push('}');
lines.push('');

const outPath = fileURLToPath(new URL('../src/design/tokens.generated.css', import.meta.url));
writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');

/* --------------------------------------------------- Reporte a stdout */

console.log('=== RAMPAS GENERADAS ===');
console.log(report.join('\n'));

console.log('\n=== ANILLO DE FOCO COMPUESTO ===');
const lime = resolveFamily(FAMILIES[2] as (typeof FAMILIES)[number]).find((r) => r.step === '500');
const limeHex = lime?.hex ?? '#B6F03C';
console.log(`  núcleo lima ${limeHex} vs papel claro : ${f2(contrast(limeHex, L.paper))}:1  (inservible solo)`);
console.log(`  núcleo lima vs casing ${L.ink900}      : ${f2(contrast(limeHex, L.ink900))}:1`);
console.log(`  casing vs papel claro                  : ${f2(contrast(L.ink900, L.paper))}:1`);
console.log(`  núcleo lima vs papel oscuro            : ${f2(contrast(limeHex, D.paper))}:1`);
// El invariante: para CUALQUIER superficie, al menos uno de los dos tonos supera 3:1.
let worst = Infinity;
let worstY = 0;
for (let i = 0; i <= 1000; i += 1) {
  const y = i / 1000;
  // construimos un gris con esa luminancia relativa aproximada
  const ch = y <= 0.0031308 ? 12.92 * y : 1.055 * Math.pow(y, 1 / 2.4) - 0.055;
  const v = Math.max(0, Math.min(255, Math.round(ch * 255)));
  const surface = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
  const best = Math.max(contrast(limeHex, surface), contrast(L.ink900, surface));
  if (best < worst) {
    worst = best;
    worstY = y;
  }
}
console.log(
  `  PEOR CASO sobre cualquier superficie   : ${f2(worst)}:1 (en Y≈${worstY.toFixed(4)}) → ${worst >= 3 ? 'CUMPLE 1.4.11' : 'FALLA'}`,
);

console.log('\n=== WHITE-LABEL: 9 colores de cliente de referencia ===');
console.log('  hex cliente   conservado  rótulo   ratio   CTA oscuro         ΔL');
for (const probe of WHITE_LABEL_PROBES) {
  const d = deriveBrand(probe);
  const onName = d.onBrand === L.paper ? 'blanco' : 'tinta ';
  console.log(
    `  ${probe}       ${d.seedPreserved ? 'sí ' : 'NO '}        ${onName}  ` +
      `${f2(d.onBrandRatio).padStart(5)}:1  -${d.darkCtaStep} ${f2(d.darkCtaRatio)}:1 vs papel  ` +
      `${d.adjustedDeltaL === 0 ? '—' : d.adjustedDeltaL.toFixed(2)}`,
  );
}

console.log(`\nEscrito: src/design/tokens.generated.css (${lines.length} líneas)`);
void contrastFloor2;
