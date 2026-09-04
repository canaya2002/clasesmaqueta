/**
 * SENDA — la plantilla de 1,247 personas.
 *
 * **El ordinal es la identidad.** El id de un usuario y todos sus atributos salen de su ordinal y de nada
 * mas: crear al usuario 1248 no altera un solo bit de los 1,247 anteriores, y derivar a UNO no exige generar
 * los 1,246 que le preceden. Un `for` con un solo flujo de RNG compartido no da ninguna de las dos
 * propiedades, y son las que permiten que el Studio MUTE el mundo sin invalidar el guion de la demo.
 */

import { mix32, u01 } from '@/lib/rng';
import { foldForSearch } from '@/lib/text';
import { asId, type CohortId, type UserId } from '@/content/engine/primitives';
import { NS, USER_COUNT, paramsFor } from './activity';
import { COHORTS, EXPECTED_TOTAL, ROLES } from './fixtures/org';
import {
  FEMALE_NAMES,
  MALE_NAMES,
  SECOND_FEMALE,
  SECOND_MALE,
  SURNAMES,
  SURNAME_CUMULATIVE,
  SURNAME_TOTAL,
} from './fixtures/names';

export interface SeedUser {
  readonly ordinal: number;
  readonly id: UserId;
  readonly givenName: string;
  readonly surname: string;
  readonly displayName: string;
  readonly email: string;
  readonly cohortId: CohortId;
  readonly cohortSlug: string;
  readonly office: string;
  readonly zone: string;
  readonly role: string;
  readonly joinDay: number;
  readonly active: boolean;
}

const NS_NAME = 0x5e11d101;
const NS_SURNAME = 0x5e11d102;
const NS_ROLE = 0x5e11d103;

/** Separador del haystack. Fuera del alfabeto plegado, para que ninguna consulta lo atraviese. */
const SEP = '';

function pickSurname(ordinal: number, slot: number): string {
  const target = u01(mix32(NS_SURNAME, ordinal, slot)) * SURNAME_TOTAL;
  for (let i = 0; i < SURNAME_CUMULATIVE.length; i += 1) {
    if (target <= (SURNAME_CUMULATIVE[i] ?? 0)) return SURNAMES[i]?.[0] ?? 'Garcia';
  }
  return SURNAMES[0]?.[0] ?? 'Garcia';
}

/**
 * Los tamanos de cohorte son una constante que suma EXACTAMENTE 1,247.
 * La pertenencia por defecto se deriva del ordinal; el Studio la sobrescribe con un overlay disperso.
 */
const COHORT_BOUNDS: readonly number[] = (() => {
  const out: number[] = [];
  let acc = 0;
  for (const c of COHORTS) {
    acc += c.size;
    out.push(acc);
  }
  return out;
})();

if (COHORT_BOUNDS[COHORT_BOUNDS.length - 1] !== EXPECTED_TOTAL) {
  throw new Error(
    `Los tamanos de cohorte suman ${String(COHORT_BOUNDS[COHORT_BOUNDS.length - 1])} y deben sumar ${String(EXPECTED_TOTAL)}`,
  );
}

export function cohortIndexOf(ordinal: number): number {
  for (let i = 0; i < COHORT_BOUNDS.length; i += 1) {
    if (ordinal < (COHORT_BOUNDS[i] ?? 0)) return i;
  }
  return COHORTS.length - 1;
}

/** El id es determinista y corto: el ordinal cabe en base32 y se puede leer en voz alta en una demo. */
export function userIdOf(ordinal: number): UserId {
  return asId<'UserId'>(`usr_${ordinal.toString(32).padStart(8, '0')}`);
}

export function cohortIdOf(index: number): CohortId {
  return asId<'CohortId'>(`coh_${index.toString(32).padStart(8, '0')}`);
}

/** Deriva UN usuario sin tocar a los demas. */
export function userAt(ordinal: number): SeedUser {
  const cohortIndex = cohortIndexOf(ordinal);
  const cohort = COHORTS[cohortIndex] ?? COHORTS[0];
  if (cohort === undefined) throw new Error('Sin cohortes en el fixture');

  const female = u01(mix32(NS_NAME, ordinal, 0)) < 0.62;
  const pool = female ? FEMALE_NAMES : MALE_NAMES;
  const first = pool[Math.floor(u01(mix32(NS_NAME, ordinal, 1)) * pool.length)] ?? 'Maria';

  // Nombres compuestos: 32% en mujeres, 18% en hombres. Es lo que hace que "Maria Fernanda" exista.
  const compoundRoll = u01(mix32(NS_NAME, ordinal, 2));
  const compound = female ? compoundRoll < 0.32 : compoundRoll < 0.18;
  const secondPool = female ? SECOND_FEMALE : SECOND_MALE;
  const second = secondPool[Math.floor(u01(mix32(NS_NAME, ordinal, 3)) * secondPool.length)] ?? 'Elena';
  const givenName = compound ? `${first} ${second}` : first;

  const paternal = pickSurname(ordinal, 0);
  // 8% con un solo apellido: en las oficinas de Estados Unidos el materno se pierde en los sistemas.
  const singleSurname = u01(mix32(NS_SURNAME, ordinal, 9)) < 0.08;
  const maternal = pickSurname(ordinal, 1);
  const surname = singleSurname ? paternal : `${paternal} ${maternal}`;

  const role = ROLES[Math.floor(u01(mix32(NS_ROLE, ordinal, 0)) * ROLES.length)] ?? 'Recepcionista';
  const params = paramsFor(ordinal);
  const emailLocal = `${foldForSearch(first)}.${foldForSearch(paternal)}`.replace(/\s+/g, '');

  return {
    ordinal,
    id: userIdOf(ordinal),
    givenName,
    surname,
    displayName: `${givenName} ${surname}`,
    email: `${emailLocal}${ordinal % 7 === 0 ? String(ordinal) : ''}@despacho.mx`,
    cohortId: cohortIdOf(cohortIndex),
    cohortSlug: cohort.slug,
    office: cohort.office,
    zone: cohort.zone,
    role,
    joinDay: params.joinDay,
    active: params.churnHazard === 0 || u01(mix32(NS.profile, ordinal, 5)) > 0.04,
  };
}

export interface UserSlice {
  readonly users: readonly SeedUser[];
  /** Ordinal por id, construido una vez: el alfabeto base32 no permite despejarlo con `parseInt`. */
  readonly ordinalById: ReadonlyMap<string, number>;
  /** Conteos por cohorte, con la ultima casilla para "sin cohorte". */
  readonly cohortCounts: Int32Array;
  readonly buildMs: number;
}

export function buildUsers(): UserSlice {
  const t0 = nowMs();
  const users: SeedUser[] = [];
  const ordinalById = new Map<string, number>();
  const cohortCounts = new Int32Array(COHORTS.length + 1);

  for (let i = 0; i < USER_COUNT; i += 1) {
    const u = userAt(i);
    users.push(u);
    ordinalById.set(u.id, i);
    const ci = cohortIndexOf(i);
    cohortCounts[ci] = (cohortCounts[ci] ?? 0) + 1;
  }

  return { users, ordinalById, cohortCounts, buildMs: nowMs() - t0 };
}

/**
 * Indice de busqueda: un solo `haystack` empacado y sus desplazamientos.
 *
 * `rows.filter(r => r.name.toLowerCase().includes(q))` recomputa `toLowerCase` 1,247 veces por tecla y no
 * pliega acentos; `fuse.js` son 60 KB de JS y un difuso que confunde en demo. Aqui la consulta se pliega
 * igual que el haystack y se recorre con `indexOf`, y cada golpe se mapea a fila por busqueda binaria.
 */
export interface SearchIndex {
  readonly haystack: string;
  readonly starts: Int32Array;
  readonly buildMs: number;
}

export function buildSearchIndex(users: readonly SeedUser[]): SearchIndex {
  const t0 = nowMs();
  const starts = new Int32Array(users.length + 1);
  const parts: string[] = [];
  let offset = 0;
  for (let i = 0; i < users.length; i += 1) {
    const u = users[i];
    if (u === undefined) continue;
    starts[i] = offset;
    const row = `${foldForSearch(`${u.displayName} ${u.email} ${u.role} ${u.office}`)}${SEP}`;
    parts.push(row);
    offset += row.length;
  }
  starts[users.length] = offset;
  return { haystack: parts.join(''), starts, buildMs: nowMs() - t0 };
}

export function searchUsers(index: SearchIndex, query: string, limit = 200): readonly number[] {
  const q = foldForSearch(query);
  if (q.length === 0) return [];
  const out: number[] = [];
  let at = index.haystack.indexOf(q);
  while (at >= 0 && out.length < limit) {
    // Busqueda binaria del ordinal cuyo tramo contiene esta posicion.
    let lo = 0;
    let hi = index.starts.length - 2;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if ((index.starts[mid] ?? 0) <= at) lo = mid;
      else hi = mid - 1;
    }
    if (out[out.length - 1] !== lo) out.push(lo);
    at = index.haystack.indexOf(q, at + 1);
  }
  return out;
}

/* eslint-disable-next-line no-restricted-syntax -- el presupuesto de arranque es la razon de medir */
const nowMs = (): number => (typeof performance === 'undefined' ? 0 : performance.now());
