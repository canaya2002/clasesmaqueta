/**
 * SENDA — normalizacion de texto en es-MX.
 *
 * La linea que todo el mundo copia de Stack Overflow —NFD y borrar el rango de diacriticos— destruye la ene,
 * que es una n seguida de una tilde combinante U+0303. En un buscador de nomina y en un ejercicio de
 * completar el espacio eso no es un detalle: "Munoz" con ene queda igual que sin ella y esta bien, pero
 * "ano" y "anio" son palabras distintas y ya no.
 *
 * Tres decisiones que ninguna app educativa generica toma:
 * - La ene se protege con un centinela antes de despojar diacriticos, y vuelve despues.
 * - `toLocaleLowerCase('es-MX')` explicito: sin locale, una maquina configurada en turco convierte la I
 *   mayuscula en i sin punto y la comparacion falla en un equipo y no en otro.
 * - La dieresis SI se quita ("pinguino" con dieresis equivale a sin ella), porque en espanol no distingue
 *   palabras.
 *
 * El archivo se escribe en ASCII con escapes `\u`: los centinelas y el rango combinante son caracteres que
 * no sobreviven a un copiar-pegar ni a una revision en un diff.
 */

const SENTINEL_LOWER = '';
const SENTINEL_UPPER = '';

/** Marcas combinantes SIN U+0303 (la tilde de la ene), que se protege aparte. */
const COMBINING = /[̀-̂̄-ͯ]/g;

const ENYE_LOWER = 'ñ';
const ENYE_UPPER = 'Ñ';

export function normalizeEs(input: string): string {
  return input
    .split(ENYE_LOWER)
    .join(SENTINEL_LOWER)
    .split(ENYE_UPPER)
    .join(SENTINEL_UPPER)
    .normalize('NFD')
    .replace(COMBINING, '')
    .normalize('NFC')
    .split(SENTINEL_LOWER)
    .join(ENYE_LOWER)
    .split(SENTINEL_UPPER)
    .join(ENYE_UPPER)
    .toLocaleLowerCase('es-MX')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Plegado para BUSQUEDA, donde la ene SI se pliega a n.
 *
 * Es tecnicamente incorrecto en espanol y pragmaticamente correcto en un buscador de plantilla: nadie
 * teclea la tilde al buscar a un companero de trabajo, y "muno" tiene que encontrar a Munoz.
 */
export function foldForSearch(input: string): string {
  return normalizeEs(input).split(ENYE_LOWER).join('n');
}

/** Quita puntuacion SOLO en los extremos: "art. 5" conserva su punto interior. */
export function trimPunctuation(input: string): string {
  return input.replace(/^[\s.,;:!?"'¡¿«»…]+/, '').replace(/[\s.,;:!?"'¡¿«»…]+$/, '');
}

const NUMBER_WORDS: Readonly<Record<string, string>> = {
  cero: '0',
  uno: '1',
  una: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
  diez: '10',
  once: '11',
  doce: '12',
  trece: '13',
  catorce: '14',
  quince: '15',
  dieciseis: '16',
  diecisiete: '17',
  dieciocho: '18',
  diecinueve: '19',
  veinte: '20',
};

/** "cinco" equivale a "5"; "5o" con ordinal equivale a "5"; "1,200" equivale a "1200". */
export function normalizeAnswer(input: string): string {
  const base = trimPunctuation(normalizeEs(input))
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/(\d)°/g, '$1');
  return NUMBER_WORDS[base] ?? base;
}

/**
 * Distancia de edicion acotada a 1, con transposicion.
 *
 * Solo se aplica si el objetivo tiene 6 caracteres o mas. En palabras cortas "voz" y "vos" son palabras
 * distintas, y tolerar un typo aceptaria la respuesta equivocada — que en un curso de cumplimiento es
 * exactamente lo que no puede pasar.
 */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (la === lb) {
      if (a[i] === b[j + 1] && a[i + 1] === b[j]) {
        i += 2;
        j += 2;
        continue;
      }
      i += 1;
      j += 1;
    } else if (la > lb) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

export const MIN_LENGTH_FOR_TYPO_TOLERANCE = 6;
