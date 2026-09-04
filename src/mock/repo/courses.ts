/** Repositorio de contenido. Devuelve `RawStep`; el motor los prepara con `prepareStep`. */

import { COURSES, LESSONS, type LessonIndexEntry } from '@/content/seed/catalog';
import type { Course, Lesson } from '@/content/engine/schema';
import { boot } from '../db';
import { repoError, transport, err, ok, type RepoError, type Result } from './transport';

export function listCourses(): Promise<Result<readonly Course[], RepoError>> {
  return transport('courses.list', 'network', () => ok(boot().courses));
}

export function courseBySlug(slug: string): Promise<Result<Course, RepoError>> {
  return transport(`courses.bySlug:${slug}`, 'network', () => {
    const found = boot().courses.find((c, i) => COURSES[i]?.slug === slug);
    if (found === undefined) return err(repoError('not-found', 'repo.error.courseNotFound', { slug }));
    return ok(found);
  });
}

/** El camino se lee por SECCIÓN, no entero: 190 lecciones no caben en un solo render. */
export function pathIndex(courseSlug: string): Promise<Result<readonly LessonIndexEntry[], RepoError>> {
  return transport(`courses.path:${courseSlug}`, 'instant', () =>
    ok(LESSONS.filter((l) => l.courseSlug === courseSlug)),
  );
}

export function lessonById(id: string): Promise<Result<Lesson, RepoError>> {
  return transport(`courses.lesson:${id}`, 'network', () => {
    for (const course of boot().courses) {
      for (const section of course.sections) {
        for (const unit of section.units) {
          for (const lesson of unit.lessons) {
            if (lesson.id === id) return ok(lesson);
          }
        }
      }
    }
    return err(repoError('not-found', 'repo.error.lessonNotFound', { id }));
  });
}
