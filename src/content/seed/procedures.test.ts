/**
 * Auditoría del contenido escrito a mano por unidad.
 *
 * El contenido generado se valida solo: si el corpus tiene tres distractores, el ejercicio los tiene. El
 * contenido ESCRITO no tiene esa red — y sus fallos son los caros, porque un hueco ambiguo o una secuencia
 * cuyos pasos se pueden intercambiar producen un ejercicio que parece bueno y no mide nada.
 */

import { describe, expect, it } from 'vitest';
import { UNITS } from './corpus';
import { EXTRAS, extrasFor } from './procedures';
import { normalizeAnswer } from '@/lib/text';

const slugs = UNITS.map((u) => u.slug);

describe('completitud', () => {
  it('las 26 unidades tienen contenido escrito', () => {
    const missing = slugs.filter((s) => EXTRAS[s] === undefined);
    expect(missing).toEqual([]);
  });

  it('no hay contenido escrito para unidades que no existen', () => {
    const orphans = Object.keys(EXTRAS).filter((k) => !slugs.includes(k));
    expect(orphans).toEqual([]);
  });
});

describe('secuencias', () => {
  it('tienen entre 4 y 6 pasos, todos distintos', () => {
    const bad: string[] = [];
    for (const slug of slugs) {
      const items = extrasFor(slug).procedureItems;
      if (items.length < 4 || items.length > 6) bad.push(`${slug}: ${String(items.length)} pasos`);
      if (new Set(items).size !== items.length) bad.push(`${slug}: pasos repetidos`);
    }
    expect(bad).toEqual([]);
  });

  it('ningún paso es tan largo que el ejercicio se vuelva lectura comparada', () => {
    // Seis fichas de quince palabras en un ejercicio de arrastrar no caben en un teléfono, y dejan de
    // medir "¿sabes el procedimiento?" para medir "¿lees rápido?".
    const bad: string[] = [];
    for (const slug of slugs) {
      for (const item of extrasFor(slug).procedureItems) {
        const words = item.split(' ').filter((w) => w.length > 0).length;
        if (words > 10) bad.push(`${slug}: "${item}" (${String(words)} palabras)`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('ningún paso apunta hacia atrás a otro paso', () => {
    // La forma repartida del mismo fraude. Escribir "resumir ESE motivo" o "transferir YA VERIFICADA la
    // identidad" hace que el orden se pueda reconstruir siguiendo las referencias entre fichas, sin saber
    // nada del trabajo. Una ficha tiene que ser una acción autocontenida; la justificación del orden vive
    // en `procedureWhy`, que se lee DESPUÉS de contestar.
    const BACKREF = /\b(?:ese|esa|esos|esas|dicho|dicha|mencionad[oa]s?|ya (?:confirmad|descartad|verificad|hech|asignad|liberad)[oa]s?|una vez)\b/iu;
    const bad: string[] = [];
    for (const slug of slugs) {
      for (const item of extrasFor(slug).procedureItems) {
        if (BACKREF.test(item)) bad.push(`${slug}: "${item}"`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('frases con hueco', () => {
  it('cada una tiene exactamente un hueco', () => {
    const bad: string[] = [];
    for (const slug of slugs) {
      for (const c of extrasFor(slug).cloze) {
        const marks = c.sentence.split('___').length - 1;
        if (marks !== 1) bad.push(`${slug}: ${String(marks)} huecos en "${c.sentence}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('la respuesta no aparece ya escrita en la propia frase', () => {
    // El fallo clásico del contenido con hueco: la frase regala la respuesta unas palabras antes. El
    // ejercicio se resuelve copiando y la métrica de recuerdo mide lectura.
    const bad: string[] = [];
    for (const slug of slugs) {
      for (const c of extrasFor(slug).cloze) {
        const canonical = (c.accepted[0] ?? '').toLocaleLowerCase('es-MX');
        if (canonical.length < 4) continue;
        const rest = c.sentence.toLocaleLowerCase('es-MX').replace('___', ' ');
        if (rest.includes(canonical)) bad.push(`${slug}: "${canonical}" ya está en "${c.sentence}"`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('la respuesta canónica es una o dos palabras', () => {
    const bad: string[] = [];
    for (const slug of slugs) {
      for (const c of extrasFor(slug).cloze) {
        const canonical = c.accepted[0] ?? '';
        const words = canonical.split(' ').filter((w) => w.length > 0).length;
        if (words === 0 || words > 2) bad.push(`${slug}: "${canonical}" (${String(words)} palabras)`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('no hay sinónimos que el calificador ya considere iguales', () => {
    // `normalizeAnswer` pliega acentos y mayúsculas ANTES de comparar, así que aceptar "jurídica" y
    // "juridica" no añade nada: es dato muerto que aparenta cobertura. Y peor, esconde el caso en que
    // alguien creyó añadir un sinónimo y añadió la misma palabra.
    const bad: string[] = [];
    for (const slug of slugs) {
      for (const c of extrasFor(slug).cloze) {
        const folded = c.accepted.map((a) => normalizeAnswer(a));
        if (new Set(folded).size !== folded.length) {
          bad.push(`${slug}: "${c.accepted.join(' / ')}" colapsa a ${new Set(folded).size} tras normalizar`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('cada hueco explica POR QUÉ esa palabra', () => {
    const bad: string[] = [];
    for (const slug of slugs) {
      for (const c of extrasFor(slug).cloze) {
        if (c.why.trim().length < 40) bad.push(`${slug}: "${c.why}"`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('explicaciones', () => {
  it('cada secuencia explica POR QUÉ ese orden', () => {
    const bad: string[] = [];
    for (const slug of slugs) {
      const why = extrasFor(slug).procedureWhy;
      if (why.trim().length < 45) bad.push(`${slug}: "${why}"`);
    }
    expect(bad).toEqual([]);
  });

  it('ningún paso delata su posición nombrando a OTRO paso de la misma secuencia', () => {
    // El matiz importa. "Preguntar el motivo antes de pedir datos personales" es legítimo: nombra la
    // dependencia operativa, que es justo lo que hace defendible el orden. "Registrar los desacuerdos
    // antes de firmar" NO lo es, porque "firmar" ES otro paso de esta misma secuencia: ancla la posición
    // sin que el alumno tenga que saber nada, y el ejercicio se resuelve leyendo las pistas.
    const REF = /\b(?:antes|después|despues) de (?:que )?([a-záéíóúñ]{5,})/giu;
    const POSITION = /\b(?:primero|por último|por ultimo|finalmente|al final|en primer lugar)\b/iu;
    const bad: string[] = [];

    for (const slug of slugs) {
      const items = extrasFor(slug).procedureItems;
      for (const [i, item] of items.entries()) {
        if (POSITION.test(item)) bad.push(`${slug}: "${item}" nombra su posición`);
        for (const m of item.matchAll(REF)) {
          const referenced = (m[1] ?? '').toLocaleLowerCase('es-MX');
          const stem = referenced.slice(0, 5);
          const elsewhere = items.some((other, j) => j !== i && other.toLocaleLowerCase('es-MX').includes(stem));
          if (elsewhere) bad.push(`${slug}: "${item}" apunta a "${referenced}", que es otro paso`);
        }
      }
    }

    expect(bad).toEqual([]);
  });
});
