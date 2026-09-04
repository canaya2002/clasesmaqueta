/**
 * SENDA — primitivas del motor de contenido.
 *
 * Este archivo es el DUEÑO ÚNICO de las marcas y de los identificadores. Un diseño anterior tenía dos
 * fábricas de ids compitiendo (`usr_a1b2c3d4` y `u_0001`) y la consecuencia no era estética: el 100% del
 * contenido sembrado fallaba al validar y la primera lección de la demo abría en estado de error.
 *
 * Regla que atraviesa todo el motor: **el tipo `string` no existe aquí**. Todo texto es o `I18nKey` (chrome
 * traducible) o `ContentText` (contenido monolingüe del curso), y las dos marcas son incompatibles. Con 14
 * plugins escritos en fases distintas, alguien acaba metiendo un literal en el sitio equivocado; así no
 * compila.
 */

import { z } from 'zod';
import { brand, type Branded } from '@/lib/brand';

/* ------------------------------------------------------------------------ Json */

/**
 * El `data`, el `answer` y el `detail` de toda dinámica están restringidos a esto.
 *
 * No es purismo: un `Date` dentro del `data` rompe a la vez los snapshots inmutables, el diff campo por
 * campo y el import/export — las tres cosas en silencio, y las tres son criterios de aceptación.
 */
export type Json = null | boolean | number | string | readonly Json[] | { readonly [k: string]: Json };

export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.null(), z.boolean(), z.number(), z.string(), z.array(jsonSchema), z.record(z.string(), jsonSchema)]),
);

/* ------------------------------------------------------------- marcas de texto */

export type ContentText = Branded<string, 'ContentText'>;
export type I18nKey = Branded<string, 'I18nKey'>;

/** Texto de CONTENIDO: enunciados, opciones, títulos, pistas, explicaciones. Monolingüe por curso. */
export const contentText = z.string().min(1).max(2000).transform((s): ContentText => brand(s));

/** Clave de CHROME: etiquetas de la interfaz, mensajes de sistema. Se traduce; el contenido no. */
export const i18nKey = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/, 'Una clave i18n tiene la forma "seccion.subseccion.clave"')
  .transform((s): I18nKey => brand(s));

/** Constructor de claves para el código del motor, que no pasa por un parse de Zod. */
export function key(value: string): I18nKey {
  return brand(value);
}

/** Constructor de texto de contenido para fixtures y seeds, que ya son datos confiables. */
export function text(value: string): ContentText {
  return brand(value);
}

/* --------------------------------------------------------------- marcas numéricas */

/** Puntuación normalizada [0, 1]. La calificación parcial vive aquí. */
export type Score01 = Branded<number, 'Score01'>;

export const score01 = z
  .number()
  .min(0)
  .max(1)
  .transform((n): Score01 => brand(n));

export function score(value: number): Score01 {
  const clamped = value < 0 ? 0 : value > 1 ? 1 : value;
  return brand(clamped);
}

/**
 * XP en milésimas, entero.
 *
 * El XP se acumula multiplicando peso × dificultad × combo × potenciadores. En punto flotante, mil lecciones
 * acumulan error visible; en milésimas enteras no hay error y el redondeo ocurre UNA vez, al cerrar la
 * lección.
 */
export type MilliXp = Branded<number, 'MilliXp'>;

export function milliXp(value: number): MilliXp {
  return brand(Math.round(value));
}

export function toXp(value: MilliXp): number {
  return Math.round(value / 1000);
}

/* -------------------------------------------------------------------- identidad */

export type CourseId = Branded<string, 'CourseId'>;
export type SectionId = Branded<string, 'SectionId'>;
export type UnitId = Branded<string, 'UnitId'>;
export type LessonId = Branded<string, 'LessonId'>;
export type StepId = Branded<string, 'StepId'>;
export type SkillId = Branded<string, 'SkillId'>;
export type MediaId = Branded<string, 'MediaId'>;
export type UserId = Branded<string, 'UserId'>;
export type CohortId = Branded<string, 'CohortId'>;
export type BadgeId = Branded<string, 'BadgeId'>;
export type AssignmentId = Branded<string, 'AssignmentId'>;
export type AuditId = Branded<string, 'AuditId'>;
export type ReportId = Branded<string, 'ReportId'>;
export type AttemptId = Branded<string, 'AttemptId'>;

export const ID_PREFIX = {
  course: 'crs',
  section: 'sec',
  unit: 'unt',
  lesson: 'lsn',
  step: 'stp',
  skill: 'skl',
  media: 'med',
  user: 'usr',
  cohort: 'coh',
  badge: 'bdg',
  assignment: 'asg',
  audit: 'aud',
  report: 'rep',
  attempt: 'atm',
} as const;

export type IdPrefix = (typeof ID_PREFIX)[keyof typeof ID_PREFIX];

/**
 * Alfabeto Crockford base32: sin `i`, `l`, `o` ni `u`.
 *
 * Sin `i/l/o` porque un id se lee en voz alta en una demo y se teclea en un campo de búsqueda; sin `u`
 * porque Crockford lo excluye para que ninguna secuencia de 4 caracteres forme una palabra ofensiva en
 * inglés. Un id no es solo una clave: en este producto aparece en pantalla, en el diff y en los mensajes
 * de validación.
 */
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const ID_LENGTH = 8;

/**
 * Un identificador es o bien ACUÑADO (8 caracteres base32) o bien SEMÁNTICO (`skl_recepcion`,
 * `unt_llamada-entrante`).
 *
 * Los semánticos existen porque los ids aparecen EN PANTALLA: en el diff de versiones, en los mensajes de
 * validación y en el reporte de importación. `unt_7k3pq9wy` se ve profesional y arruina justo las dos
 * pantallas que más venden el producto; `unt_llamada-entrante` se lee.
 *
 * Los acuñados se reservan para lo que genera la semilla o el editor, donde no hay nombre que dar.
 */
const mintedPattern = new RegExp(`^[a-z]{3}_[${ALPHABET}]{${ID_LENGTH}}$`);
const semanticPattern = /^[a-z]{3}_[a-z0-9][a-z0-9-]{2,39}$/;
const idPattern = new RegExp(`(${mintedPattern.source})|(${semanticPattern.source})`);

/**
 * La ÚNICA fábrica de identificadores.
 *
 * `rng` se inyecta a propósito: `Math.random` está prohibido por lint y la demo tiene que ser idéntica en
 * cada máquina. El seed pasa su flujo determinista; el editor del Studio pasa uno sembrado con el id de la
 * entidad de origen, de modo que duplicar dos veces la misma lección produce los mismos ids nuevos.
 */
export function mintId<P extends IdPrefix>(prefix: P, rng: () => number): string {
  let out = '';
  for (let i = 0; i < ID_LENGTH; i += 1) {
    const index = Math.floor(rng() * ALPHABET.length) % ALPHABET.length;
    out += ALPHABET[index] ?? '0';
  }
  return `${prefix}_${out}`;
}

function idSchema<K extends string>(prefix: IdPrefix): z.ZodType<Branded<string, K>> {
  return z
    .string()
    .regex(idPattern, `Identificador inválido: se espera ${prefix}_ seguido de 8 caracteres base32`)
    .refine((s) => s.startsWith(`${prefix}_`), { message: `Se esperaba el prefijo "${prefix}_"` })
    .transform((s): Branded<string, K> => brand(s));
}

export const courseId = idSchema<'CourseId'>(ID_PREFIX.course);
export const sectionId = idSchema<'SectionId'>(ID_PREFIX.section);
export const unitId = idSchema<'UnitId'>(ID_PREFIX.unit);
export const lessonId = idSchema<'LessonId'>(ID_PREFIX.lesson);
export const stepId = idSchema<'StepId'>(ID_PREFIX.step);
export const skillId = idSchema<'SkillId'>(ID_PREFIX.skill);
export const mediaId = idSchema<'MediaId'>(ID_PREFIX.media);
export const userId = idSchema<'UserId'>(ID_PREFIX.user);
export const cohortId = idSchema<'CohortId'>(ID_PREFIX.cohort);
export const badgeId = idSchema<'BadgeId'>(ID_PREFIX.badge);

/** Para fixtures y seeds, que producen ids ya conformes y no deben pagar un parse por cada uno. */
export function asId<T extends string>(value: string): Branded<string, T> {
  return brand(value);
}

/* ------------------------------------------------------------------ cardinalidad */

export type NonEmpty<T> = readonly [T, ...T[]];

/**
 * Cardinalidad en el TIPO, no solo en el runtime.
 *
 * `z.array(x).min(2)` es una regla que el tipo no ve: cada acceso sigue siendo `T | undefined` bajo
 * `noUncheckedIndexedAccess` y contamina grade, player, editor y analítica con `??` defensivos que esconden
 * el bug real. Una tupla con resto sí la ve.
 */
export function nonEmpty<T extends z.ZodTypeAny>(schema: T): z.ZodTuple<[T], T> {
  return z.tuple([schema]).rest(schema);
}

export function atLeastTwo<T extends z.ZodTypeAny>(schema: T): z.ZodTuple<[T, T], T> {
  return z.tuple([schema, schema]).rest(schema);
}

/* ----------------------------------------------------------------------- Result */

export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
