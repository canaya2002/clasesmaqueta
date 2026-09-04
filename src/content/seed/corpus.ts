/**
 * SENDA — el corpus de conocimiento del contenido semilla.
 *
 * DECISIÓN DE RIESGO, no de estilo: el comprador son abogados migratorios y un enunciado jurídico
 * incorrecto mata la venta en la sala. El corpus se escribe sobre dominios INTERNOS VERIFICABLES —ética
 * profesional, manejo de expedientes, seguridad de la información del cliente, atención en recepción,
 * cobranza y planes de pago, uso del sistema interno— y lo estrictamente jurídico se limita a hechos de
 * PROCEDIMIENTO marcados con `legal: true`, que el player etiqueta como «contenido de ejemplo».
 *
 * Y el eje no es "aprender leyes": es RIESGO OPERATIVO. Esa es la diferencia entre un curso que justifica
 * corazones, ligas y escenarios ramificados, y una inducción genérica de RH que no justifica ninguno.
 */

import type { SkillSlug } from './skills';

export interface Fact {
  readonly skill: SkillSlug;
  /** El sujeto de la situación: "una llamada de alguien que ya es cliente". */
  readonly subject: string;
  readonly correct: string;
  readonly wrong: readonly string[];
  readonly explanation: string;
  /** `true` solo en los hechos de procedimiento jurídico. Son 18 en todo el corpus. */
  readonly legal: boolean;
}

const f = (
  skill: SkillSlug,
  subject: string,
  correct: string,
  wrong: readonly string[],
  explanation: string,
  legal = false,
): Fact => ({ skill, subject, correct, wrong, explanation, legal });

export interface UnitTopic {
  readonly slug: string;
  readonly title: string;
  readonly objective: string;
  readonly icon: string;
  readonly primarySkill: SkillSlug;
  readonly facts: readonly Fact[];
}

/* =========================================================== CURSO A · Primer Contacto */

const A: readonly UnitTopic[] = [
  {
    slug: 'llamada-entrante',
    title: 'La llamada entrante',
    objective: 'Contestar, calificar y transferir una llamada entrante en menos de 3 minutos usando el guion de 5 preguntas',
    icon: 'phone-incoming',
    primarySkill: 'skl_recepcion',
    facts: [
      f('skl_recepcion', 'una llamada que entra por la línea general', 'Contestar antes del tercer timbrazo con el saludo completo del despacho', ['Contestar solo con "bueno"', 'Dejar que pase a buzón si estás ocupado', 'Contestar y poner en espera de inmediato'], 'El saludo completo identifica al despacho y evita que la persona crea que se equivocó de número.'),
      f('skl_guion', 'alguien que llama por primera vez', 'Preguntar el motivo antes de pedir datos personales', ['Pedir primero el número de teléfono', 'Preguntar cuánto puede pagar', 'Pasar la llamada sin preguntar nada'], 'El motivo determina a qué área va la llamada. Pedir datos antes obliga a repetirlos si hay que transferir.'),
      f('skl_escucha', 'una persona que habla muy rápido y con mucho detalle', 'Resumir en una frase y confirmar antes de continuar', ['Interrumpir para pedir el número de expediente', 'Anotar todo literalmente sin resumir', 'Esperar en silencio hasta que termine'], 'Resumir confirma que entendiste y le da a la persona la señal de que la escuchaste.'),
      f('skl_transferencia', 'una llamada que hay que pasar a otra área', 'Avisar a quién se transfiere y por qué, y esperar a que contesten', ['Transferir en frío sin avisar', 'Dar el número directo y colgar', 'Dejar la llamada en espera indefinida'], 'Una transferencia en frío se cae y la persona vuelve a marcar desde cero, ya molesta.'),
      f('skl_registro', 'una llamada que terminó sin agendar cita', 'Registrar el motivo y el resultado en el sistema antes de contestar la siguiente', ['Anotarlo en papel para capturarlo al final del día', 'No registrarla porque no se agendó nada', 'Registrar solo el número de teléfono'], 'Una llamada sin registro es una llamada que no ocurrió: el seguimiento no puede existir.'),
      f('skl_tono', 'una persona que llama enojada por una demora', 'Reconocer la molestia antes de explicar el procedimiento', ['Explicar de inmediato por qué se demoró', 'Pedir que baje la voz', 'Transferir al supervisor sin avisar'], 'Explicar antes de reconocer suena a excusa y escala la llamada.'),
      f('skl_verificacion', 'alguien que pide información de un expediente por teléfono', 'Verificar identidad con dos datos del expediente antes de decir nada', ['Confirmar solo con el nombre', 'Dar la información si suena convincente', 'Pedir la contraseña del portal'], 'Un nombre no verifica identidad: aparece en cualquier documento que la persona pudo ver.'),
    ],
  },
  {
    slug: 'guion-cinco-preguntas',
    title: 'El guion de cinco preguntas',
    objective: 'Aplicar las 5 preguntas de calificación en toda llamada nueva y registrar las 5 respuestas en el sistema',
    icon: 'list-checks',
    primarySkill: 'skl_guion',
    facts: [
      f('skl_guion', 'la primera pregunta del guion', 'En qué podemos ayudarle', ['Cuál es su presupuesto', 'Quién lo recomendó', 'Cuál es su número de teléfono'], 'La primera pregunta abre; las de datos van después de entender el motivo.'),
      f('skl_guion', 'una persona que responde con una historia larga', 'Dejarla terminar y luego hacer la siguiente pregunta del guion', ['Saltar al final del guion', 'Interrumpir en la primera pausa', 'Abandonar el guion y improvisar'], 'El guion existe para que ninguna llamada se quede sin los cinco datos, no para acelerarla.'),
      f('skl_guion', 'alguien que se niega a dar su fecha de entrada al país', 'Anotar que no la proporcionó y continuar con el guion', ['Insistir hasta obtenerla', 'Terminar la llamada', 'Inventar una fecha aproximada'], 'Un dato faltante registrado es información; un dato inventado es un expediente contaminado.'),
      f('skl_agenda', 'una llamada calificada que sí procede', 'Ofrecer dos horarios concretos en vez de preguntar cuándo puede', ['Preguntar cuándo le queda bien', 'Agendar en el primer hueco disponible sin preguntar', 'Pedir que llame después para agendar'], 'Dos opciones concretas cierran cita; una pregunta abierta produce "yo le llamo".'),
      f('skl_seguimiento', 'una persona que dice que lo va a pensar', 'Agendar una llamada de seguimiento con fecha y hora', ['Decirle que llame cuando decida', 'Insistir en agendar hoy', 'Marcar el caso como perdido'], 'Sin fecha concreta el seguimiento depende de que la persona se acuerde, y no se acuerda.'),
      f('skl_registro', 'las cinco respuestas del guion', 'Capturarlas en los campos del sistema, no en el campo de notas', ['Escribirlas todas en notas', 'Capturar solo las que parezcan importantes', 'Dejarlas para que las capture el abogado'], 'En notas no se pueden filtrar ni reportar: es como no tenerlas.'),
      f('skl_escucha', 'una persona que menciona una fecha de audiencia', 'Repetir la fecha en voz alta para confirmarla y registrarla como prioritaria', ['Anotarla sin confirmar', 'Suponer que el abogado ya la conoce', 'Pedir que la envíe por mensaje'], 'Una fecha mal capturada es un plazo perdido, y un plazo perdido no se recupera.'),
    ],
  },
  {
    slug: 'limites-asesoria',
    title: 'Lo que recepción no puede decir',
    objective: 'Identificar en 3 segundos si una pregunta requiere abogado y redirigirla sin dar una opinión legal',
    icon: 'shield-alert',
    primarySkill: 'skl_upl',
    facts: [
      f('skl_upl', 'alguien que pregunta si califica para un beneficio migratorio', 'Explicar que esa evaluación la hace un abogado y agendar la consulta', ['Dar una opinión basada en casos parecidos', 'Decir que probablemente sí', 'Decir que no y cerrar la llamada'], 'Evaluar elegibilidad es asesoría legal. Darla sin ser abogado expone a la persona y al despacho.', true),
      f('skl_upl', 'una persona que pide que le digas qué formulario llenar', 'Explicar que el abogado determina el formulario tras revisar el caso', ['Nombrar el formulario que suele aplicar', 'Enviarle el enlace del formulario', 'Llenarlo por ella'], 'El formulario correcto depende de hechos que solo se revisan en consulta.', true),
      f('skl_upl', 'alguien que pregunta cuánto tarda su trámite', 'Dar el rango publicado por la autoridad y aclarar que cada caso varía', ['Dar una fecha estimada propia', 'Decir que es rápido', 'Decir que no se puede saber'], 'Los tiempos publicados son públicos; una fecha propia se lee como una promesa.', true),
      f('skl_upl', 'una persona que pide una opinión sobre lo que le dijo otro despacho', 'Registrar lo que dice y ofrecer una segunda opinión con un abogado', ['Opinar sobre el otro despacho', 'Decir que ese despacho se equivocó', 'Decir que no podemos ayudar'], 'Opinar sobre el trabajo de otro sin ver el expediente es riesgo puro.'),
      f('skl_upl', 'alguien que pregunta si debe presentarse a una cita con la autoridad', 'Transferir de inmediato a un abogado o agendar hoy mismo', ['Decir que sí se presente', 'Decir que no se presente', 'Sugerir que consulte en internet'], 'Es una decisión con consecuencias inmediatas: no admite intermediarios.', true),
      f('skl_tono', 'una persona insiste en que le des tu opinión personal', 'Sostener el límite con amabilidad y ofrecer la vía correcta', ['Dar la opinión en voz baja', 'Decir "entre nosotros"', 'Colgar'], 'El límite se sostiene con la misma frase cada vez; cambiarla invita a insistir.'),
      f('skl_escalamiento', 'una llamada que menciona una detención en curso', 'Escalar de inmediato al abogado de guardia, sin agendar', ['Agendar para el día siguiente', 'Tomar los datos y pasarlos por correo', 'Pedir que vuelva a llamar'], 'Hay situaciones donde el tiempo de respuesta cambia el resultado.', true),
    ],
  },
  {
    slug: 'agenda-y-citas',
    title: 'Agenda y citas',
    objective: 'Agendar una consulta con los 4 datos obligatorios y confirmarla 24 horas antes con 2 recordatorios',
    icon: 'calendar-check',
    primarySkill: 'skl_agenda',
    facts: [
      f('skl_agenda', 'una cita que se agenda por teléfono', 'Confirmar en voz alta fecha, hora, oficina y qué debe traer', ['Confirmar solo fecha y hora', 'Enviar la confirmación por mensaje sin decirla', 'Dar por hecho que quedó claro'], 'Repetir los cuatro datos reduce las inasistencias más que cualquier recordatorio automático.'),
      f('skl_agenda', 'una persona que pide cita para el mismo día', 'Ofrecer el primer espacio disponible y explicar el tiempo de espera', ['Decir que no hay espacio', 'Agendar encima de otra cita', 'Pedir que llegue y espere'], 'Una cita encimada convierte dos citas buenas en dos malas.'),
      f('skl_notificacion', 'el recordatorio de una cita', 'Enviarlo 24 horas antes y confirmar recepción', ['Enviarlo el mismo día', 'Enviarlo una semana antes', 'No enviarlo si la cita se agendó ayer'], 'Veinticuatro horas es el margen que permite reagendar sin perder el espacio.'),
      f('skl_agenda', 'alguien que no llegó a su cita', 'Registrar la inasistencia y llamar el mismo día para reagendar', ['Esperar a que la persona llame', 'Marcar el caso como cerrado', 'Reagendar sin avisar'], 'La llamada del mismo día recupera más de la mitad de las inasistencias.'),
      f('skl_agenda', 'una cita que el cliente quiere cambiar', 'Liberar el espacio anterior antes de asignar el nuevo', ['Dejar los dos espacios ocupados', 'Cambiar solo la hora en la nota', 'Pedir que lo haga en el portal'], 'Un espacio no liberado es una cita que nadie puede tomar.'),
      f('skl_registro', 'una cita agendada', 'Verificar que el número de teléfono capturado tenga el formato correcto', ['Capturarlo como lo dictó la persona', 'Dejarlo en blanco si no lo dio', 'Anotarlo en el campo de notas'], 'Un teléfono mal capturado hace inútiles todos los recordatorios de esa cita.'),
      f('skl_tono', 'una persona que llega tarde a su cita', 'Recibirla sin comentar la demora y verificar si aún alcanza el espacio', ['Comentar que llegó tarde', 'Negar la atención', 'Hacerla esperar sin explicar'], 'El comentario no recupera el tiempo y sí cambia el tono de la consulta.'),
    ],
  },
  {
    slug: 'primer-contacto-presencial',
    title: 'Recepción presencial',
    objective: 'Recibir a una persona en menos de 60 segundos y registrar su llegada antes de que se siente',
    icon: 'door-open',
    primarySkill: 'skl_recepcion',
    facts: [
      f('skl_recepcion', 'alguien que entra a la oficina', 'Saludar y preguntar el motivo antes de que llegue al mostrador', ['Esperar a que se acerque', 'Seguir en la computadora hasta terminar', 'Señalar la sala de espera'], 'Los primeros segundos definen si la persona siente que la esperaban.'),
      f('skl_verificacion', 'una persona que dice tener cita', 'Buscarla por nombre y confirmar con un segundo dato', ['Buscarla solo por nombre', 'Creerle y pasarla', 'Pedir identificación oficial siempre'], 'Dos datos evitan confundir a dos personas con el mismo nombre, que en una plantilla grande pasa.'),
      f('skl_confidencial', 'la sala de espera con varias personas', 'Hablar del caso en voz baja o llevar a la persona a un espacio privado', ['Hablar normal, es una recepción', 'Pedir que hable más bajo', 'Anotar todo para no hablar'], 'Un dato de expediente dicho en voz alta es una fuga, aunque nadie parezca escuchar.'),
      f('skl_recepcion', 'una persona que llega sin cita', 'Registrar su llegada y ofrecer la primera cita disponible', ['Pedirle que llame por teléfono', 'Hacerla esperar sin registrar', 'Atenderla de inmediato'], 'Registrar la visita convierte una interrupción en un prospecto con seguimiento.'),
      f('skl_seguridad', 'documentos que un cliente entrega en mostrador', 'Recibirlos, sellar acuse y guardarlos de inmediato en el expediente', ['Dejarlos sobre el escritorio hasta después', 'Devolverlos y pedir que los envíe', 'Guardarlos sin acuse'], 'Un documento sin acuse es una disputa esperando a ocurrir.'),
      f('skl_tono', 'una persona que viene con niños', 'Ofrecer el espacio de espera adecuado antes de iniciar el trámite', ['Pedir que vuelva sin ellos', 'Ignorarlo', 'Apurar el trámite'], 'Resolverlo primero evita interrumpir la consulta a la mitad.'),
      f('skl_escalamiento', 'alguien que se altera en recepción', 'Llevarlo a un espacio privado y avisar al supervisor', ['Responder en el mismo tono', 'Pedirle que se retire', 'Ignorarlo hasta que se calme'], 'Mover la conversación de lugar baja la intensidad más rápido que cualquier frase.'),
    ],
  },
  {
    slug: 'confidencialidad-basica',
    title: 'Confidencialidad en el día a día',
    objective: 'Identificar 5 situaciones cotidianas de fuga de información y aplicar la regla de mínimo necesario',
    icon: 'lock',
    primarySkill: 'skl_confidencial',
    facts: [
      f('skl_confidencial', 'un familiar que pide información del caso', 'Verificar si está autorizado por escrito en el expediente', ['Dar la información si es familiar directo', 'Dar solo el estatus general', 'Pedir que venga en persona'], 'La autorización es del titular, no del parentesco.'),
      f('skl_confidencial', 'una pantalla con un expediente abierto', 'Bloquear la sesión al levantarse, aunque sea un minuto', ['Voltear la pantalla', 'Minimizar la ventana', 'Confiar en que nadie pasa'], 'El bloqueo es la única medida que no depende de que nadie pase.'),
      f('skl_seguridad', 'un documento que hay que enviar a un cliente', 'Enviarlo por el canal autorizado y confirmar el destinatario', ['Enviarlo por WhatsApp si lo pide', 'Enviarlo al correo que dictó por teléfono', 'Enviarlo sin confirmar'], 'El canal autorizado deja rastro; los demás no, y el rastro es lo que protege a ambas partes.'),
      f('skl_confidencial', 'una conversación sobre un caso en el pasillo', 'Trasladarla a un espacio cerrado', ['Bajar la voz', 'Usar solo el número de expediente', 'Continuar, es personal interno'], 'El número de expediente identifica igual que el nombre.'),
      f('skl_seguridad', 'un correo con un archivo del cliente', 'Verificar la dirección completa antes de enviar', ['Confiar en el autocompletado', 'Enviarlo en copia oculta a todos', 'Enviarlo sin asunto'], 'El autocompletado es la causa número uno de envíos al destinatario equivocado.'),
      f('skl_confidencial', 'una foto del mostrador para redes sociales', 'No tomarla si hay documentos o pantallas visibles', ['Tomarla y difuminar después', 'Tomarla de lejos', 'Tomarla fuera del horario'], 'Difuminar después supone que alguien revisó la foto, y nadie la revisa.'),
      f('skl_seguridad', 'una memoria USB que alguien deja en recepción', 'Entregarla al área de sistemas sin conectarla', ['Conectarla para ver de quién es', 'Guardarla en el cajón', 'Devolverla a quien la reclame'], 'Conectarla para identificarla es exactamente el vector que se busca evitar.'),
    ],
  },
  {
    slug: 'sistema-interno-basico',
    title: 'El sistema interno',
    objective: 'Capturar una consulta nueva con los 6 campos obligatorios en menos de 2 minutos y sin duplicados',
    icon: 'monitor',
    primarySkill: 'skl_sistema',
    facts: [
      f('skl_sistema', 'una persona que ya había llamado antes', 'Buscarla por teléfono antes de crear un registro nuevo', ['Crear un registro nuevo', 'Buscarla solo por nombre', 'Preguntarle si ya había llamado'], 'El duplicado divide el historial y hace que el seguimiento pierda la mitad de la conversación.'),
      f('skl_sistema', 'un campo obligatorio que no se puede llenar', 'Usar el valor "no proporcionado" en vez de dejarlo vacío o inventarlo', ['Poner un guion', 'Poner un dato aproximado', 'Saltar el registro'], 'Un valor explícito se puede filtrar y contar; un guion no.'),
      f('skl_registro', 'una nota sobre lo que dijo el cliente', 'Escribir hechos y citas, no interpretaciones', ['Escribir tu impresión del caso', 'Resumir en una palabra', 'Escribir solo lo relevante según tu criterio'], 'La interpretación de hoy se lee como hecho dentro de seis meses.'),
      f('skl_sistema', 'un registro que se creó por error', 'Marcarlo como duplicado y enlazarlo al correcto', ['Borrarlo', 'Dejarlo y usar el otro', 'Editarlo con otros datos'], 'Borrar rompe las referencias que otros registros ya hicieron a ese identificador.'),
      f('skl_sistema', 'el cierre del turno', 'Verificar que ninguna llamada del día quedó sin resultado capturado', ['Cerrar sesión y listo', 'Capturar lo pendiente mañana', 'Dejar las notas en papel'], 'Lo que no se capturó hoy se captura mal mañana, si se captura.'),
      f('skl_seguridad', 'la contraseña del sistema', 'Usar la propia y nunca la de un compañero, ni siquiera por urgencia', ['Pedirla prestada si es urgente', 'Compartirla con el supervisor', 'Anotarla en un lugar seguro'], 'La bitácora registra quién hizo qué; con una contraseña prestada, registra a la persona equivocada.'),
      f('skl_registro', 'un dato que el cliente corrige', 'Actualizar el campo y dejar nota de la corrección', ['Sobrescribir sin nota', 'Agregar el dato nuevo en notas', 'Crear un registro nuevo'], 'La nota explica por qué el dato de hoy no coincide con el del acuse de hace un mes.'),
    ],
  },
  {
    slug: 'seguimiento-prospectos',
    title: 'Seguimiento de prospectos',
    objective: 'Ejecutar la secuencia de 3 contactos en 7 días y registrar el resultado de cada intento',
    icon: 'repeat',
    primarySkill: 'skl_seguimiento',
    facts: [
      f('skl_seguimiento', 'un prospecto que no contestó el primer intento', 'Intentar en un horario distinto al del primer intento', ['Volver a marcar a la misma hora', 'Esperar a que devuelva la llamada', 'Marcarlo como no interesado'], 'Repetir el mismo horario repite el mismo resultado.'),
      f('skl_seguimiento', 'el tercer intento sin respuesta', 'Dejar mensaje con una vía concreta y cerrar el ciclo con nota', ['Seguir marcando indefinidamente', 'Borrar el registro', 'Marcarlo como perdido sin nota'], 'El cierre con nota permite reactivarlo si vuelve, con el contexto intacto.'),
      f('skl_notificacion', 'un mensaje de seguimiento', 'Identificar al despacho y no incluir detalles del caso', ['Incluir el motivo de la consulta', 'Enviar solo "hola"', 'Incluir el número de expediente'], 'El mensaje puede leerlo otra persona en el mismo teléfono.'),
      f('skl_seguimiento', 'un prospecto que pidió que le llamaran en un mes', 'Agendar la llamada con fecha en el sistema', ['Anotarlo en notas', 'Confiar en la memoria', 'Llamar antes por si acaso'], 'Una fecha en notas no genera recordatorio, y sin recordatorio la llamada no ocurre.'),
      f('skl_tono', 'un prospecto que dice que ya no le interesa', 'Agradecer, registrar el motivo y cerrar sin insistir', ['Insistir una vez más', 'Preguntar por qué no le interesa', 'Cerrar sin registrar el motivo'], 'El motivo agregado sobre cien casos dice más que cualquier encuesta.'),
      f('skl_registro', 'cada intento de contacto', 'Registrarlo aunque no haya habido respuesta', ['Registrar solo los contactos exitosos', 'Registrar al final de la semana', 'Registrar solo el último'], 'Sin los intentos fallidos no se puede saber si la secuencia funciona.'),
      f('skl_seguimiento', 'un prospecto que pide información por escrito', 'Enviar el material aprobado, sin agregar comentarios propios', ['Escribir una explicación personalizada', 'Enviar un enlace externo', 'Pedir que venga a la oficina'], 'El material aprobado ya pasó por revisión legal; un comentario propio, no.'),
    ],
  },
  {
    slug: 'manejo-objeciones',
    title: 'Objeciones frecuentes',
    objective: 'Responder las 6 objeciones más comunes con la respuesta aprobada, sin prometer resultados',
    icon: 'message-circle-question',
    primarySkill: 'skl_tono',
    facts: [
      f('skl_tono', 'alguien que dice que otro despacho cobra menos', 'Explicar qué incluye el servicio sin comparar con el otro despacho', ['Decir que el otro es más barato por algo', 'Ofrecer igualar el precio', 'Decir que no se puede competir con eso'], 'Comparar invita a que la decisión se tome por precio.'),
      f('skl_upl', 'una persona que pregunta si le van a ganar el caso', 'Explicar que nadie puede garantizar un resultado y describir el proceso', ['Decir que hay muchas probabilidades', 'Decir que sí, con confianza', 'Decir que no se sabe'], 'Una promesa de resultado es exactamente lo que no se puede dar, ni informalmente.', true),
      f('skl_tono', 'alguien que dice que lo tiene que consultar con su familia', 'Ofrecer agendar una cita donde pueda venir acompañado', ['Presionar para decidir hoy', 'Decir que la decisión es personal', 'Cerrar el seguimiento'], 'Incluir a quien decide de verdad acorta el ciclo en vez de alargarlo.'),
      f('skl_tono', 'una persona que desconfía de dar sus datos', 'Explicar qué se hace con la información y quién la ve', ['Insistir en que es seguro', 'Pedir solo el teléfono', 'Ofrecer no registrar nada'], 'La desconfianza baja con detalles concretos, no con la palabra "seguro".'),
      f('skl_planpago', 'alguien que dice que no puede pagar el total', 'Explicar las opciones de plan de pago disponibles', ['Ofrecer un descuento por tu cuenta', 'Decir que no hay opciones', 'Sugerir que pida prestado'], 'Los planes existen y están definidos; improvisar un descuento no está autorizado.'),
      f('skl_escalamiento', 'una objeción que no está en el material aprobado', 'Registrarla y escalarla al supervisor en vez de improvisar', ['Improvisar una respuesta razonable', 'Decir que no se puede responder', 'Cambiar de tema'], 'Las objeciones nuevas repetidas son la señal de que falta material, y solo se ve si se registran.'),
      f('skl_tono', 'una persona que ya recibió una negativa de la autoridad', 'Escuchar, registrar los hechos y agendar con abogado', ['Explicar por qué le negaron', 'Decir que aún hay opciones', 'Decir que ya no se puede hacer nada'], 'Solo el expediente completo dice qué opciones quedan.', true),
    ],
  },
  {
    slug: 'cierre-de-turno',
    title: 'Cierre de turno',
    objective: 'Cerrar el turno con 0 pendientes sin registrar y entregar 3 puntos de traspaso al siguiente turno',
    icon: 'clipboard-check',
    primarySkill: 'skl_registro',
    facts: [
      f('skl_registro', 'el final del turno con llamadas sin capturar', 'Capturarlas antes de salir, aunque implique quedarse', ['Dejarlas para el turno siguiente', 'Capturar solo las importantes', 'Enviar una nota por chat'], 'El turno siguiente no tiene el contexto para capturarlas bien.'),
      f('skl_seguimiento', 'un pendiente que no se resolvió', 'Dejarlo asignado con fecha, no solo mencionado', ['Mencionarlo en el traspaso verbal', 'Dejarlo en el chat del equipo', 'Asumir que se resolverá'], 'Un pendiente sin dueño y sin fecha no es un pendiente: es un olvido programado.'),
      f('skl_seguridad', 'la estación de trabajo al terminar', 'Cerrar sesión y guardar todo documento físico bajo llave', ['Bloquear la pantalla', 'Dejar la sesión abierta para el siguiente turno', 'Guardar los documentos en el cajón sin llave'], 'El siguiente turno debe entrar con su propio usuario para que la bitácora sirva.'),
      f('skl_escalamiento', 'un caso urgente que quedó abierto', 'Avisarlo en persona al siguiente turno y dejarlo marcado', ['Dejarlo marcado nada más', 'Avisarlo por chat', 'Esperar a mañana'], 'Lo urgente se traspasa hablando; lo demás, por el sistema.'),
      f('skl_registro', 'el conteo del día', 'Verificar que el número de llamadas atendidas coincida con los registros', ['Reportar el número aproximado', 'No reportar nada', 'Reportar solo las agendadas'], 'La diferencia entre atendidas y registradas es la métrica que revela el hueco.'),
      f('skl_sistema', 'un error detectado al cierre', 'Corregirlo y dejar nota, aunque ya no haya nadie', ['Corregirlo sin nota', 'Reportarlo mañana', 'Dejarlo como está'], 'La nota evita que mañana alguien "corrija" la corrección.'),
      f('skl_tono', 'el traspaso al siguiente turno', 'Entregar en persona los tres puntos más importantes', ['Enviarlos por correo', 'Dejarlos escritos en el sistema', 'Suponer que los verá'], 'Tres puntos dichos se retienen; una lista larga escrita, no.'),
    ],
  },
];

/* ====================================================== CURSO B · Expediente Impecable */

const B: readonly UnitTopic[] = [
  {
    slug: 'anatomia-expediente',
    title: 'Anatomía de un expediente',
    objective: 'Armar un expediente nuevo con las 7 secciones obligatorias en menos de 15 minutos',
    icon: 'folder-open',
    primarySkill: 'skl_expediente',
    facts: [
      f('skl_expediente', 'un expediente que se abre hoy', 'Crear las siete secciones aunque estén vacías', ['Crear solo las secciones con documentos', 'Crearlas conforme lleguen los documentos', 'Usar una sola sección general'], 'Una sección vacía es una pregunta pendiente visible; una sección inexistente es un hueco invisible.'),
      f('skl_expediente', 'un documento que no encaja en ninguna sección', 'Colocarlo en correspondencia y dejar nota del porqué', ['Crear una sección nueva', 'Dejarlo fuera del expediente', 'Ponerlo en la primera sección'], 'Crear secciones a discreción rompe la comparabilidad entre expedientes.'),
      f('skl_documentos', 'la portada del expediente', 'Mantenerla actualizada con el estatus y la próxima fecha', ['Actualizarla al cerrar el caso', 'Dejarla como se creó', 'Actualizarla solo si cambia el abogado'], 'La portada es lo único que alguien lee cuando toma un caso ajeno con prisa.'),
      f('skl_expediente', 'un caso que se transfiere a otro abogado', 'Verificar las siete secciones antes de traspasar', ['Traspasar y avisar de lo que falta', 'Traspasar tal cual', 'Completar lo que falte después'], 'Lo que falta al traspasar rara vez se completa: ya no es de nadie.'),
      f('skl_registro', 'una anotación en el expediente', 'Fecharla y firmarla con el usuario que la hizo', ['Anotarla sin fecha', 'Firmar al final del día', 'Dejar que el sistema lo infiera'], 'Sin fecha y autor, la anotación no sirve como evidencia de nada.'),
      f('skl_documentos', 'un documento en un idioma distinto', 'Registrar el idioma y marcar si requiere traducción certificada', ['Traducirlo uno mismo', 'Archivarlo sin marcar', 'Devolverlo al cliente'], 'La traducción certificada tiene requisitos propios y un plazo que hay que empezar a contar.', true),
      f('skl_expediente', 'un expediente con documentos duplicados', 'Conservar el original marcado y archivar la copia como tal', ['Borrar el duplicado', 'Conservar los dos sin marcar', 'Conservar el más reciente'], 'Dos documentos iguales sin marcar producen dos versiones de la verdad.'),
    ],
  },
  {
    slug: 'control-documentos',
    title: 'Control de documentos',
    objective: 'Registrar la entrada de un documento con acuse en menos de 5 minutos y 0 documentos sin acuse',
    icon: 'file-check',
    primarySkill: 'skl_documentos',
    facts: [
      f('skl_documentos', 'un documento original que entrega el cliente', 'Sellar acuse, escanear y devolver el original el mismo día', ['Quedarse el original hasta el final del caso', 'Escanear y devolver sin acuse', 'Devolverlo sin escanear'], 'Retener originales sin necesidad genera reclamaciones que consumen más tiempo que escanear.'),
      f('skl_documentos', 'un documento que llega por correo electrónico', 'Guardarlo en el expediente y registrar fecha y remitente', ['Dejarlo en el correo', 'Imprimirlo y archivarlo en físico', 'Reenviarlo al abogado'], 'Un documento que solo vive en un buzón desaparece cuando esa persona cambia de puesto.'),
      f('skl_documentos', 'un acuse que el cliente pide', 'Entregarlo en el momento, con el detalle de lo recibido', ['Enviarlo después por correo', 'Entregar un acuse genérico', 'Explicar que no es necesario'], 'El detalle es lo que convierte el acuse en prueba.'),
      f('skl_seguridad', 'un documento con datos sensibles que hay que compartir', 'Enviarlo por el canal autorizado, nunca por mensajería personal', ['Enviarlo por WhatsApp si el cliente lo pide', 'Enviarlo comprimido con contraseña por chat', 'Entregarlo en persona siempre'], 'Que el cliente lo pida no autoriza el canal: la obligación es del despacho.'),
      f('skl_documentos', 'un documento vencido en el expediente', 'Marcarlo como vencido y solicitar el vigente, sin retirarlo', ['Retirarlo del expediente', 'Sustituirlo por el nuevo', 'Dejarlo sin marcar'], 'El histórico importa: lo que estuvo vigente en su momento explica decisiones pasadas.'),
      f('skl_verificacion', 'una copia de identificación', 'Verificar que sea legible y esté completa antes de archivarla', ['Archivarla tal como llegó', 'Pedir el original', 'Archivar solo el frente'], 'Una copia ilegible se descubre el día que hay que usarla, y ese día no hay tiempo.'),
      f('skl_documentos', 'un documento que el cliente dice haber entregado', 'Buscar en el acuse antes de afirmar que no se recibió', ['Afirmar que no llegó', 'Pedir que lo entregue otra vez', 'Buscar solo en el expediente'], 'El acuse es la única fuente que zanja la discusión.'),
    ],
  },
  {
    slug: 'plazos-y-vencimientos',
    title: 'Plazos y vencimientos',
    objective: 'Registrar todo plazo con 2 recordatorios previos y verificar 0 plazos sin responsable asignado',
    icon: 'alarm-clock',
    primarySkill: 'skl_plazos',
    facts: [
      f('skl_plazos', 'un plazo que aparece en un documento recibido', 'Registrarlo el mismo día con responsable y dos recordatorios', ['Registrarlo cuando se trabaje el caso', 'Anotarlo en el expediente', 'Avisar al abogado por chat'], 'Un plazo que solo vive en un documento depende de que alguien vuelva a leer el documento.', true),
      f('skl_plazos', 'un plazo cuya fecha exacta no está clara', 'Registrar la fecha más conservadora y marcarla para confirmar', ['Registrar la más holgada', 'Esperar a confirmarla para registrarla', 'Registrar un rango'], 'La fecha conservadora deja margen; la holgada consume el margen que aún no sabes si tienes.', true),
      f('skl_plazos', 'un recordatorio de plazo que se dispara', 'Confirmar el estado y responder al recordatorio, aunque falte tiempo', ['Posponerlo', 'Descartarlo si aún hay margen', 'Reasignarlo'], 'Un recordatorio descartado ya no vuelve: era el margen.'),
      f('skl_escalamiento', 'un plazo que no se va a cumplir', 'Escalarlo en cuanto se sepa, no cuando venza', ['Trabajar más rápido y avisar si falla', 'Avisar el día del vencimiento', 'Pedir una prórroga sin avisar'], 'Escalado con días de margen hay opciones; escalado el mismo día, solo hay daños.'),
      f('skl_plazos', 'un plazo cumplido', 'Registrar la evidencia del cumplimiento junto al plazo', ['Marcarlo como cumplido', 'Archivar la evidencia en su sección', 'Avisar al cliente'], 'La evidencia junto al plazo es lo que permite responder una pregunta seis meses después en un minuto.'),
      f('skl_notificacion', 'un plazo que involucra al cliente', 'Notificarle con anticipación y registrar la notificación', ['Notificar el día previo', 'Suponer que ya lo sabe', 'Notificar solo si es obligatorio'], 'La notificación registrada protege al cliente y al despacho por igual.'),
      f('skl_plazos', 'un calendario con varios plazos el mismo día', 'Priorizar por consecuencia de incumplimiento, no por orden de llegada', ['Atenderlos por orden de llegada', 'Atender primero el más rápido', 'Repartirlos entre el equipo'], 'No todos los vencimientos cuestan lo mismo, y el orden de llegada no lo sabe.'),
    ],
  },
  {
    slug: 'privilegio-comunicaciones',
    title: 'Privilegio y comunicaciones',
    objective: 'Clasificar 10 comunicaciones como privilegiadas o no, y aplicar la marca correspondiente en 100%',
    icon: 'shield',
    primarySkill: 'skl_privilegio',
    facts: [
      f('skl_privilegio', 'una comunicación entre el abogado y el cliente sobre el caso', 'Marcarla como privilegiada y archivarla en la sección correspondiente', ['Archivarla en correspondencia general', 'Marcarla solo si el abogado lo pide', 'No marcarla'], 'La marca es lo que permite separarla si alguna vez se solicita el expediente.', true),
      f('skl_privilegio', 'una conversación con un tercero presente', 'Registrar quién estuvo presente, porque puede afectar el privilegio', ['Registrar solo el contenido', 'Omitir la presencia del tercero', 'Pedir que el tercero se retire después'], 'Quién estuvo presente es un hecho del expediente, no un detalle.', true),
      f('skl_privilegio', 'un correo del cliente reenviado a un familiar', 'Registrar el hecho y consultar al abogado antes de continuar el hilo', ['Continuar el hilo normalmente', 'Pedir que no reenvíe', 'Borrar el hilo'], 'El reenvío es un hecho relevante que el abogado debe conocer.', true),
      f('skl_confidencial', 'una nota interna sobre la estrategia del caso', 'Marcarla como trabajo interno y no compartirla con el cliente', ['Compartirla si el cliente la pide', 'Archivarla como correspondencia', 'No escribirla'], 'La nota interna es útil precisamente porque es franca.'),
      f('skl_privilegio', 'una solicitud de expediente de un tercero', 'Escalarla al abogado sin entregar nada', ['Entregar solo lo no privilegiado', 'Entregar el expediente completo', 'Negarse y cerrar'], 'La clasificación de lo entregable es una decisión legal.', true),
      f('skl_seguridad', 'una llamada del cliente desde un lugar público', 'Ofrecer devolver la llamada cuando esté en un lugar privado', ['Hablar normalmente', 'Hablar solo de generalidades', 'Pedir que envíe correo'], 'El riesgo está del lado del cliente, y avisarlo es parte del servicio.'),
      f('skl_registro', 'la clasificación de una comunicación', 'Aplicarla al archivar, no en una revisión posterior', ['Clasificar todo al cierre del caso', 'Clasificar solo lo dudoso', 'Dejar la clasificación al abogado'], 'La revisión posterior de cientos de documentos no ocurre.'),
    ],
  },
  {
    slug: 'verificacion-datos',
    title: 'Verificación de datos',
    objective: 'Verificar los 5 datos críticos de un expediente contra documento fuente con 0 discrepancias sin nota',
    icon: 'search-check',
    primarySkill: 'skl_verificacion',
    facts: [
      f('skl_verificacion', 'el nombre del cliente en el expediente', 'Verificarlo contra el documento oficial, letra por letra', ['Copiarlo de lo que dictó', 'Usar el que aparece en el correo', 'Corregir lo que parezca un error'], 'Un acento o un apellido de más cambian la identidad para un sistema.'),
      f('skl_verificacion', 'una fecha que aparece distinta en dos documentos', 'Registrar la discrepancia y escalarla, sin elegir una', ['Usar la más reciente', 'Usar la del documento oficial', 'Preguntar al cliente y usar esa'], 'Elegir una borra la discrepancia, que es justamente el dato importante.'),
      f('skl_verificacion', 'un número de expediente que el cliente dicta', 'Confirmarlo repitiéndolo dígito por dígito', ['Anotarlo como lo dictó', 'Buscarlo por nombre', 'Pedirlo por escrito'], 'Los dígitos por teléfono se confunden de forma predecible.'),
      f('skl_registro', 'un dato que se corrige', 'Dejar el valor anterior en la nota de corrección', ['Sobrescribirlo', 'Agregar el nuevo sin quitar el viejo', 'Crear un registro nuevo'], 'Sin el valor anterior no se puede explicar un documento emitido con el dato viejo.'),
      f('skl_verificacion', 'una dirección que no coincide con el comprobante', 'Registrar ambas y marcar cuál es la vigente', ['Usar la del comprobante', 'Usar la que dijo el cliente', 'Dejar la que ya estaba'], 'Las notificaciones se envían a la vigente, pero el histórico explica las anteriores.'),
      f('skl_verificacion', 'un documento sin fecha visible', 'Registrar "sin fecha" y solicitar aclaración', ['Poner la fecha de recepción', 'Estimar la fecha', 'Dejar el campo vacío'], 'La fecha de recepción no es la fecha del documento, y confundirlas cambia plazos.'),
      f('skl_sistema', 'una verificación completada', 'Marcar el expediente como verificado con fecha y responsable', ['Marcarlo como verificado sin más', 'No marcarlo', 'Avisar al abogado'], 'Sin responsable, la verificación no se puede auditar ni repetir.'),
    ],
  },
  {
    slug: 'notificaciones-cliente',
    title: 'Notificar al cliente',
    objective: 'Notificar un avance con la plantilla aprobada en menos de 24 horas y registrar el acuse en 100%',
    icon: 'send',
    primarySkill: 'skl_notificacion',
    facts: [
      f('skl_notificacion', 'un avance relevante en el caso', 'Notificar dentro de 24 horas por el canal registrado', ['Esperar a tener más avances', 'Notificar en la próxima cita', 'Notificar solo si el cliente pregunta'], 'El silencio se interpreta como abandono, y produce más llamadas que la notificación.'),
      f('skl_notificacion', 'una notificación enviada', 'Registrar fecha, canal y si hubo acuse', ['Registrar solo que se envió', 'Registrar al final de la semana', 'No registrar las rutinarias'], 'Sin acuse registrado, "yo le avisé" no es verificable.'),
      f('skl_notificacion', 'una mala noticia sobre el caso', 'Comunicarla por teléfono y confirmar por escrito después', ['Enviarla por escrito solamente', 'Esperar a la siguiente cita', 'Comunicarla solo por teléfono'], 'Por escrito sin voz se lee peor de lo que es; por voz sin escrito no queda registro.'),
      f('skl_notificacion', 'un cliente que no responde a las notificaciones', 'Cambiar de canal y registrar el intento', ['Repetir el mismo canal', 'Suspender las notificaciones', 'Notificar al familiar'], 'Notificar a un familiar sin autorización es una fuga de información.'),
      f('skl_tono', 'una notificación sobre un requisito adicional', 'Explicar qué se necesita, para qué y para cuándo', ['Enviar el nombre del documento', 'Adjuntar el requerimiento oficial', 'Pedir que llame'], 'Un documento oficial sin explicación genera una llamada de pánico.'),
      f('skl_notificacion', 'la plantilla de notificación', 'Usar la aprobada y personalizar solo los campos previstos', ['Redactar una propia más clara', 'Usar la plantilla sin personalizar', 'Copiar la de otro caso'], 'Copiar la de otro caso es la vía más común de filtrar datos ajenos.'),
      f('skl_seguimiento', 'una notificación que requiere acción del cliente', 'Agendar el seguimiento en el mismo acto de notificar', ['Esperar a que responda', 'Agendar si no responde en una semana', 'Anotar el pendiente'], 'El seguimiento agendado en el momento es el único que ocurre.'),
    ],
  },
  {
    slug: 'calidad-registro',
    title: 'Calidad del registro',
    objective: 'Redactar 10 notas de expediente que cumplan los 4 criterios de calidad, con 0 interpretaciones',
    icon: 'pen-line',
    primarySkill: 'skl_registro',
    facts: [
      f('skl_registro', 'una nota sobre lo que dijo el cliente', 'Escribir la cita textual entre comillas y la fecha', ['Resumir la idea', 'Escribir la conclusión', 'Escribir tu impresión'], 'La cita textual sobrevive a la interpretación de quien lea la nota dentro de un año.'),
      f('skl_registro', 'una nota sobre una llamada no contestada', 'Registrar hora, número marcado y resultado', ['Registrar que no contestó', 'No registrar los intentos fallidos', 'Registrar al tercer intento'], 'Los intentos fallidos son la evidencia de la diligencia.'),
      f('skl_registro', 'una nota larga y desordenada', 'Reescribirla con hechos, fechas y siguiente paso', ['Dejarla como está, es información', 'Borrarla', 'Resumirla en una línea'], 'La nota que nadie puede leer equivale a no tenerla, con el costo de aparentar que sí.'),
      f('skl_registro', 'información que otro compañero aportó', 'Registrar quién la aportó y cuándo', ['Registrarla como propia', 'No registrar la fuente', 'Pedirle que la registre él'], 'La fuente permite volver a preguntar cuando el dato no cuadra.'),
      f('skl_registro', 'una nota que contiene una opinión necesaria', 'Marcarla explícitamente como valoración, separada de los hechos', ['No incluir opiniones', 'Incluirla sin marcar', 'Incluirla en otro campo'], 'La opinión marcada es útil; la opinión mezclada con hechos contamina los hechos.'),
      f('skl_sistema', 'una nota con un error de captura', 'Corregirla dejando visible que hubo corrección', ['Borrarla y escribirla de nuevo', 'Corregirla en silencio', 'Añadir otra nota que la contradiga'], 'La corrección visible es lo que distingue un expediente confiable de uno editado.'),
      f('skl_registro', 'el cierre de una gestión', 'Registrar el siguiente paso con responsable y fecha', ['Registrar que quedó pendiente', 'Registrar la conclusión', 'Cerrar sin siguiente paso'], 'Un expediente sin siguiente paso es un expediente detenido que nadie ve detenido.'),
    ],
  },
  {
    slug: 'traspaso-de-casos',
    title: 'Traspaso de casos',
    objective: 'Traspasar un caso con la lista de 8 puntos completa y 0 pendientes sin responsable',
    icon: 'arrow-left-right',
    primarySkill: 'skl_expediente',
    facts: [
      f('skl_expediente', 'un caso que cambia de responsable', 'Recorrer la lista de traspaso punto por punto con quien recibe', ['Enviar el expediente y avisar', 'Explicar lo importante de palabra', 'Dejar notas en el sistema'], 'El traspaso es la ocasión en que se detecta lo que falta; hecho por correo, no se detecta.'),
      f('skl_plazos', 'los plazos vigentes al traspasar', 'Reasignarlos explícitamente a quien recibe', ['Dejarlos asignados a quien entrega', 'Reasignarlos al supervisor', 'Dejarlos sin responsable'], 'Un plazo asignado a alguien que ya no lleva el caso no dispara para nadie.'),
      f('skl_notificacion', 'el cliente cuyo caso se traspasa', 'Notificarle el cambio y presentar al nuevo responsable', ['No notificar si el cambio es interno', 'Notificar cuando pregunte', 'Notificar por escrito solamente'], 'Enterarse por accidente destruye la confianza más que el cambio en sí.'),
      f('skl_expediente', 'un pendiente que quien entrega no alcanzó a resolver', 'Dejarlo explícito en la lista con su contexto', ['Resolverlo antes de traspasar', 'Mencionarlo de palabra', 'Omitirlo si es menor'], 'El pendiente omitido reaparece como urgencia tres semanas después.'),
      f('skl_registro', 'el acta de traspaso', 'Firmarla ambas partes y archivarla en el expediente', ['Registrarla en el sistema', 'Enviarla por correo', 'Omitirla si el traspaso fue simple'], 'La firma de ambos es lo que convierte el traspaso en un hecho y no en un recuerdo.'),
      f('skl_escalamiento', 'un desacuerdo sobre el estado del caso al traspasar', 'Registrar ambas posturas y escalar antes de firmar', ['Firmar y aclarar después', 'Firmar la versión de quien entrega', 'Posponer el traspaso'], 'Firmado, el desacuerdo desaparece del registro y reaparece como problema.'),
      f('skl_expediente', 'un caso recibido', 'Verificar la lista antes de aceptarlo como propio', ['Aceptarlo y revisar después', 'Confiar en quien entrega', 'Revisar solo los plazos'], 'Después de aceptar, lo que falte ya es responsabilidad de quien recibió.'),
    ],
  },
  {
    slug: 'auditoria-interna',
    title: 'Auditoría interna del expediente',
    objective: 'Auditar un expediente contra los 12 criterios y documentar cada hallazgo con su corrección',
    icon: 'clipboard-list',
    primarySkill: 'skl_expediente',
    facts: [
      f('skl_expediente', 'un hallazgo de auditoría', 'Documentarlo con criterio, evidencia y corrección propuesta', ['Documentar el hallazgo', 'Corregirlo sin documentar', 'Reportarlo verbalmente'], 'Sin criterio y evidencia, el hallazgo se discute en vez de corregirse.'),
      f('skl_expediente', 'un expediente que pasa la auditoría', 'Registrar la fecha de auditoría y quién la hizo', ['Marcarlo como correcto', 'No registrar los que pasan', 'Registrar solo el resultado'], 'Sin fecha no se sabe si la auditoría es de antes o después del cambio que rompió algo.'),
      f('skl_documentos', 'un documento faltante detectado en auditoría', 'Solicitarlo y registrar la solicitud con fecha', ['Marcarlo como faltante', 'Solicitarlo verbalmente', 'Esperar a que llegue'], 'La solicitud con fecha empieza a contar el tiempo de espera.'),
      f('skl_registro', 'una corrección derivada de auditoría', 'Enlazarla al hallazgo que la originó', ['Aplicarla y cerrar el hallazgo', 'Registrarla como cambio normal', 'Aplicarla sin registro'], 'El enlace es lo que permite medir si las auditorías sirven de algo.'),
      f('skl_escalamiento', 'un hallazgo que se repite en varios expedientes', 'Escalarlo como problema de proceso, no de expediente', ['Corregir cada expediente', 'Reportar cada uno por separado', 'Corregir y no reportar'], 'Corregir cien veces el mismo error es más caro que arreglar el proceso una vez.'),
      f('skl_expediente', 'un expediente cerrado que se audita', 'Auditarlo con los criterios vigentes al momento del cierre', ['Auditarlo con los criterios de hoy', 'No auditar expedientes cerrados', 'Auditar solo los recientes'], 'Juzgar el pasado con reglas nuevas produce hallazgos que nadie pudo evitar.'),
      f('skl_seguimiento', 'el ciclo de auditoría', 'Verificar en la siguiente ronda que las correcciones se aplicaron', ['Cerrar la ronda al documentar', 'Confiar en que se aplicaron', 'Auditar expedientes distintos'], 'Sin verificación, la auditoría produce documentos en vez de cambios.'),
    ],
  },
];

/* ==================================================== CURSO C · Cobranza con Dignidad */

const C: readonly UnitTopic[] = [
  {
    slug: 'fundamentos-cobranza',
    title: 'Fundamentos de la gestión de cobro',
    objective: 'Preparar una gestión de cobro revisando los 4 datos del saldo antes de marcar, en 100% de los casos',
    icon: 'wallet',
    primarySkill: 'skl_cobranza',
    facts: [
      f('skl_cobranza', 'una gestión de cobro que va a iniciar', 'Revisar saldo, últimos pagos, plan vigente y notas antes de marcar', ['Marcar y consultar durante la llamada', 'Revisar solo el saldo', 'Revisar el expediente completo'], 'Llamar sin contexto obliga a la persona a explicar lo que ya está registrado.'),
      f('skl_conciliacion', 'un saldo que no coincide con lo que dice el cliente', 'Detener la gestión y conciliar antes de continuar', ['Sostener el saldo del sistema', 'Aceptar el del cliente', 'Continuar y aclarar después'], 'Cobrar sobre un saldo en disputa destruye la relación y el cobro.'),
      f('skl_cobranza', 'un cliente que ya pagó pero no está registrado', 'Pedir el comprobante, registrarlo y disculparse por la gestión', ['Pedir que pague otra vez', 'Anotar que dice haber pagado', 'Escalar sin registrar'], 'El comprobante cierra el asunto en un minuto; la duda lo alarga semanas.'),
      f('skl_tono', 'el saludo de una llamada de cobro', 'Identificarse, identificar al despacho y verificar con quién se habla', ['Preguntar directamente por el pago', 'Identificarse solo por nombre', 'Preguntar si es quien contesta'], 'Hablar del adeudo con quien no es el titular es una fuga de información.', true),
      f('skl_registro', 'el resultado de una gestión', 'Registrar compromiso, monto y fecha, o el motivo de no haberlo', ['Registrar que se contactó', 'Registrar solo los compromisos', 'Registrar al final del día'], 'Sin motivo, cien gestiones sin compromiso no dicen qué está fallando.'),
      f('skl_cobranza', 'un cliente que promete pagar sin dar fecha', 'Proponer dos fechas concretas y registrar la que acepte', ['Aceptar la promesa', 'Insistir en el pago inmediato', 'Registrar "pagará pronto"'], 'Una promesa sin fecha no se puede dar seguimiento ni medir.'),
      f('skl_seguimiento', 'un compromiso de pago vencido', 'Contactar el día siguiente hábil, no antes ni mucho después', ['Contactar el mismo día', 'Esperar una semana', 'Esperar a que el cliente llame'], 'El día siguiente comunica atención sin comunicar acoso.'),
    ],
  },
  {
    slug: 'practicas-permitidas',
    title: 'Lo que la política permite y lo que no',
    objective: 'Identificar en 10 escenarios qué prácticas de cobro autoriza la política del despacho, con 0 errores',
    icon: 'scale',
    primarySkill: 'skl_fdcpa',
    facts: [
      f('skl_fdcpa', 'un cliente que pide que no lo llamen a su trabajo', 'Registrar la restricción y respetarla en todos los canales', ['Llamar solo en emergencias', 'Llamar si no contesta en otro número', 'Pedir autorización del supervisor'], 'La restricción registrada aplica sin excepciones y sin necesidad de recordarla.', true),
      f('skl_fdcpa', 'el horario para contactar a un cliente', 'Respetar la ventana definida por la política, en la zona horaria del cliente', ['Llamar en horario de oficina propio', 'Llamar cuando conteste', 'Llamar antes de las 8 de la mañana'], 'La zona horaria del cliente es la que cuenta, y en un despacho con oficinas en dos países no coincide.', true),
      f('skl_fdcpa', 'un tercero que contesta el teléfono del cliente', 'Pedir hablar con el titular sin mencionar el motivo', ['Explicar que es por un adeudo', 'Dejar recado con el monto', 'Preguntar cuándo puede pagar'], 'Mencionar el adeudo a un tercero es una fuga, aunque sea un familiar.', true),
      f('skl_fdcpa', 'un cliente que dice que tiene abogado para este asunto', 'Detener el contacto directo y escalarlo', ['Continuar hasta que lo demuestre', 'Pedir los datos del abogado y seguir', 'Registrar y continuar'], 'A partir de ese aviso el canal cambia, y continuar es un incumplimiento.', true),
      f('skl_tono', 'un cliente que se muestra molesto', 'Mantener el tono, no elevar la voz ni presionar', ['Igualar el tono para que entienda', 'Terminar la llamada', 'Insistir con más firmeza'], 'La firmeza se comunica con contenido, no con volumen.'),
      f('skl_fdcpa', 'un mensaje escrito de cobro', 'Usar la plantilla aprobada, sin datos del adeudo en la vista previa', ['Redactar uno claro y directo', 'Incluir el monto para que sea concreto', 'Enviar solo "comuníquese"'], 'La vista previa del mensaje la ve cualquiera que tome el teléfono.', true),
      f('skl_escalamiento', 'una práctica que un compañero sugiere y no está en la política', 'No aplicarla y escalarla al supervisor', ['Aplicarla si funciona', 'Aplicarla una vez y evaluar', 'Ignorar la sugerencia'], 'Lo que funciona sin estar autorizado es exactamente lo que produce la demanda.'),
    ],
  },
  {
    slug: 'planes-de-pago',
    title: 'Planes de pago',
    objective: 'Construir un plan de pago con los 5 parámetros dentro de rango y 0 planes fuera de política',
    icon: 'calendar-clock',
    primarySkill: 'skl_planpago',
    facts: [
      f('skl_planpago', 'un cliente que no puede pagar el total', 'Proponer un plan dentro de los rangos autorizados', ['Proponer el plazo que pida', 'Ofrecer un descuento', 'Derivar al supervisor siempre'], 'Los rangos existen para que el plan sea sostenible, no para limitar la atención.'),
      f('skl_planpago', 'un plan que el cliente pide fuera de rango', 'Registrar la solicitud y escalarla, sin comprometerla', ['Aceptarlo y avisar después', 'Rechazarlo de inmediato', 'Proponer el rango máximo'], 'Comprometer algo que no está autorizado convierte una negociación en un incumplimiento.'),
      f('skl_planpago', 'el primer pago de un plan', 'Fijarlo lo más cerca posible de la fecha del acuerdo', ['Fijarlo al mes siguiente', 'Dejarlo a elección del cliente', 'Fijarlo al final del plan'], 'El primer pago cercano es el mejor predictor de que el plan se cumpla.'),
      f('skl_planpago', 'un plan acordado', 'Confirmarlo por escrito con montos y fechas antes de terminar la llamada', ['Confirmarlo verbalmente', 'Enviar la confirmación al día siguiente', 'Registrarlo en el sistema'], 'La confirmación escrita del mismo día evita la discusión sobre lo que se acordó.'),
      f('skl_planpago', 'un plan que se incumple en la primera cuota', 'Contactar para reestructurar antes de escalar', ['Cancelar el plan', 'Escalar de inmediato', 'Esperar a la segunda cuota'], 'Reestructurar a tiempo recupera más que cancelar.'),
      f('skl_conciliacion', 'un pago que no corresponde a ninguna cuota', 'Aplicarlo según la política de aplicación y notificar al cliente', ['Aplicarlo a la cuota más antigua', 'Aplicarlo a capital', 'Dejarlo sin aplicar'], 'La política define el orden; aplicarlo a criterio produce saldos que nadie puede explicar.'),
      f('skl_registro', 'los parámetros de un plan', 'Capturarlos en los campos del sistema, no en notas', ['Capturarlos en notas', 'Adjuntar el acuerdo', 'Capturar solo el total'], 'En notas, el plan no genera recordatorios ni aparece en los reportes de cartera.'),
    ],
  },
  {
    slug: 'recibos-comprobantes',
    title: 'Recibos y comprobantes',
    objective: 'Emitir un recibo con los 6 datos obligatorios en el mismo acto y 0 pagos sin comprobante',
    icon: 'receipt',
    primarySkill: 'skl_recibo',
    facts: [
      f('skl_recibo', 'un pago recibido en efectivo', 'Emitir el recibo en el momento y entregar copia', ['Emitirlo al final del día', 'Registrarlo y emitir después', 'Emitirlo si el cliente lo pide'], 'Un pago en efectivo sin recibo inmediato es la situación que más disputas genera.'),
      f('skl_recibo', 'un pago por transferencia', 'Registrarlo con el folio de la operación', ['Registrar el monto y la fecha', 'Esperar la conciliación bancaria', 'Registrar lo que dijo el cliente'], 'El folio es lo que permite encontrar la operación cuando el monto coincide con otras cinco.'),
      f('skl_recibo', 'un recibo con un error detectado después', 'Emitir la corrección referenciando el recibo original', ['Corregir el recibo original', 'Emitir uno nuevo y anular el anterior sin nota', 'Dejarlo y aclarar de palabra'], 'La referencia es lo que hace auditable la corrección.'),
      f('skl_seguridad', 'la entrega de un recibo por medio electrónico', 'Enviarlo al correo registrado, nunca al que dicten por teléfono', ['Enviarlo al que dicten', 'Enviarlo por mensaje', 'Entregarlo solo en persona'], 'El correo registrado es el que se verificó una vez; el dictado, ninguna.'),
      f('skl_recibo', 'un pago de un tercero a nombre del cliente', 'Registrar quién paga y a nombre de quién se aplica', ['Registrarlo a nombre del cliente', 'Rechazarlo', 'Registrar solo el monto'], 'Quién paga es un dato del expediente que puede importar después.'),
      f('skl_conciliacion', 'el corte del día', 'Cuadrar recibos emitidos contra pagos registrados antes de cerrar', ['Cuadrar al día siguiente', 'Cuadrar semanalmente', 'Confiar en el sistema'], 'La diferencia detectada el mismo día se explica; la de la semana pasada, no.'),
      f('skl_recibo', 'un cliente que perdió su recibo', 'Reimprimir marcando que es copia, con la misma fecha original', ['Emitir uno nuevo con la fecha de hoy', 'Negarse porque ya se emitió', 'Emitir uno sin marca'], 'Un recibo con fecha de hoy por un pago de hace un mes descuadra la contabilidad.'),
    ],
  },
  {
    slug: 'conciliacion-saldos',
    title: 'Conciliación de saldos',
    objective: 'Conciliar una cuenta con diferencias en menos de 20 minutos y documentar el origen de cada una',
    icon: 'calculator',
    primarySkill: 'skl_conciliacion',
    facts: [
      f('skl_conciliacion', 'una diferencia entre el saldo del sistema y el del cliente', 'Reconstruir movimiento por movimiento desde el último punto de acuerdo', ['Comparar los totales', 'Revisar los últimos tres pagos', 'Pedir los comprobantes al cliente'], 'El último punto de acuerdo acota la búsqueda; comparar totales no dice dónde está la diferencia.'),
      f('skl_conciliacion', 'un movimiento sin respaldo documental', 'Marcarlo como pendiente de aclarar y no incluirlo en el saldo acordado', ['Incluirlo', 'Eliminarlo', 'Incluirlo con nota'], 'Un saldo acordado que incluye lo no comprobado se vuelve a disputar.'),
      f('skl_conciliacion', 'una conciliación terminada', 'Documentar el saldo acordado y hacerlo firmar o confirmar por escrito', ['Registrar el nuevo saldo', 'Comunicarlo por teléfono', 'Actualizar el sistema'], 'Sin confirmación del cliente, la conciliación es unilateral.'),
      f('skl_conciliacion', 'un descuento aplicado hace meses sin registro', 'Registrarlo retroactivamente con la autorización correspondiente', ['Ignorarlo', 'Registrarlo con fecha de hoy', 'Anularlo'], 'Sin la autorización, el descuento no se puede sostener en una auditoría.'),
      f('skl_escalamiento', 'una diferencia que no se puede explicar', 'Escalarla con el detalle reconstruido, no con el total', ['Escalar el total', 'Ajustar el saldo', 'Dejarla pendiente'], 'El detalle reconstruido es lo que permite que otro la resuelva sin repetir el trabajo.'),
      f('skl_registro', 'el resultado de la conciliación', 'Enlazarlo a los movimientos que la originaron', ['Registrar el saldo final', 'Adjuntar el documento', 'Anotar el resumen'], 'El enlace evita reconstruir todo otra vez la próxima disputa.'),
      f('skl_notificacion', 'el cliente después de conciliar', 'Enviarle el estado de cuenta actualizado el mismo día', ['Enviarlo en el próximo corte', 'Enviarlo si lo pide', 'Comunicarle el saldo por teléfono'], 'El estado de cuenta del mismo día cierra el tema; el del próximo corte lo reabre.'),
    ],
  },
  {
    slug: 'conversaciones-dificiles',
    title: 'Conversaciones difíciles',
    objective: 'Conducir 5 escenarios de conversación difícil manteniendo el guion y 0 compromisos no autorizados',
    icon: 'messages-square',
    primarySkill: 'skl_tono',
    facts: [
      f('skl_tono', 'un cliente que llora durante la llamada', 'Hacer una pausa, reconocer y ofrecer continuar en otro momento', ['Continuar con el guion', 'Terminar la llamada', 'Ofrecer una condonación'], 'La pausa reconoce sin comprometer nada que no esté autorizado.'),
      f('skl_tono', 'un cliente que amenaza con demandar', 'Registrar textualmente lo dicho y escalarlo el mismo día', ['Responder que está en su derecho', 'Tratar de convencerlo', 'Ignorarlo y continuar'], 'La cita textual es lo que permite al área legal evaluar sin interpretar.'),
      f('skl_tono', 'un cliente que insulta', 'Advertir una vez que la llamada terminará si continúa, y cumplirlo', ['Colgar de inmediato', 'Continuar la gestión', 'Responder en el mismo tono'], 'La advertencia cumplida sostiene el límite sin escalarlo.'),
      f('skl_escalamiento', 'un cliente que menciona una situación de salud grave', 'Detener la gestión de cobro y escalar a supervisión', ['Ofrecer un plan flexible', 'Continuar con sensibilidad', 'Registrar y continuar la próxima semana'], 'Estas situaciones tienen un procedimiento propio que no es de cobranza.'),
      f('skl_planpago', 'un cliente que pide una condonación', 'Explicar que se evalúa por escrito y registrar la solicitud', ['Negarla', 'Ofrecer un descuento parcial', 'Prometer evaluarla favorablemente'], 'La evaluación por escrito protege al cliente de una negativa informal y al gestor de una promesa.'),
      f('skl_tono', 'una llamada que se sale de control', 'Cerrarla con un compromiso de contacto y registrar el estado', ['Cerrarla sin compromiso', 'Transferirla', 'Alargarla hasta resolver'], 'El compromiso de contacto convierte una llamada fallida en un paso del proceso.'),
      f('skl_registro', 'una conversación difícil ya terminada', 'Registrarla con detalle mayor al habitual', ['Registrarla como una gestión normal', 'Registrar solo el resultado', 'Registrarla al final del día'], 'Estas son las llamadas que alguien va a releer, y el detalle es lo que las hace útiles.'),
    ],
  },
  {
    slug: 'escalamiento-cierre',
    title: 'Escalamiento y cierre de cartera',
    objective: 'Aplicar los 4 criterios de escalamiento y cerrar una gestión con la documentación completa',
    icon: 'arrow-up-circle',
    primarySkill: 'skl_escalamiento',
    facts: [
      f('skl_escalamiento', 'una cuenta con tres compromisos incumplidos', 'Escalarla con el historial de los tres compromisos', ['Escalarla con el saldo', 'Dar una cuarta oportunidad', 'Cerrarla como incobrable'], 'El historial es lo que permite decidir sin repetir la gestión.'),
      f('skl_escalamiento', 'el momento de escalar', 'Escalar cuando se cumple el criterio, no cuando se agota la paciencia', ['Escalar tras varios intentos', 'Escalar si el cliente lo pide', 'Escalar al final del mes'], 'El criterio hace comparables las decisiones entre gestores.'),
      f('skl_cobranza', 'una cuenta que se recupera tras el escalamiento', 'Registrar qué acción la recuperó', ['Registrar que se recuperó', 'Cerrar el escalamiento', 'Notificar al supervisor'], 'Saber qué funcionó es lo único que mejora la siguiente cartera.'),
      f('skl_registro', 'el cierre de una gestión de cobro', 'Documentar el resultado, la evidencia y el siguiente paso o su ausencia', ['Documentar el resultado', 'Cerrar sin documentar', 'Documentar solo los cierres exitosos'], 'Un cierre sin documentar impide auditar la cartera y repite el trabajo.'),
      f('skl_conciliacion', 'una cuenta que se cierra con saldo', 'Verificar que el saldo esté conciliado antes de cerrar', ['Cerrar con el saldo del sistema', 'Cerrar y conciliar después', 'Ajustar el saldo a cero'], 'Un saldo no conciliado al cierre reaparece como reclamación meses después.'),
      f('skl_notificacion', 'el cliente cuya cuenta se cierra', 'Notificarle el cierre y el estado final por escrito', ['No notificar si el saldo es cero', 'Notificar por teléfono', 'Notificar solo si hay saldo'], 'La notificación de cierre evita que el cliente crea que sigue debiendo.'),
      f('skl_escalamiento', 'un caso escalado que regresa sin resolver', 'Registrar por qué regresó antes de retomar la gestión', ['Retomar la gestión', 'Volver a escalarlo', 'Cerrarlo'], 'Sin el motivo del regreso, la gestión repite exactamente lo que ya falló.'),
    ],
  },
];

export const UNITS: readonly UnitTopic[] = [...A, ...B, ...C];

export const COURSE_UNIT_COUNTS: readonly [number, number, number] = [A.length, B.length, C.length];

if (UNITS.length !== 26) {
  throw new Error(`El corpus define ${String(UNITS.length)} unidades y deben ser 26`);
}
