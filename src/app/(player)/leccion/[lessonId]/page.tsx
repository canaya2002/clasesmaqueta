import { LessonScreen } from './LessonScreen';

/**
 * El reproductor a pantalla completa. En la fase 5 el mapa lo abrirá con una ruta INTERCEPTADA para
 * conservar el `layoutId` del nodo del camino; esta sigue siendo la ruta real, la que resuelve un enlace
 * profundo pegado en un chat o abierto en otra pestaña.
 */
export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <LessonScreen lessonId={lessonId} />;
}
