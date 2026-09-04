/**
 * SENDA — el contenido ESCRITO por unidad: procedimientos ordenados y frases con hueco.
 *
 * Los ~2,100 ejercicios del catálogo se proyectan desde `corpus.ts`, donde cada hecho trae sujeto, acción
 * correcta y tres incorrectas. Eso alcanza para opción múltiple, verdadero/falso, selección múltiple,
 * relacionar y armar la frase. No alcanza para dos dinámicas:
 *
 * - **Ordenar** necesita un procedimiento cuyo orden sea DEFENDIBLE. Si dos pasos consecutivos se pueden
 *   intercambiar sin consecuencia, el ejercicio no mide nada aunque se vea bien. Eso hay que escribirlo.
 * - **Completar el hueco** necesita una frase cuyo contexto determine UNA sola respuesta. Un hueco que
 *   admite dos palabras igual de válidas castiga al alumno que sabe.
 *
 * Este archivo es ese contenido. Pasó por dos revisores adversariales —uno intentando intercambiar cada par
 * de pasos consecutivos, otro buscando una segunda palabra que encajara en cada hueco— y por la auditoría
 * de `procedures.test.ts`, que comprueba las 26 unidades, un solo hueco por frase, que la respuesta no
 * aparezca ya escrita en la propia frase, y que ningún paso ancle su posición nombrando a otro paso.
 *
 * `accepted` NO lleva variantes con y sin acento: `normalizeAnswer` pliega diacríticos antes de comparar,
 * así que serían dato muerto. Solo van sinónimos que sean palabras realmente distintas.
 */

export interface Cloze {
  readonly sentence: string;
  /** La canónica primero; las demás son sinónimos que un evaluador aceptaría sin dudar. */
  readonly accepted: readonly string[];
  /** Por qué ESA palabra y no otra. Es lo que el alumno lee después de contestar. */
  readonly why: string;
}

export interface UnitExtras {
  readonly procedurePrompt: string;
  /** Los pasos EN EL ORDEN CORRECTO. */
  readonly procedureItems: readonly string[];
  /** Por qué ese orden y no otro, nombrando la dependencia concreta. */
  readonly procedureWhy: string;
  readonly cloze: readonly Cloze[];
  readonly pairsPrompt: string;
}

export const EXTRAS: Readonly<Record<string, UnitExtras>> = {
  'llamada-entrante': {
    procedurePrompt: 'Ordena lo que hace recepción con una llamada entrante que pide información de un expediente.',
    procedureItems: [
      'Contestar antes del tercer timbrazo con saludo completo',
      'Preguntar el motivo de la llamada sin interrumpir',
      'Resumir el motivo en una frase y confirmarlo',
      'Verificar la identidad con dos datos del expediente',
      'Transferir avisando al área receptora y esperar respuesta',
      'Registrar motivo y resultado en el sistema',
    ],
    procedureWhy: 'Sin el motivo ya resumido y confirmado no se sabe contra qué expediente comparar los dos datos de identidad, y transferir sin esa verificación obliga al área que recibe a repetir el interrogatorio completo con el cliente en la línea.',
    cloze: [
      {
        sentence: 'El saludo completo del despacho se da antes del tercer ___, para que quien llama sepa que marcó bien.',
        accepted: ['timbrazo', 'timbre', 'tono'],
        why: 'Es lo único que la persona alcanza a contar del otro lado: al tercero ya asume que marcó mal y cuelga, y esa llamada vuelve a entrar desde cero, ahora con dudas del despacho.',
      },
      {
        sentence: 'Pasar una llamada sin avisar a quien la recibe es una transferencia en ___, y se cae.',
        accepted: ['frío'],
        why: 'Quien recibe contesta sin contexto, pregunta todo otra vez o regresa la llamada al conmutador, y la persona vuelve a marcar desde cero ya molesta: el aviso previo es lo único que evita ese rebote.',
      },
      {
        sentence: 'Antes de decir nada del expediente por teléfono se verifican ___ datos: uno solo lo adivina cualquiera que haya visto un papel del caso, y pedir más vuelve la llamada un interrogatorio.',
        accepted: ['dos'],
        why: 'El nombre y hasta el número de expediente aparecen en cualquier documento que la persona pudo ver o fotografiar; el segundo dato es el que solo conoce quien vive el caso, y ahí se cierra la verificación.',
      },
    ],
    pairsPrompt: 'Relaciona cada tipo de llamada entrante con lo que corresponde hacer antes de transferirla o colgar.',
  },
  'guion-cinco-preguntas': {
    procedurePrompt: 'Ordena el guion de cinco preguntas en una llamada de alguien que marca por primera vez.',
    procedureItems: [
      'Abrir preguntando en qué podemos ayudarle',
      'Dejar que termine su historia sin interrumpir',
      'Repetir en voz alta la fecha de audiencia',
      'Ofrecer dos horarios concretos anteriores a la audiencia',
      'Capturar las cinco respuestas en sus campos',
    ],
    procedureWhy: 'La fecha de audiencia solo aparece cuando la persona termina de contar su historia, y sin ella confirmada en voz alta se ofrecen horarios que caen después del día que importa: la consulta llega cuando el plazo ya pasó.',
    cloze: [
      {
        sentence: 'El guion abre preguntando el ___ de la llamada; los datos personales se piden después, no antes.',
        accepted: ['motivo', 'asunto', 'propósito'],
        why: 'Es lo que decide a qué área va la llamada, así que pedir los datos primero obliga a repetirlos completos en cuanto hay que transferir, y la persona cuenta su caso dos veces antes de hablar con quien puede ayudarla.',
      },
      {
        sentence: 'El dato existe pero la persona no lo quiere dar: el campo obligatorio se llena con el valor «no ___», nunca con un guion.',
        accepted: ['proporcionado'],
        why: 'Un guion no se puede filtrar ni contar, así que el reporte no distingue entre el dato que nadie pidió y el que la persona se negó a dar, y esa negativa es justo la que el abogado necesita ver antes de la consulta.',
      },
      {
        sentence: 'Para cerrar cita se ofrecen dos ___ concretos en vez de preguntar cuándo le queda bien.',
        accepted: ['horarios', 'espacios'],
        why: 'La pregunta abierta produce «yo le llamo» y la llamada muere ahí; dos opciones concretas convierten la decisión en elegir entre A y B, que sí se contesta en el momento y queda agendada.',
      },
    ],
    pairsPrompt: 'Relaciona cada respuesta que da la persona con el movimiento correcto dentro del guion de cinco preguntas.',
  },
  'limites-asesoria': {
    procedurePrompt: 'Ordena lo que hace recepción cuando la pregunta que llega roza el terreno del abogado.',
    procedureItems: [
      'Escuchar la pregunta completa antes de clasificarla',
      'Verificar si hay detención o cita con autoridad',
      'Decir que la evaluación legal corresponde al abogado',
      'Ofrecer la consulta con abogado como vía correcta',
      'Sostener el límite con amabilidad ante la insistencia',
      'Registrar la pregunta con las palabras del cliente',
    ],
    procedureWhy: 'Una detención en curso cambia la llamada entera —esa se escala al abogado de guardia, no se agenda—, así que se descarta antes de nombrar el límite, y el límite solo se sostiene cuando ya se ofreció la consulta: sostenerlo sin dar salida es exactamente lo que hace que la persona insista.',
    cloze: [
      {
        sentence: 'Evaluar si alguien califica para un beneficio es asesoría ___, y darla sin ser abogado expone a la persona y al despacho.',
        accepted: ['legal', 'jurídica'],
        why: 'Recepción sí puede decir qué documentos trae la consulta, cuánto cuesta y cuánto dura; lo que cruza la línea es el juicio sobre si el caso califica, porque eso es un dictamen y responde por él quien tiene la cédula.',
      },
      {
        sentence: 'Ante una pregunta de tiempos se da el rango publicado por la ___, nunca una fecha propia.',
        accepted: ['autoridad', 'dependencia'],
        why: 'El rango publicado es público y verificable, así que si el trámite se alarga el reclamo va contra ese calendario; una fecha dicha por recepción se recuerda como promesa del despacho y se cobra aquí.',
      },
      {
        sentence: 'Una llamada que menciona una detención en curso no se agenda: se escala al abogado de ___.',
        accepted: ['guardia', 'turno'],
        why: 'Agendarla para mañana la convierte en un caso que se atiende cuando ya hubo traslado o audiencia; ese abogado existe justamente para las horas en que el tiempo de respuesta cambia el resultado.',
      },
    ],
    pairsPrompt: 'Relaciona cada pregunta que llega a recepción con lo único que se puede responder sin dar asesoría.',
  },
  'agenda-y-citas': {
    procedurePrompt: 'Ordena lo que hace recepción cuando un cliente pide cambiar la fecha de su cita.',
    procedureItems: [
      'Confirmar en el sistema la cita vigente',
      'Liberar el espacio de la cita vigente',
      'Asignar el nuevo horario en la agenda',
      'Confirmar en voz alta fecha, hora, oficina, qué traer',
      'Programar el recordatorio 24 horas antes',
      'Registrar el cambio de cita y su motivo',
    ],
    procedureWhy: 'La cita vigente hay que leerla en el sistema porque el cliente casi siempre recuerda mal cuál tiene, y si el espacio viejo no se libera antes de asignar el nuevo quedan dos citas activas: salen dos recordatorios contradictorios y el hueco muerto ya no lo puede tomar nadie.',
    cloze: [
      {
        sentence: 'En toda cita se confirman en voz alta cuatro datos: fecha, hora, ___ y qué debe traer.',
        accepted: ['oficina', 'sede', 'lugar', 'dirección'],
        why: 'El despacho atiende en más de un domicilio y la persona repite el que ya conoce, no el que le tocó esta vez; decirlo en voz alta es lo que evita que llegue puntual al lugar equivocado y cuente como inasistencia.',
      },
      {
        sentence: 'El recordatorio de la cita se envía ___ horas antes: más tarde ya no da tiempo de reagendar y más temprano se olvida.',
        accepted: ['24', 'veinticuatro'],
        why: 'Ese margen no es para que el cliente no olvide, es para el despacho: cuando avisa que no puede, todavía queda un día hábil para ofrecerle ese espacio a alguien de la lista en vez de perder la hora.',
      },
      {
        sentence: 'Al reagendar, el espacio anterior se ___ antes de asignar el nuevo; si no, queda bloqueado para todos.',
        accepted: ['libera', 'desocupa'],
        why: 'El sistema no lo suelta solo porque el cliente ya no vaya a ir: mientras siga marcado no aparece como disponible, y la agenda del día se ve llena con una hora que nadie va a usar.',
      },
    ],
    pairsPrompt: 'Relaciona cada movimiento de agenda con la acción que mantiene el calendario sin espacios muertos.',
  },
  'primer-contacto-presencial': {
    procedurePrompt: 'Ordena la recepción de una persona que llega a la oficina con documentos en la mano.',
    procedureItems: [
      'Saludar y preguntar el motivo antes del mostrador',
      'Confirmar la cita por nombre y segundo dato',
      'Registrar la llegada antes de que tome asiento',
      'Recibir los documentos en mostrador y sellar acuse',
      'Guardar los documentos en el expediente',
      'Pasar a un espacio privado para hablar del caso',
    ],
    procedureWhy: 'El acuse se sella con el folio de la llegada ya registrada, porque un acuse suelto no dice a qué visita ni a qué expediente pertenece, y los documentos se reciben en el mostrador y no en el privado para que no crucen la oficina en la mano de nadie.',
    cloze: [
      {
        sentence: 'El registro de la llegada se hace de pie, en el mostrador: si se deja para cuando la persona ya se ___, la sala se llena de gente que el sistema no ve.',
        accepted: ['sentó', 'acomodó'],
        why: 'Nadie cronometra a quien está enfrente pidiendo atención, pero en cuanto se sienta su espera deja de ser visible: el abogado no sabe que ya lleva veinte minutos ahí y la visita no existe para el seguimiento.',
      },
      {
        sentence: 'Un documento que el cliente entrega en mostrador se recibe con ___ sellado y con el detalle de lo que se recibió.',
        accepted: ['acuse', 'recibo'],
        why: 'Sin ese papel, en tres meses la discusión es la palabra del cliente contra la del despacho sobre si el original se entregó; y el detalle escrito es lo que prueba qué se entregó, no solo que hubo algo.',
      },
      {
        sentence: 'Buscar por nombre a quien dice tener cita no basta —dos clientes pueden llamarse igual—: se confirma con un ___ dato del expediente.',
        accepted: ['segundo'],
        why: 'En una cartera grande el nombre repetido no es rareza, es cuestión de tiempo, y ese dato extra es lo que evita abrir el expediente de otra persona en la pantalla que el cliente está viendo.',
      },
    ],
    pairsPrompt: 'Relaciona cada llegada a recepción con lo primero que corresponde hacer antes de que la persona espere.',
  },
  'confidencialidad-basica': {
    procedurePrompt: 'Ordena el envío de un documento del expediente a la persona que lo solicita.',
    procedureItems: [
      'Verificar la autorización escrita en el expediente',
      'Elegir el canal que autoriza el expediente',
      'Escribir la dirección completa a mano, sin autocompletado',
      'Enviar el documento y confirmar que llegó',
      'Registrar el envío y el destinatario',
    ],
    procedureWhy: 'El canal no lo elige quien pide el documento sino la autorización escrita que ya está en el expediente, así que primero se ve quién está autorizado y recién entonces por dónde se le puede mandar: escribir la dirección es el último punto donde alguien lee de verdad al destinatario.',
    cloze: [
      {
        sentence: 'Un familiar recibe información del caso solo si el titular lo autorizó por ___ en el expediente; el parentesco no basta.',
        accepted: ['escrito'],
        why: 'La autorización es del titular y solo él la puede dar o quitar; de palabra no queda quién la dio ni cuándo, así que ante una queja el despacho no puede demostrar que estaba autorizado a hablar.',
      },
      {
        sentence: 'La causa número uno de enviar un archivo al destinatario equivocado es confiar en el ___ del correo.',
        accepted: ['autocompletado'],
        why: 'Ordena las direcciones por frecuencia y no por caso, así que ofrece primero al cliente al que más le escribiste esa semana, y el nombre se parece lo suficiente para que la vista lo dé por bueno.',
      },
      {
        sentence: 'Una memoria USB que alguien deja en recepción se entrega a ___ sin conectarla a ninguna computadora.',
        accepted: ['sistemas', 'TI', 'soporte'],
        why: 'Conectarla para ver de quién es ejecuta lo que traiga en el instante en que el equipo la reconoce, y esa es exactamente la razón por la que se dejó ahí; esa área la abre en una máquina que no toca la red del despacho.',
      },
    ],
    pairsPrompt: 'Relaciona cada escena cotidiana de la oficina con la medida que evita la fuga de información.',
  },
  'sistema-interno-basico': {
    procedurePrompt: 'Ordena la captura de una consulta nueva en el sistema, desde la búsqueda hasta el cierre.',
    procedureItems: [
      'Buscar a la persona por su teléfono',
      'Marcar el registro repetido como duplicado y enlazarlo',
      'Capturar los seis campos obligatorios sin dejar vacíos',
      'Escribir la nota con hechos y citas textuales',
      'Marcar el resultado de la llamada',
      'Verificar que ningún registro quedó sin resultado',
    ],
    procedureWhy: 'La búsqueda por teléfono es lo que revela si esa persona ya tiene registro, y hasta que el repetido queda marcado y enlazado no se sabe en cuál de los dos capturar: llenar los seis campos antes parte el historial en dos y el seguimiento lee solo la mitad de la conversación.',
    cloze: [
      {
        sentence: 'El duplicado se evita buscando primero por el ___ desde el que llama, el único dato que no cambia aunque escriba su nombre distinto.',
        accepted: ['teléfono', 'número'],
        why: 'El nombre entra distinto cada vez —con y sin segundo apellido, con apodo, con la ñ cambiada—, así que la búsqueda por nombre devuelve vacío y se crea el segundo registro; ese dato ya está capturado en el primero.',
      },
      {
        sentence: 'El segundo registro de la misma persona no se borra: se marca como ___ y se enlaza al que se queda.',
        accepted: ['duplicado'],
        why: 'Borrarlo rompe las referencias que otros registros ya hicieron a ese identificador y deja notas apuntando a la nada; marcado y enlazado, quien llegue por el número viejo aterriza en el expediente con historial.',
      },
      {
        sentence: 'La bitácora registra quién hizo qué; por eso la ___ del sistema no se presta, ni siquiera por urgencia.',
        accepted: ['contraseña', 'clave', 'cuenta'],
        why: 'Prestada por una urgencia de cinco minutos, la bitácora atribuye cada movimiento a quien no estuvo ahí, y cuando alguien pregunte quién cambió ese dato el sistema va a dar un nombre equivocado que nadie puede desmentir.',
      },
    ],
    pairsPrompt: 'Relaciona cada situación de captura con la acción que evita duplicados y datos sin rastro.',
  },
  'seguimiento-prospectos': {
    procedurePrompt: 'Ordena la secuencia de tres contactos con un prospecto que no ha contestado.',
    procedureItems: [
      'Registrar con hora exacta el intento sin respuesta',
      'Consultar en el registro las franjas horarias intentadas',
      'Programar el siguiente intento en otra franja horaria',
      'Dejar mensaje con una vía concreta de contacto',
      'Cerrar el ciclo con nota, sin borrar registros',
    ],
    procedureWhy: 'La hora del intento anterior solo existe si el intento fallido se registró, y sin ella el siguiente se marca a la misma hora que ya falló: tres intentos a las diez de la mañana son un solo intento repetido tres veces.',
    cloze: [
      {
        sentence: 'Una fecha de seguimiento anotada en el campo de notas no genera ___ en el sistema, y sin él la llamada no ocurre.',
        accepted: ['recordatorio', 'aviso', 'alerta'],
        why: 'Solo el campo de fecha lo dispara; en notas la fecha es texto que nadie vuelve a leer, así que el prospecto que pidió que le llamaran en un mes se pierde por un dato que sí estaba escrito.',
      },
      {
        sentence: 'Un mensaje de seguimiento identifica al despacho y nunca incluye el motivo ni el número de ___.',
        accepted: ['expediente', 'caso'],
        why: 'Ese teléfono a veces lo contesta alguien más de la casa, y ese número identifica a la persona igual que su nombre: basta para que en su casa se enteren de que tiene un asunto migratorio abierto.',
      },
      {
        sentence: 'A quien pide información por escrito se le envía el material ___, sin agregar explicaciones propias.',
        accepted: ['aprobado', 'autorizado'],
        why: 'Ese material ya pasó por revisión legal y lo sostiene el despacho; el párrafo que recepción escribe para aclarar queda por escrito en el teléfono del prospecto y responde por él quien lo mandó.',
      },
    ],
    pairsPrompt: 'Relaciona cada respuesta de un prospecto con el paso de seguimiento que corresponde registrar.',
  },
  'manejo-objeciones': {
    procedurePrompt: 'Ordena lo que hace recepción con una objeción de precio que llega por teléfono.',
    procedureItems: [
      'Escuchar la objeción completa sin defender el precio',
      'Buscar la objeción en el material aprobado',
      'Responder con la respuesta aprobada, sin comparar despachos',
      'Ofrecer los planes de pago definidos',
      'Escalar al supervisor lo que el material no cubre',
      'Registrar la objeción textual y lo respondido',
    ],
    procedureWhy: 'La objeción se busca en el material con las palabras exactas que usó la persona, y esas solo se tienen si la dejaron terminar; escalar antes de ofrecer los planes le entrega al supervisor algo que el material sí cubría, con el cliente esperando en la línea.',
    cloze: [
      {
        sentence: 'A quien dice que no puede pagar el total se le explican los ___ de pago definidos, sin improvisar.',
        accepted: ['planes', 'esquemas', 'convenios'],
        why: 'El descuento improvisado no está autorizado y además queda dicho por teléfono: el cliente lo repite en caja como si fuera el precio, mientras que lo definido ya trae montos y fechas que no dependen de quién contestó.',
      },
      {
        sentence: 'Ante la pregunta de si van a ganar el caso se explica que nadie garantiza un ___.',
        accepted: ['resultado'],
        why: 'Decir «hay muchas probabilidades» ya funciona como garantía en la memoria de quien escucha y se cita después como promesa del despacho; lo que sí se puede describir es el proceso y qué pasos siguen.',
      },
      {
        sentence: 'Quien dice que debe consultarlo con su familia recibe una cita donde pueda venir ___.',
        accepted: ['acompañado'],
        why: 'Presionar para decidir hoy pone a recepción a competir con quien de verdad decide y no está en la llamada; traerlo a la cita responde la objeción una sola vez y delante de los dos.',
      },
    ],
    pairsPrompt: 'Relaciona cada objeción frecuente con la respuesta aprobada que no promete resultados ni compara despachos.',
  },
  'cierre-de-turno': {
    procedurePrompt: 'Ordena el cierre de turno de una recepción con llamadas y pendientes del día.',
    procedureItems: [
      'Comparar llamadas atendidas contra registros capturados',
      'Capturar las llamadas que quedaron sin resultado',
      'Corregir el error de captura y dejar nota',
      'Asignar cada pendiente abierto con dueño y fecha',
      'Avisar en persona los tres pendientes más urgentes',
      'Cerrar sesión y guardar documentos bajo llave',
    ],
    procedureWhy: 'El hueco del día no se ve capturando sino comparando: la diferencia entre atendidas y registradas es la que dice cuántas llamadas faltan, y quien captura antes de comparar captura las que recuerda, que son justamente las que no faltaban.',
    cloze: [
      {
        sentence: 'El hueco del día se detecta comparando las llamadas atendidas contra las llamadas ___ en el sistema.',
        accepted: ['registradas', 'capturadas'],
        why: 'Nadie omite una llamada a propósito: la que falta es la que se contestó y se resolvió de palabra, y por eso al cierre nadie la recuerda; solo la resta contra el conteo la hace aparecer.',
      },
      {
        sentence: 'Un pendiente sin resolver se entrega asignado, con dueño y con ___, no solo mencionado de palabra.',
        accepted: ['fecha', 'plazo'],
        why: 'Un pendiente con dueño pero sin ese dato se queda esperando a que esa persona tenga tiempo, y nunca lo tiene; es lo que hace que el pendiente aparezca solo en su lista sin que nadie deba acordarse.',
      },
      {
        sentence: 'Al terminar el turno se cierra la ___ para que el siguiente entre con su propio usuario.',
        accepted: ['sesión'],
        why: 'Si queda abierta, todo lo que capture el turno siguiente aparece a nombre de quien ya se fue, y cuando haya que explicar quién tocó un expediente la bitácora va a acusar a la persona equivocada.',
      },
    ],
    pairsPrompt: 'Relaciona cada pendiente que queda al final del turno con la forma correcta de entregarlo.',
  },
  'anatomia-expediente': {
    procedurePrompt: 'Ordena los pasos para abrir un expediente nuevo el mismo día que se contrata el caso.',
    procedureItems: [
      'Verificar el nombre completo contra el documento oficial',
      'Crear el expediente y asignar un responsable',
      'Abrir las siete secciones obligatorias, aunque queden vacías',
      'Archivar cada documento fechado en su sección correspondiente',
      'Actualizar la portada con estatus y próxima fecha',
    ],
    procedureWhy: 'Cada paso entrega el insumo del siguiente: el nombre verificado es el que queda pegado al expediente para siempre, las secciones tienen que existir antes de que haya dónde archivar, y la próxima fecha de la portada sale de los documentos que acaban de entrar.',
    cloze: [
      {
        sentence: 'Todo expediente nuevo se abre con ___ secciones obligatorias, aunque varias queden vacías el primer día.',
        accepted: ['siete'],
        why: 'Se abren todas de golpe porque una sección vacía se ve y alguien pregunta qué falta, mientras que la sección que nunca se creó no la extraña nadie hasta el día que hay que entregar el documento que iba ahí.',
      },
      {
        sentence: 'La ___ es lo único que alguien lee al tomar un caso ajeno con prisa, y por eso carga el estatus y la próxima fecha.',
        accepted: ['portada', 'carátula'],
        why: 'Se lee en diez segundos y decide qué hace quien toma el caso: si trae un estatus de hace tres semanas, esa persona actúa con información vieja y nadie le va a avisar que estaba vieja.',
      },
      {
        sentence: 'Un documento en otro idioma se archiva como llegó y se marca si requiere traducción ___, trámite que abre su propio plazo.',
        accepted: ['certificada', 'oficial'],
        why: 'La traducción que hace un compañero bilingüe no le sirve a la autoridad: la certificada la firma un perito, tarda días en conseguirse, y esos días empezaron a correr el día que el documento entró al despacho.',
      },
    ],
    pairsPrompt: 'Relaciona cada documento que entra al despacho con la sección del expediente donde se archiva.',
  },
  'control-documentos': {
    procedurePrompt: 'Ordena los pasos para recibir en mostrador un documento original que trae el cliente.',
    procedureItems: [
      'Revisar legibilidad y contar hojas frente al cliente',
      'Registrar la entrada y obtener el folio',
      'Sellar el acuse con folio y detalle recibido',
      'Escanear el original junto con el acuse sellado',
      'Devolver el original el mismo día, contra firma',
    ],
    procedureWhy: 'El folio es el eje de la cadena —sale del registro, se estampa en el acuse y queda dentro del escaneo—, así que devolver el original antes de cerrar esa cadena deja al despacho sin prueba de qué recibió ni de cuántas hojas eran.',
    cloze: [
      {
        sentence: 'Cuando el cliente dice que ya entregó un documento, la discusión la zanja el ___ sellado que él se llevó, no lo que recuerde el mostrador.',
        accepted: ['acuse', 'recibo'],
        why: 'Trae el detalle de lo recibido y el folio, así que resuelve la discusión en un minuto; sin él la única salida es pedirle al cliente que consiga otra vez un documento que sí entregó, y esa llamada convierte un trámite en una queja.',
      },
      {
        sentence: 'El original que entrega el cliente se escanea y se ___ el mismo día, no al cerrar el caso.',
        accepted: ['devuelve', 'regresa'],
        why: 'Retenerlo no le agrega nada al expediente, porque la imagen ya quedó, y sí convierte al despacho en custodio de un pasaporte o un acta que el cliente va a necesitar antes de que el caso termine.',
      },
      {
        sentence: 'Un documento que llega por correo electrónico no se deja en el buzón: se guarda en el expediente con la fecha y el ___, para saber a quién volver a pedírselo.',
        accepted: ['remitente', 'emisor'],
        why: 'Quien mandó el correo es el único que conserva el archivo completo: si el adjunto llegó cortado o ilegible, sin ese dato hay que rastrear buzones ajenos que pueden estar cerrados desde que esa persona cambió de puesto.',
      },
    ],
    pairsPrompt: 'Relaciona cada vía de entrada de un documento con el registro que debe quedar en el expediente.',
  },
  'plazos-y-vencimientos': {
    procedurePrompt: 'Ordena lo que hay que hacer con un plazo que aparece en un documento recién recibido.',
    procedureItems: [
      'Localizar la fecha de vencimiento en el documento',
      'Registrar el plazo el mismo día en el sistema',
      'Asignar un responsable con nombre, no un área',
      'Programar los dos recordatorios a nombre del responsable',
      'Archivar la evidencia de cumplimiento junto al plazo',
    ],
    procedureWhy: 'La fecha sale del documento y el registro sale de la fecha, pero de ahí en adelante el eje es el dueño: los recordatorios se disparan contra una persona, y programarlos antes de que el plazo tenga nombre los deja dirigidos a un área, donde no los abre nadie.',
    cloze: [
      {
        sentence: 'Todo plazo se registra el mismo día con responsable asignado y ___ recordatorios previos a la fecha de vencimiento.',
        accepted: ['dos'],
        why: 'No son repetición: el primero llega con margen para conseguir lo que falta y el segundo cae cuando ya no se puede delegar, así que con uno solo un día de incapacidad o de vacaciones borra el plazo completo.',
      },
      {
        sentence: 'La evidencia de que algo se hizo a tiempo se archiva pegada al ___ que se cumplió, no en la sección de documentos, para que responder una pregunta de hace seis meses tome un minuto.',
        accepted: ['plazo', 'vencimiento'],
        why: 'Guardada en la sección de documentos la evidencia existe pero no la encuentra nadie sin abrir el expediente entero; pegada ahí aparece en la misma pantalla donde alguien pregunta si eso se cumplió.',
      },
      {
        sentence: 'Cuando varios plazos vencen el mismo día se priorizan por la ___ de incumplirlos, no por orden de llegada.',
        accepted: ['consecuencia', 'gravedad'],
        why: 'El orden de llegada mide cuándo entró el papel, no lo que cuesta fallar: una audiencia perdida y un envío de copias tardío vencen el mismo día, pero uno se repone con una llamada y el otro no se repone.',
      },
    ],
    pairsPrompt: 'Relaciona cada situación de plazo con la acción que corresponde registrar en el sistema.',
  },
  'privilegio-comunicaciones': {
    procedurePrompt: 'Ordena los pasos para archivar un correo entre el abogado y el cliente.',
    procedureItems: [
      'Descartar el correo ajeno al asunto legal',
      'Identificar emisor, destinatario y terceros del correo',
      'Consultar al abogado ante un tercero o reenvío',
      'Clasificar el correo como privilegiado o no privilegiado',
      'Marcar y archivar en la sección correspondiente',
    ],
    procedureWhy: 'Cada paso reduce lo que llega al siguiente: leer emisor y destinatario antes del filtro gasta tiempo en correos que ni siquiera son del caso, y clasificar antes de preguntar por el tercero archiva como privilegiada una comunicación que el reenvío ya expuso.',
    cloze: [
      {
        sentence: 'Una conversación en la que hay un ___ —el primo que vino a traducir, el amigo que trajo al cliente— se registra con su nombre completo, porque su presencia puede tumbar el privilegio.',
        accepted: ['tercero'],
        why: 'El privilegio protege lo que abogado y cliente se dijeron a solas, así que con alguien más en la mesa la otra parte puede pedir esa conversación, y el nombre de quien estaba es lo primero que le van a preguntar al despacho.',
      },
      {
        sentence: 'Ante una solicitud externa del expediente, quien decide qué se entrega y qué se separa es el ___; operaciones no entrega nada, ni lo que parezca obviamente inofensivo.',
        accepted: ['abogado'],
        why: 'Decidir qué es entregable es un juicio legal, y si operaciones adelanta un documento «que no tenía nada» ya no hay forma de retirarlo: entregado una vez, deja de estar protegido para el resto del caso.',
      },
      {
        sentence: 'La marca de privilegiada se aplica en el mismo acto de ___ la comunicación en su sección, porque nadie va a volver después sobre cientos de documentos.',
        accepted: ['archivar', 'guardar'],
        why: 'Marcar en el momento cuesta cinco segundos por documento; hacerlo al cierre significa reabrir cientos con prisa, y esa revisión tardía siempre termina en «todo privilegiado», que ante una solicitud vale lo mismo que no haber marcado nada.',
      },
    ],
    pairsPrompt: 'Relaciona cada comunicación del expediente con la marca de clasificación que le corresponde.',
  },
  'verificacion-datos': {
    procedurePrompt: 'Ordena los pasos cuando un dato del expediente no coincide con el documento fuente.',
    procedureItems: [
      'Localizar el documento fuente del dato en duda',
      'Comparar el dato del sistema letra por letra',
      'Registrar la discrepancia sin elegir ningún valor',
      'Escalar la discrepancia a quien puede resolverla',
      'Corregir dejando visible el valor anterior',
      'Marcar el expediente verificado con fecha y responsable',
    ],
    procedureWhy: 'El valor bueno no lo elige quien verifica, sale del escalamiento: por eso corregir antes de escalar deja en el sistema el dato que le pareció correcto a una persona, sin rastro del anterior y sin nadie que lo respalde cuando la autoridad pregunte de dónde salió.',
    cloze: [
      {
        sentence: 'Cuando una fecha aparece distinta en dos documentos se registra la ___ y se escala, sin elegir ninguna.',
        accepted: ['discrepancia', 'diferencia'],
        why: 'Eso es el dato: si alguien escoge la fecha que le parece buena, el expediente queda coherente y falso, y el día que la autoridad compare los dos documentos ya nadie sabrá que hubo dos versiones.',
      },
      {
        sentence: 'El nombre se verifica contra el documento oficial letra por letra, porque para el sistema de la autoridad un acento de más o un apellido invertido ya es otra ___.',
        accepted: ['persona', 'identidad'],
        why: 'Un expediente a nombre de «Ana Sofia» y una petición a nombre de «Ana Sofía» no se cruzan solos: para la autoridad son dos personas, y el trámite se queda detenido meses hasta que alguien pide la corrección.',
      },
      {
        sentence: 'Si la dirección del expediente no coincide con el comprobante se registran las dos y se marca cuál es la ___, porque el histórico es lo que explica a dónde se envió antes.',
        accepted: ['vigente', 'actual'],
        why: 'Borrar la dirección vieja parece limpieza y es lo contrario: cuando la autoridad diga que notificó y el cliente diga que nunca recibió nada, la dirección anterior con su fecha es lo único que dice quién tiene razón.',
      },
    ],
    pairsPrompt: 'Relaciona cada dato crítico del expediente con el documento fuente contra el que se verifica.',
  },
  'notificaciones-cliente': {
    procedurePrompt: 'Ordena los pasos para notificar al cliente un avance que exige una acción de su parte.',
    procedureItems: [
      'Confirmar el canal registrado en el expediente',
      'Llenar la plantilla del canal en los campos previstos',
      'Revisar que no queden datos de otro caso',
      'Enviar la notificación dentro de las 24 horas',
      'Registrar fecha, canal y acuse, y agendar seguimiento',
    ],
    procedureWhy: 'El canal manda sobre todo lo demás —define qué plantilla se usa y qué cuenta como acuse—, y la revisión va pegada al envío porque un correo con datos de otro cliente no se puede recoger una vez que salió.',
    cloze: [
      {
        sentence: 'Un avance relevante se notifica dentro de ___ horas por el canal registrado en el expediente.',
        accepted: ['24', 'veinticuatro'],
        why: 'Es el margen que evita que el cliente se entere por otro lado o llame a preguntar; pasado ese día el silencio se lee como abandono, y la llamada que entra cuesta más tiempo que la notificación que no se mandó.',
      },
      {
        sentence: 'Una mala noticia sobre el caso se comunica por ___ y se confirma por escrito después.',
        accepted: ['teléfono', 'llamada'],
        why: 'Por escrito una negativa se lee más dura de lo que es y el cliente se queda horas solo con el papel; la voz permite explicar qué sigue en el mismo minuto, y el escrito posterior es lo que deja constancia de que se le avisó.',
      },
      {
        sentence: 'Cuando un cliente no responde a las notificaciones se cambia de ___ —del correo al teléfono, por ejemplo— y se registra el intento.',
        accepted: ['canal', 'medio', 'vía'],
        why: 'Se cambia por dónde se le busca, no el tono ni la insistencia: si el correo lleva dos semanas sin abrirse el problema puede ser una dirección muerta, y el intento registrado por otro lado es lo que después demuestra que el despacho sí buscó al cliente.',
      },
    ],
    pairsPrompt: 'Relaciona cada tipo de aviso al cliente con el canal y el registro que exige.',
  },
  'calidad-registro': {
    procedurePrompt: 'Ordena cómo se escribe una nota de expediente después de hablar con el cliente.',
    procedureItems: [
      'Escribir entre comillas lo que dijo el cliente',
      'Marcar con su fuente cada dato de terceros',
      'Rotular como valoración lo que sea opinión propia',
      'Cerrar con el siguiente paso, responsable y fecha',
      'Firmar con tu usuario y fechar la nota',
    ],
    procedureWhy: 'La nota se arma por capas y cada capa define la siguiente: primero lo textual entre comillas, luego lo que llegó de terceros con su fuente, y lo que sobra de esos dos filtros es tuyo y va rotulado como valoración —al revés, tu conclusión termina escrita como si la hubiera dicho el cliente, y la firma va al final porque es lo que declara que ya no falta nada.',
    cloze: [
      {
        sentence: 'Lo que dijo el cliente se registra como cita ___ entre comillas, no como resumen ni conclusión.',
        accepted: ['textual', 'literal', 'exacta'],
        why: 'El resumen guarda lo que a ti te pareció importante ese día; las palabras completas guardan lo que el cliente puede confirmar o desmentir después, y frente a un reclamo esa diferencia separa un hecho de la versión de alguien.',
      },
      {
        sentence: 'Los intentos de llamada que nadie contestó se registran con hora y número: son lo que acredita la ___ del despacho el día que alguien alegue abandono.',
        accepted: ['diligencia'],
        why: 'Las llamadas que sí entraron las recuerda el cliente; las que no contestó solo existen si alguien las escribió, y esa lista con horas distintas es lo que separa «no lo pudimos localizar» de «nadie lo llamó».',
      },
      {
        sentence: 'Toda gestión se cierra registrando el siguiente paso con ___ y fecha, o el expediente queda detenido.',
        accepted: ['responsable', 'dueño', 'encargado'],
        why: 'Un siguiente paso sin nombre lo hace quien se acuerde, y no se acuerda nadie: por eso el expediente detenido no aparece en ningún reporte hasta que el cliente llama a preguntar por qué lleva dos meses sin noticias.',
      },
    ],
    pairsPrompt: 'Relaciona cada nota mal escrita con el criterio de calidad que incumple.',
  },
  'traspaso-de-casos': {
    procedurePrompt: 'Ordena el traspaso de un caso que cambia de responsable dentro del despacho.',
    procedureItems: [
      'Revisar el expediente y armar la lista de traspaso',
      'Recorrer la lista punto por punto con quien recibe',
      'Registrar los desacuerdos y escalarlos a coordinación',
      'Reasignar los plazos vigentes a quien recibe',
      'Firmar el acta ambas partes y archivarla',
      'Notificar al cliente y presentarle al nuevo responsable',
    ],
    procedureWhy: 'Cada firma congela lo que quedó debajo: el acta se firma con los plazos ya reasignados porque un plazo a nombre de quien entrega no le suena a nadie, y el cliente se entera hasta que el acta existe, porque avisarle de un cambio que todavía se está discutiendo obliga a desdecirse.',
    cloze: [
      {
        sentence: 'Los plazos vigentes se ___ explícitamente a quien recibe, porque no disparan para quien ya no lleva el caso.',
        accepted: ['reasignan', 'asignan', 'transfieren', 'traspasan'],
        why: 'El sistema no sabe que hubo traspaso y sigue mandando el aviso al usuario que tenía el plazo; ese usuario ya está viendo otros casos, así que el recordatorio llega, se ignora, y nadie nota que se ignoró.',
      },
      {
        sentence: 'Después de firmar el acta, lo que falte en el expediente ya es responsabilidad de quien lo ___, aunque el hueco lo haya dejado quien entregó.',
        accepted: ['recibió', 'recibe', 'aceptó'],
        why: 'Por eso el recorrido punto por punto se hace con el expediente enfrente y no por correo: la firma no reparte culpas del pasado, transfiere el caso completo con sus huecos, y desde ese momento quien responde ante el cliente es el nuevo responsable.',
      },
      {
        sentence: 'Al cliente se le avisa el cambio de responsable aunque sea un movimiento interno, porque enterarse por ___ le cuesta más confianza que el cambio mismo.',
        accepted: ['accidente', 'casualidad'],
        why: 'Casi nunca reclama que le cambien de abogado; reclama descubrirlo cuando llama y le contesta alguien que no sabe de qué caso le hablan, y ahí empieza a preguntarse qué más no le dijeron.',
      },
    ],
    pairsPrompt: 'Relaciona cada punto de la lista de traspaso con el riesgo que evita si se cumple.',
  },
  'auditoria-interna': {
    procedurePrompt: 'Ordena la auditoría interna de un expediente que ya se cerró.',
    procedureItems: [
      'Fijar los criterios vigentes al cierre del expediente',
      'Recorrer los doce criterios contra el expediente',
      'Documentar cada hallazgo con criterio, evidencia y corrección',
      'Enlazar cada corrección aplicada con su hallazgo',
      'Cerrar la ronda con fecha, auditor y hallazgos abiertos',
      'Verificar en la siguiente ronda las correcciones aplicadas',
    ],
    procedureWhy: 'Auditar es comparar contra una vara, y la vara se fija antes de abrir el expediente: recorrer primero los criterios de hoy produce hallazgos que quien llevó el caso no pudo evitar porque la regla todavía no existía, y corregir eso no arregla nada ni enseña nada.',
    cloze: [
      {
        sentence: 'Un expediente terminado hace dos años se audita con los criterios vigentes al momento de su ___, no con los de hoy.',
        accepted: ['cierre'],
        why: 'Los criterios cambian cada vez que el despacho aprende algo, así que la vara de hoy solo produce una lista de fallas que nadie pudo cometer a propósito; lo que se busca es si el expediente cumplió la regla que existía cuando alguien lo trabajó.',
      },
      {
        sentence: 'Un hallazgo que aparece en ocho expedientes de personas distintas se escala como problema de ___, no como falla de cada quien: corregirlos uno por uno los vuelve a producir.',
        accepted: ['proceso', 'procedimiento'],
        why: 'Ocho personas cometiendo el mismo error no son ocho descuidos, es un paso que se puede hacer mal sin darse cuenta, y mientras ese paso siga igual la siguiente ronda va a encontrar los mismos ocho hallazgos.',
      },
      {
        sentence: 'Un hallazgo sin la ___ que lo sustenta —el documento, la pantalla, la fecha faltante— se discute en la junta en vez de corregirse.',
        accepted: ['evidencia', 'prueba'],
        why: 'Sin el documento a la mano el hallazgo se vuelve la palabra del auditor contra la de quien llevó el expediente, y esa discusión se resuelve por jerarquía y no por hechos, así que el error se queda donde está.',
      },
    ],
    pairsPrompt: 'Relaciona cada hallazgo de auditoría con la acción que corresponde después de documentarlo.',
  },
  'fundamentos-cobranza': {
    procedurePrompt: 'Ordena una gestión de cobro por teléfono, desde la preparación hasta el seguimiento agendado.',
    procedureItems: [
      'Revisar en el expediente saldo, pagos y notas',
      'Verificar con dos datos la identidad del titular',
      'Decir el saldo y detener la gestión ante disputa',
      'Proponer dos fechas concretas y sostener la elegida',
      'Registrar el monto y la fecha comprometidos',
      'Agendar el seguimiento un día hábil después del vencimiento',
    ],
    procedureWhy: 'Cada paso entrega el dato que el siguiente necesita: sin el expediente abierto no hay dos datos con qué verificar al titular, sin titular verificado el saldo no se puede mencionar en voz alta, y sin la fecha comprometida registrada no existe el vencimiento al que se le agenda el seguimiento.',
    cloze: [
      {
        sentence: 'El adeudo no se menciona a quien contesta el teléfono hasta confirmar que es el ___ de la cuenta.',
        accepted: ['titular', 'dueño'],
        why: 'Quien contesta puede ser el cuñado, la vecina o el jefe, y todos repiten lo que oyen: mencionar el adeudo antes de confirmar es una fuga de información que el cliente sí puede reclamar.',
      },
      {
        sentence: 'Cuando un cliente dice que ya pagó y el pago no aparece en el sistema, se le pide el ___ y se registra en el momento, con una disculpa por la gestión.',
        accepted: ['comprobante', 'recibo'],
        why: 'Con el documento en la mano el asunto se cierra en un minuto; anotar «dice que pagó» lo deja abierto semanas y el cliente recibe otra llamada de cobro por el mismo pago que ya hizo.',
      },
      {
        sentence: 'Ante un compromiso de pago vencido, el contacto se hace el día ___ siguiente, ni el mismo día ni la semana entrante.',
        accepted: ['hábil', 'laborable'],
        why: 'Si el vencimiento cae en viernes, el día natural siguiente es sábado y nadie contesta: contar en días de oficina es lo que hace que la llamada ocurra cuando el compromiso todavía se puede recuperar.',
      },
    ],
    pairsPrompt: 'Relaciona cada situación que aparece al inicio de una gestión de cobro con lo que hay que hacer antes de seguir.',
  },
  'practicas-permitidas': {
    procedurePrompt: 'Ordena un intento de contacto de cobro que cumple la política, desde la revisión previa hasta el registro.',
    procedureItems: [
      'Revisar las restricciones de contacto de la cuenta',
      'Calcular la ventana permitida en horario del cliente',
      'Marcar y preguntar por el titular sin dar motivos',
      'Verificar la identidad del titular con dos datos',
      'Detener el contacto directo si el cliente tiene abogado',
      'Registrar hora, resultado y restricciones nuevas del intento',
    ],
    procedureWhy: 'La ventana de llamada se calcula sobre las restricciones ya leídas —si el cliente pidió que no lo llamen al trabajo, esa franja deja de existir y marcar con la ventana sin recortar es un contacto fuera de política—, y el registro va al final porque el aviso del abogado aparece dentro de la llamada y es justo la restricción que la siguiente gestión tiene que leer antes de marcar.',
    cloze: [
      {
        sentence: 'El horario permitido para llamar se calcula en la zona horaria del ___, no en la de la oficina que marca.',
        accepted: ['cliente', 'titular', 'deudor'],
        why: 'El despacho opera con oficinas en dos husos: marcar a las 8:30 desde el escritorio puede ser las 6:30 en la casa de quien contesta, y esa llamada es un incumplimiento aunque la persona conteste de buen modo.',
      },
      {
        sentence: 'Si un tercero contesta el teléfono, se pide hablar con el titular sin mencionar el ___ de la llamada.',
        accepted: ['motivo', 'asunto', 'propósito'],
        why: 'Quien contesta no es parte del asunto y no tiene por qué enterarse: decirle que es por un adeudo ya es la fuga, aunque no se diga el monto y aunque sea de la familia.',
      },
      {
        sentence: 'Una restricción que el cliente pide —no llamarlo al trabajo, por ejemplo— se registra y se respeta en todos los ___, no solo en aquel donde la pidió.',
        accepted: ['canales', 'medios'],
        why: 'El cliente la pidió por teléfono, pero vale igual para el correo y el mensaje de texto: respetarla solo donde la escuchaste deja abierta justo la vía por la que después llega la queja.',
      },
    ],
    pairsPrompt: 'Relaciona cada petición o aviso del cliente con lo que la política de cobro obliga a hacer.',
  },
  'planes-de-pago': {
    procedurePrompt: 'Ordena la construcción de un plan de pago, desde la revisión del saldo hasta la confirmación escrita.',
    procedureItems: [
      'Confirmar que el saldo está conciliado y sin disputas',
      'Preguntar al cliente cuánto y cada cuándo puede pagar',
      'Escalar sin comprometer nada lo que salga de rango',
      'Armar la propuesta con los cinco parámetros autorizados',
      'Capturar los parámetros del plan en el sistema',
      'Enviar la confirmación escrita con montos y fechas',
    ],
    procedureWhy: 'El saldo conciliado es el número que se le dice al cliente, lo que el cliente pide es lo que se escala cuando sale de rango, y la propuesta solo se puede armar con lo que la escalación dejó autorizado: armarla antes obliga a desdecirse en la siguiente llamada, y desdecirse es lo único que el cliente va a recordar del plan.',
    cloze: [
      {
        sentence: 'El primer pago de un plan se fija lo más ___ posible a la fecha del acuerdo.',
        accepted: ['cercano', 'próximo'],
        why: 'Es el mejor predictor de que el plan completo se cumpla: si el primero cae hasta el mes que entra, el cliente ya reacomodó su dinero y esa cuota se convierte en la primera promesa vencida.',
      },
      {
        sentence: 'Un plan que se incumple en la ___ cuota se reestructura antes de cancelarlo o escalarlo, porque a esa altura todavía se recupera.',
        accepted: ['primera'],
        why: 'Reestructurar a tiempo recupera más que cancelar; si se espera a la siguiente cuota ya hay dos incumplimientos en el historial y la cuenta cae en escalamiento en lugar de en un plan nuevo.',
      },
      {
        sentence: 'Los parámetros del plan se capturan en los campos del sistema y no en las ___, donde no generan recordatorios.',
        accepted: ['notas', 'observaciones'],
        why: 'Ahí el plan no dispara avisos ni aparece en los reportes de cartera: existe para el gestor que lo escribió y para nadie más, así que la cuota se vence sin que nadie la vea venir.',
      },
    ],
    pairsPrompt: 'Relaciona cada petición del cliente sobre su plan de pago con la respuesta que está dentro de lo autorizado.',
  },
  'recibos-comprobantes': {
    procedurePrompt: 'Ordena la recepción de un pago en efectivo en mostrador, desde que llega el cliente hasta el corte del día.',
    procedureItems: [
      'Confirmar quién paga y a qué cuenta se aplica',
      'Contar el efectivo frente a quien paga',
      'Registrar el pago en el sistema y obtener folio',
      'Emitir el recibo con folio y entregar la copia',
      'Enviar la copia electrónica al correo del expediente',
      'Cuadrar recibos, pagos registrados y envíos del día',
    ],
    procedureWhy: 'El folio no existe hasta que el pago está capturado, así que un recibo emitido antes sale sin nada que lo amarre a un movimiento y nadie puede rastrearlo después; y el cuadre del corte solo cierra cuando ya hay recibo, registro y envío que comparar entre sí.',
    cloze: [
      {
        sentence: 'Un pago por transferencia se registra con el ___ de la operación, no solo con el monto y la fecha.',
        accepted: ['folio', 'referencia', 'número'],
        why: 'Cuando cinco transferencias del mismo día traen la misma cantidad, ese dato es lo único que dice cuál es la de este cliente; sin él la conciliación bancaria no puede aplicar el pago y el cliente sigue apareciendo como moroso.',
      },
      {
        sentence: 'Cuando un cliente pierde su recibo se le entrega otro marcado como ___, con la fecha original del pago y no la de hoy.',
        accepted: ['copia', 'duplicado'],
        why: 'Un recibo con fecha de hoy por un pago de hace un mes descuadra la contabilidad de los dos meses, y la marca es lo que impide que ese papel se cuente como un segundo pago que nunca entró.',
      },
      {
        sentence: 'Un recibo electrónico se envía al correo ___ en el expediente, nunca al que el cliente dicte por teléfono.',
        accepted: ['registrado', 'autorizado', 'verificado'],
        why: 'El del expediente se comprobó una vez y el dictado por teléfono, ninguna: basta una letra mal entendida para mandar el detalle del adeudo al buzón de un desconocido, y eso ya no se puede deshacer.',
      },
    ],
    pairsPrompt: 'Relaciona cada forma de pago o incidencia con el comprobante que corresponde emitir o corregir.',
  },
  'conciliacion-saldos': {
    procedurePrompt: 'Ordena una conciliación de saldos, desde que aparece la diferencia hasta el cierre documentado.',
    procedureItems: [
      'Marcar la cuenta en disputa y detener el cobro',
      'Identificar el último corte que ambas partes aceptaron',
      'Reconstruir la cuenta movimiento por movimiento',
      'Apartar los movimientos sin respaldo documental',
      'Obtener del cliente la confirmación escrita del saldo',
      'Enviar el estado de cuenta el mismo día',
    ],
    procedureWhy: 'La reconstrucción solo puede arrancar donde hubo acuerdo —sin ese corte hay que revisar la cuenta entera— y la confirmación se pide sobre el saldo ya limpio de movimientos sin respaldo, porque pedirla antes es hacer firmar como acordado justo lo que se va a volver a disputar; y la cuenta se marca en disputa desde el arranque o la gestión sigue marcándole al cliente al que le estás pidiendo que concilie.',
    cloze: [
      {
        sentence: 'La conciliación no compara ___: reconstruye movimiento por movimiento desde el último punto de acuerdo con el cliente.',
        accepted: ['totales', 'saldos', 'sumas'],
        why: 'Comparar de esa forma te dice que faltan cuatro mil pesos y nada más; el movimiento por movimiento te dice cuál es el cargo, de qué fecha y quién lo autorizó, que es lo único con lo que el cliente puede estar de acuerdo o no.',
      },
      {
        sentence: 'Un movimiento que no tiene ___ documental se marca como pendiente de aclarar y se deja fuera del saldo acordado.',
        accepted: ['respaldo', 'soporte', 'sustento'],
        why: 'Un saldo acordado que incluye un cargo sin papel se vuelve a disputar en cuanto el cliente pide verlo, y entonces la conciliación se repite completa: apartarlo cuesta un renglón, no apartarlo cuesta la reconstrucción otra vez.',
      },
      {
        sentence: 'Una diferencia que no se puede explicar se escala con el ___ reconstruido, no con el total de la cuenta.',
        accepted: ['detalle', 'desglose'],
        why: 'Escalar el total obliga a quien recibe el caso a rehacer la cuenta desde cero; escalar lo reconstruido deja a la vista los tres movimientos que no cuadran y el caso se resuelve el mismo día.',
      },
    ],
    pairsPrompt: 'Relaciona cada hallazgo de la conciliación con el tratamiento que le corresponde en el saldo acordado.',
  },
  'conversaciones-dificiles': {
    procedurePrompt: 'Ordena el manejo de una llamada de cobro que se vuelve hostil, desde la primera reacción hasta el escalamiento.',
    procedureItems: [
      'Hacer una pausa y reconocer el enojo del cliente',
      'Escuchar si hay amenaza o problema de salud',
      'Detener la gestión de cobro de inmediato',
      'Acordar una fecha de contacto sin prometer pagos',
      'Registrar textualmente lo que dijo el cliente',
      'Escalar el mismo día adjuntando el registro',
    ],
    procedureWhy: 'La pausa es lo que abre el desahogo donde aparece la amenaza o el problema de salud —sin ella el gestor sigue leyendo el guion y no oye ninguno de los dos—, y solo con la gestión de cobro ya detenida tiene sentido acordar una fecha de contacto en lugar de una de pago; el escalamiento va al final porque lo que se adjunta es el registro que se acaba de escribir.',
    cloze: [
      {
        sentence: 'Ante una amenaza de demanda se registra lo dicho de forma ___ y se escala el mismo día, sin discutirlo con el cliente.',
        accepted: ['textual', 'literal', 'exacta'],
        why: 'El área legal necesita la frase con la que el cliente amenazó, no el resumen del gestor: «dijo que nos iba a demandar» no permite evaluar nada, y una interpretación mal escrita se convierte en el documento que el despacho tendrá que sostener.',
      },
      {
        sentence: 'La petición de perdonar el saldo, llamada ___, se evalúa por escrito y nunca se promete en la llamada.',
        accepted: ['condonación', 'quita'],
        why: 'Prometerla en la llamada la vuelve un compromiso del despacho que nadie autorizó; tramitarla por escrito protege al cliente de una negativa informal y al gestor de una promesa que no va a poder cumplir.',
      },
      {
        sentence: 'Una llamada que se sale de control se cierra con un ___ de contacto y su fecha, no colgando.',
        accepted: ['compromiso', 'acuerdo'],
        why: 'Colgar deja la cuenta donde estaba y la siguiente llamada empieza peor; con fecha, la llamada fallida se vuelve un paso del proceso que el sistema puede agendar y otro gestor puede retomar.',
      },
    ],
    pairsPrompt: 'Relaciona cada reacción del cliente en una conversación difícil con la respuesta que no compromete al despacho.',
  },
  'escalamiento-cierre': {
    procedurePrompt: 'Ordena el escalamiento y cierre de una cuenta con compromisos incumplidos.',
    procedureItems: [
      'Reunir el historial de compromisos incumplidos con fechas',
      'Comprobar el número de incumplimientos que exige la política',
      'Escalar adjuntando el historial completo, nunca solo el saldo',
      'Registrar por qué regresó el caso sin resolver',
      'Revisar el saldo contra los comprobantes de la cuenta',
      'Notificar por escrito el cierre y el saldo final',
    ],
    procedureWhy: 'Sin el historial con fechas y montos no hay número de incumplimientos que comprobar, solo paciencia agotada, y el saldo se revisa partiendo de lo que dice el registro del regreso, porque notificar un cierre con un saldo que nadie volvió a revisar es exactamente la reclamación que llega tres meses después.',
    cloze: [
      {
        sentence: 'Se escala cuando la cuenta cumple el ___, no cuando el gestor se queda sin paciencia.',
        accepted: ['criterio', 'requisito'],
        why: 'Es lo que hace comparables las decisiones entre gestores: si cada quien escala cuando se harta, la cartera escalada deja de decir algo sobre el riesgo y el supervisor recibe cuentas que todavía se podían cobrar.',
      },
      {
        sentence: 'Una cuenta no se cierra con saldo sin ___: la diferencia reaparece meses después como reclamación.',
        accepted: ['conciliar', 'cuadrar', 'aclarar'],
        why: 'La diferencia no se queda quieta: a los meses llega el cliente con su propio número, ya nadie recuerda de dónde salió, y el despacho negocia desde cero una cuenta que daba por cerrada.',
      },
      {
        sentence: 'Un caso escalado que regresa sin resolver exige registrar el ___ del regreso antes de retomar la gestión.',
        accepted: ['motivo', 'porqué'],
        why: 'Sin eso escrito, quien retoma repite exactamente la gestión que ya falló y el caso vuelve a subir igual; con eso escrito, el siguiente intento empieza donde se atoró el anterior.',
      },
    ],
    pairsPrompt: 'Relaciona cada estado final de una cuenta de cobranza con lo que hay que documentar o notificar antes de cerrarla.',
  },
};

/**
 * Lectura CHECADA.
 *
 * `procedures.test.ts` ya asegura que las 26 unidades tienen entrada, así que este `throw` no puede
 * dispararse en la app. Existe porque `noUncheckedIndexedAccess` está encendido y la alternativa —un
 * objeto vacío por defecto— produciría un ejercicio de ordenar sin pasos en vez de un fallo.
 */
export function extrasFor(unitSlug: string): UnitExtras {
  const found = EXTRAS[unitSlug];
  if (found === undefined) throw new Error(`Sin contenido escrito para la unidad "${unitSlug}"`);
  return found;
}

export function clozeAt(unitSlug: string, index: number): Cloze {
  const list = extrasFor(unitSlug).cloze;
  const item = list[index % list.length];
  if (item === undefined) throw new Error(`La unidad "${unitSlug}" no tiene frases con hueco`);
  return item;
}
