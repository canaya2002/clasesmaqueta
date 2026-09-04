/**
 * Catálogo CERRADO de habilidades transversales.
 *
 * `tags: string[]` es barato de escribir e imposible de agregar: rompe el repaso inteligente en la primera
 * demo con datos reales, porque "cobranza", "Cobranza" y "cobros" son tres skills distintas. Aquí es una
 * tupla que genera el tipo y el enum de Zod, y el editor muestra multiselect, nunca un input libre.
 */

export const SKILL_IDS = [
  'skl_recepcion',
  'skl_escucha',
  'skl_guion',
  'skl_agenda',
  'skl_transferencia',
  'skl_registro',
  'skl_confidencial',
  'skl_privilegio',
  'skl_upl',
  'skl_expediente',
  'skl_documentos',
  'skl_plazos',
  'skl_verificacion',
  'skl_notificacion',
  'skl_cobranza',
  'skl_planpago',
  'skl_fdcpa',
  'skl_recibo',
  'skl_conciliacion',
  'skl_escalamiento',
  'skl_sistema',
  'skl_seguridad',
  'skl_tono',
  'skl_seguimiento',
] as const;

export type SkillSlug = (typeof SKILL_IDS)[number];

export const SKILL_LABEL: Readonly<Record<SkillSlug, string>> = {
  skl_recepcion: 'Atención en recepción',
  skl_escucha: 'Escucha activa',
  skl_guion: 'Uso del guion',
  skl_agenda: 'Agenda y citas',
  skl_transferencia: 'Transferencia de llamadas',
  skl_registro: 'Registro en el sistema',
  skl_confidencial: 'Confidencialidad',
  skl_privilegio: 'Privilegio abogado-cliente',
  skl_upl: 'Límites de la asesoría',
  skl_expediente: 'Integración del expediente',
  skl_documentos: 'Control de documentos',
  skl_plazos: 'Manejo de plazos',
  skl_verificacion: 'Verificación de identidad',
  skl_notificacion: 'Notificación al cliente',
  skl_cobranza: 'Gestión de cobranza',
  skl_planpago: 'Planes de pago',
  skl_fdcpa: 'Prácticas de cobro permitidas',
  skl_recibo: 'Recibos y comprobantes',
  skl_conciliacion: 'Conciliación de saldos',
  skl_escalamiento: 'Escalamiento',
  skl_sistema: 'Uso del sistema interno',
  skl_seguridad: 'Seguridad de la información',
  skl_tono: 'Tono y trato',
  skl_seguimiento: 'Seguimiento',
};
