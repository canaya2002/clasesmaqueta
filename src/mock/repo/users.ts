/**
 * Repositorio de usuarios.
 *
 * La UI NUNCA importa `seed.ts` ni `db.ts`: solo habla con este archivo, y una regla de `no-restricted-paths`
 * lo hace exigible con `pnpm lint` en vez de por revisión humana. Migrar a un backend real después es
 * reemplazar el cuerpo de estas funciones, no buscar dónde quedó la lógica.
 */

import { boot } from '../db';
import { searchUsers, type SeedUser } from '../seed';
import { repoError, transport, err, ok, type RepoError, type Result } from './transport';

export interface UserRow {
  readonly id: string;
  readonly ordinal: number;
  readonly name: string;
  readonly email: string;
  readonly cohortSlug: string;
  readonly office: string;
  readonly role: string;
  readonly streak: number;
  readonly bestStreak: number;
  readonly active: boolean;
}

function toRow(u: SeedUser): UserRow {
  const w = boot();
  return {
    id: u.id,
    ordinal: u.ordinal,
    name: u.displayName,
    email: u.email,
    cohortSlug: u.cohortSlug,
    office: u.office,
    role: u.role,
    streak: w.activity.currentStreak[u.ordinal] ?? 0,
    bestStreak: w.activity.bestStreak[u.ordinal] ?? 0,
    active: u.active,
  };
}

export interface ListOptions {
  readonly query: string;
  readonly cohortSlug: string | null;
  readonly offset: number;
  readonly limit: number;
}

export interface UserPage {
  readonly rows: readonly UserRow[];
  readonly total: number;
}

/** Nivel `instant`: es una lectura dirigida por teclado y no puede pagar 80–260 ms por pulsación. */
export function list(opts: ListOptions): Promise<Result<UserPage, RepoError>> {
  return transport(`users.list:${opts.query}:${opts.cohortSlug ?? ''}`, 'instant', () => {
    const w = boot();
    let pool: readonly SeedUser[] = w.users.users;

    if (opts.query.trim().length > 0) {
      const hits = searchUsers(w.search, opts.query, 2000);
      pool = hits.map((i) => w.users.users[i]).filter((u): u is SeedUser => u !== undefined);
    }
    if (opts.cohortSlug !== null) pool = pool.filter((u) => u.cohortSlug === opts.cohortSlug);

    return ok({
      rows: pool.slice(opts.offset, opts.offset + opts.limit).map(toRow),
      total: pool.length,
    });
  });
}

/** Nivel `network`: es una carga de pantalla, así que paga latencia y puede fallar con SIMULATE_ERRORS. */
export function byId(id: string): Promise<Result<UserRow, RepoError>> {
  return transport(`users.byId:${id}`, 'network', () => {
    const w = boot();
    const ordinal = w.users.ordinalById.get(id);
    if (ordinal === undefined) return err(repoError('not-found', 'repo.error.userNotFound', { id }));
    const user = w.users.users[ordinal];
    if (user === undefined) return err(repoError('not-found', 'repo.error.userNotFound', { id }));
    return ok(toRow(user));
  });
}

export interface CohortFacet {
  readonly slug: string;
  readonly name: string;
  readonly count: number;
}

export function cohortFacets(): Promise<Result<readonly CohortFacet[], RepoError>> {
  return transport('users.cohortFacets', 'instant', () => {
    const w = boot();
    return ok(
      w.cohorts.map((c, i) => ({ slug: c.slug, name: c.name, count: w.users.cohortCounts[i] ?? 0 })),
    );
  });
}
