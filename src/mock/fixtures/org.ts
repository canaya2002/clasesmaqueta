/**
 * SENDA — el organigrama del cliente semilla.
 *
 * Las cohortes espejan ÁREAS REALES, no niveles de dificultad. "Cohorte A / B / C" o
 * "Principiantes / Intermedios" se ve a producto de prueba y desperdicia la única pantalla donde la escala
 * se siente de verdad.
 *
 * Los tamaños son asimétricos a propósito, y uno es EXACTAMENTE 300: el criterio de aceptación dice
 * "asignarlo a una cohorte de 300 personas" y el comprador va a contar.
 */

export interface CohortFixture {
  readonly slug: string;
  readonly name: string;
  readonly office: 'CDMX' | 'Monterrey' | 'Houston' | 'Chicago' | 'Phoenix';
  readonly zone: 'America/Mexico_City' | 'America/Chicago' | 'America/Phoenix';
  readonly size: number;
  readonly courseSlug: string;
}

export const COHORTS: readonly CohortFixture[] = [
  { slug: 'recepcion-mx', name: 'Recepción · México', office: 'CDMX', zone: 'America/Mexico_City', size: 300, courseSlug: 'primer-contacto' },
  { slug: 'asistentes-legales', name: 'Asistentes legales', office: 'Houston', zone: 'America/Chicago', size: 214, courseSlug: 'expediente-impecable' },
  { slug: 'cobranza', name: 'Cobranza y planes de pago', office: 'Monterrey', zone: 'America/Mexico_City', size: 168, courseSlug: 'cobranza-con-dignidad' },
  { slug: 'prospeccion', name: 'Prospección', office: 'CDMX', zone: 'America/Mexico_City', size: 131, courseSlug: 'primer-contacto' },
  { slug: 'recepcion-us', name: 'Recepción · Estados Unidos', office: 'Chicago', zone: 'America/Chicago', size: 104, courseSlug: 'primer-contacto' },
  { slug: 'abogados', name: 'Abogados', office: 'Houston', zone: 'America/Chicago', size: 96, courseSlug: 'expediente-impecable' },
  { slug: 'facturacion', name: 'Facturación', office: 'Phoenix', zone: 'America/Phoenix', size: 74, courseSlug: 'cobranza-con-dignidad' },
  { slug: 'nuevos-ingresos', name: 'Nuevos ingresos', office: 'CDMX', zone: 'America/Mexico_City', size: 80, courseSlug: 'primer-contacto' },
  { slug: 'supervisores', name: 'Supervisores de oficina', office: 'Monterrey', zone: 'America/Mexico_City', size: 80, courseSlug: 'expediente-impecable' },
];

/** Se comprueba en el arranque y en una prueba: la suma es un invariante del guion de demo. */
export const EXPECTED_TOTAL = 1247;

export const ROLES: readonly string[] = [
  'Recepcionista',
  'Asistente legal',
  'Abogado',
  'Ejecutivo de cobranza',
  'Ejecutivo de prospección',
  'Analista de facturación',
  'Supervisor',
  'Coordinador de oficina',
];
