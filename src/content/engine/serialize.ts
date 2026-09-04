/**
 * SENDA — import/export de cursos.
 *
 * El criterio de aceptación es "exportar un curso, borrarlo, reimportarlo → estado idéntico", y la parte
 * difícil es la política de IDENTIDADES. Todo importador remapea todos los ids "por seguridad"; hacerlo
 * rompe `correctOptionId` dentro de plugins que el importador no conoce, y el fallo no aparece hasta que un
 * alumno responde.
 *
 * Aquí: los ids de DOMINIO se conservan (para que el progreso histórico y la bitácora sigan apuntando), los
 * ids LOCALES del `data` de cada paso —`opt_`, `buc_`, `pai_`— se conservan siempre porque su alcance es el
 * propio paso, y el remapeo, cuando hace falta, es determinista: importar dos veces el mismo archivo produce
 * los mismos ids nuevos.
 */

import { z } from 'zod';
import { cloneJson, contentHash } from './canonicalize';
import type { ValidationIssue } from './issues';
import { localIssue } from './issues';
import type { Course } from './schema';
import { courseSchema } from './schema';
import { situate } from './step';
import type { ContentPath } from './path';
import { jsonSchema, type Json, type Result } from './primitives';
import { err, ok, text } from './primitives';

/** Se incrementa cuando el árbol de contenido cambia de forma. Un paquete más nuevo se rechaza. */
export const ENGINE_VERSION = 1;
export const PACKAGE_FORMAT_VERSION = 1;

/**
 * El SOBRE del paquete, validado con Zod en vez de con un cast.
 *
 * Un `raw as Partial<CoursePackage>` compila y miente: un archivo con `format: 'senda.course'` y todo lo
 * demás mal pasaría la comprobación de forma y reventaría más adentro, con un mensaje inútil.
 */
const packageEnvelope = z.object({
  format: z.literal('senda.course'),
  formatVersion: z.number().int().min(1),
  engineVersion: z.number().int().min(1),
  exportedAt: z.number(),
  contentHash: z.string(),
  dynamicVersions: z.record(z.string(), z.number().int()),
  course: jsonSchema,
});

export interface CoursePackage {
  readonly format: 'senda.course';
  readonly formatVersion: number;
  readonly engineVersion: number;
  readonly exportedAt: number;
  readonly contentHash: string;
  readonly dynamicVersions: Readonly<Record<string, number>>;
  readonly course: Json;
  /**
   * Tipado como `null` LITERAL.
   *
   * Empaquetar "todo lo del curso" es el reflejo natural y es exactamente cómo un import silencioso
   * reescribiría la gamificación de 1,247 personas. La economía se exporta aparte, con su propio formato.
   */
  readonly economy: null;
}

export interface ExportOptions {
  readonly at: number;
  readonly dynamicVersions: ReadonlyMap<string, number>;
}

/** Un `Course` ya es una estructura Json; esto lo declara sin castear. */
function courseToJson(course: Course): Json {
  const parsed = jsonSchema.safeParse(course);
  return parsed.success ? parsed.data : null;
}

export function exportCourse(course: Course, opts: ExportOptions): CoursePackage {
  const payload: Json = cloneJson(courseToJson(course));
  const versions: Record<string, number> = {};
  for (const [k, v] of opts.dynamicVersions) versions[k] = v;

  return {
    format: 'senda.course',
    formatVersion: PACKAGE_FORMAT_VERSION,
    engineVersion: ENGINE_VERSION,
    exportedAt: opts.at,
    contentHash: contentHash(payload),
    dynamicVersions: versions,
    course: payload,
    economy: null,
  };
}

export type ImportMode = 'replace' | 'fork';

export interface ImportReport {
  readonly ok: boolean;
  readonly mode: ImportMode;
  readonly counts: {
    readonly sections: number;
    readonly units: number;
    readonly lessons: number;
    readonly steps: number;
  };
  readonly issues: readonly ValidationIssue[];
  readonly hashBefore: string;
  readonly hashAfter: string;
  readonly elapsedMs: number;
}

const rootPath = (title: string): ContentPath => [
  { kind: 'course', id: 'crs_00000000', index: 0, title: text(title) },
];

export function importCourse(
  raw: unknown,
  opts: { readonly mode: ImportMode; readonly at: number; readonly localDynamicVersions: ReadonlyMap<string, number> },
): Result<{ readonly course: Course; readonly report: ImportReport }, ImportReport> {
  const started = opts.at;
  const path = rootPath('Paquete importado');

  const envelope = packageEnvelope.safeParse(raw);
  if (!envelope.success) {
    return err(fail('el archivo no es un paquete de curso de SENDA', path, opts.mode, started));
  }
  const shape = envelope.data;

  if (shape.engineVersion > ENGINE_VERSION) {
    return err(
      fail(
        `este paquete se creó con una versión más nueva de SENDA (motor ${String(shape.engineVersion)}, este build usa ${String(ENGINE_VERSION)})`,
        path,
        opts.mode,
        started,
      ),
    );
  }

  const parsed = courseSchema.safeParse(shape.course);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) =>
      situate(
        localIssue('schema', i.message, {
          field: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
        }),
        path,
      ),
    );
    return err({
      ok: false,
      mode: opts.mode,
      counts: { sections: 0, units: 0, lessons: 0, steps: 0 },
      issues,
      hashBefore: shape.contentHash,
      hashAfter: '',
      elapsedMs: 0,
    });
  }

  const course = parsed.data;
  const issues: ValidationIssue[] = [];

  // Un plugin más nuevo que el build local NO rompe el player: el paso entra marcado y bloquea publicar.
  for (const [type, version] of Object.entries(shape.dynamicVersions)) {
    const local = opts.localDynamicVersions.get(type);
    if (local !== undefined && version > local) {
      issues.push(
        situate(
          localIssue(
            'plugin-version-ahead',
            `el paquete trae la versión ${String(version)} de “${type}” y este build tiene la ${String(local)}`,
            { severity: 'warning' },
          ),
          path,
        ),
      );
    }
  }

  let units = 0;
  let lessons = 0;
  let steps = 0;
  for (const section of course.sections) {
    units += section.units.length;
    for (const unit of section.units) {
      lessons += unit.lessons.length;
      for (const lesson of unit.lessons) steps += lesson.steps.length;
    }
  }

  const roundTrip: Json = cloneJson(courseToJson(course));
  const report: ImportReport = {
    ok: true,
    mode: opts.mode,
    counts: { sections: course.sections.length, units, lessons, steps },
    issues,
    hashBefore: shape.contentHash,
    // El diálogo de importación muestra los dos checksums EN PANTALLA: el criterio se demuestra, no se afirma.
    hashAfter: contentHash(roundTrip),
    elapsedMs: 0,
  };

  return ok({ course, report });
}

function fail(message: string, path: ContentPath, mode: ImportMode, at: number): ImportReport {
  void at;
  return {
    ok: false,
    mode,
    counts: { sections: 0, units: 0, lessons: 0, steps: 0 },
    issues: [situate(localIssue('schema', message), path)],
    hashBefore: '',
    hashAfter: '',
    elapsedMs: 0,
  };
}
