# SENDA — DECISIONS

Decisiones que tomé sin preguntar, según la regla de la especificación §0: *si una decisión te bloquea, elige
la opción más ambiciosa que puedas sostener y anótala.* Cada una lleva el porqué.

Tres secciones: **§1 resoluciones vinculantes** (los conflictos que resolví entre tracks de diseño), **§2
desviaciones de la especificación** (donde me aparto de la letra, con la razón), y **§4 preguntas abiertas**
(donde ya elegí un valor por defecto pero prefiero que lo veas).

---

## 1. Resoluciones vinculantes

La primera ronda de diseño produjo ocho arquitecturas en paralelo. Los verificadores encontraron **87
conflictos**: el mismo tipo definido dos veces, tres modelos de versionado incompatibles, cuatro nombres para
"XP por lección". Estas son las resoluciones. Son vinculantes: la ronda 2 se construyó encima de ellas.

**R1 · Identidad.** `src/content/engine/primitives.ts` es el dueño único de marcas e IDs. Formato
`<pfx>_<8 base32 Crockford sin i,l,o,u>`: `usr_ coh_ crs_ sec_ unt_ lsn_ stp_ skl_ med_ bdg_ asg_ aud_ rep_`.
`mintId(prefix, rng)` es la única fábrica y el seed la usa. **`src/lib/ids.ts` no existe.** El ordinal de un
usuario se resuelve con un `Map<UserId, number>` construido una vez en `usersSlice()`.
*Por qué importó:* dos tracks inventaron formatos distintos (`usr_[a-z0-9]{8}` contra `u_0001`). Con los dos
vivos, **el 100% del contenido sembrado falla `prepareStep`** y la primera lección de la demo abre en estado
de error.

**R2 · Rutas.** `/` = landing de marketing de una pantalla. `/aprende` = El Camino. Segmentos visibles en
español: `/aprende` · `/leccion/[lessonId]` · `/practica` · `/ligas` · `/misiones` · `/tienda` · `/perfil` ·
`/logros` · `/ajustes` · `/bienvenida` · `/studio/...`. Identificadores de código en inglés. Cada segmento
lleva `loading.tsx` y `error.tsx`; hay `not-found.tsx` y `global-error.tsx` globales.
*Por qué importó:* el árbol de carpetas de la especificación pone `(app)/page.tsx` y `(marketing)/page.tsx`,
**ambos resuelven a `/`**, y Next falla el build con *"You cannot have two parallel pages that resolve to the
same path"*. Es un error de compilación garantizado en la Fase 1 que ningún track había nombrado.

**R3 · Economía.** El contenido **no guarda XP absoluto**. `Step.xpWeight: 1|2|3` y `Lesson.difficulty: 1..5`.
Un único `economySchema` (Zod, con rangos y `version`) en `src/mock/economy.ts` convierte peso + dificultad en
XP y contiene además `maxHearts`, `heartRefillMinutes`, la curva de niveles, precios de tienda, duración de
liga, bandas de ascenso, recompensas de cofre y de misión, e intervalos del SRS. `/studio/gamification` es la
**única** escritura y emite `BroadcastChannel('senda:config')`.
*Por qué:* con XP persistido en 2,100 pasos, mover el deslizador exigiría reescribir el contenido y el diff de
versiones mostraría 2,100 filas cambiadas. Además había **cuatro nombres en circulación** para el mismo
parámetro (`xpPerWeight`, `xpPerLesson`, `xpPerCompletion`, `baseXp`) y ningún dueño.

**R4 · Versionado.** Blob store direccionado por contenido con hash de **64 bits reales** (dos FNV-1a con
semillas distintas, concatenadas en hex). Snapshot = árbol + hashes. Presupuestos de `localStorage` contados en
**UTF-16** (`s.length * 2`), no con `Blob().size`.
*Por qué:* había tres modelos vivos (payload JSON crudo / árbol con blobs / diffs contra la semilla) y el
rollback de la demo habría leído de un almacén que nadie escribió. Y el hash de 32 bits que se había propuesto
da **0.67% de colisión** con ~7,600 blobs: uno de cada 150 proyectos materializa la lección equivocada al
hacer rollback, en silencio.

**R5 · Rutas de dominio.** Un solo `ContentPath` y un solo `formatContentPath(path, { style })` con salidas
`issue` / `full` / `compact` / `href`. `issue` arranca en el segmento de unidad para producir exactamente
`"Unidad 3 › Lección 12 › Paso 4: …"`. Validación, diff, buscador y errores de import consumen el mismo
vocabulario. El diff empareja **por id** y usa **LIS** — el mismo `lis()` que la dinámica de ordenar.
*Por qué:* había dos tipos y dos formateadores con criterios distintos de 0/1-based. Y un diff que marca
`moved` por cambio de índice reporta **19 filas movidas** al insertar un paso al inicio de una lección de 20 —
y "añadir paso" está en el guion de demo, así que la probabilidad de que ocurra es 1.

**R6 · Latencia por niveles.** `tier: 'instant'` (microtask, sin `SIMULATE_ERRORS`) para lecturas dirigidas por
teclado: `users.search`, `users.facets`, `content.search`, `path.sections`. `tier: 'network'` (80–260 ms +
`SIMULATE_ERRORS`) para mutaciones y cargas de pantalla. Y la latencia es **determinista por firma de
llamada**, no aleatoria: `latencyFor(sig) = (80 + fnv1a(sig) % 181) * speedMultiplier`, con los fallos
indexados por `nthCall` para que la cuarta carga de la misma pantalla falle **siempre**.
*Por qué:* la especificación pide 80–260 ms en todo repo **y** <16 ms de interacción; son incompatibles en la
ruta del teclado. Y hacer la latencia determinista cuesta lo mismo que `Math.random()`, da reproducibilidad de
vídeo y convierte "simular errores" en un escenario ensayable.

**R7 · Opcionalidad.** `T | null` en datos persistidos (motor y contenido, con `.nullable()` obligatorio y
`.optional()` prohibido en Zod); `?: T | undefined` en props de React y filtros de `nuqs`; **nunca `?: T` a
secas**.
*Por qué:* había tres políticas incompatibles bajo `exactOptionalPropertyTypes`. El default —copiar `hint?` de
la especificación— acaba en pelearse con la bandera en cada reducer y apagarla, y la bandera es requisito.

**R8 · Audio.** `type SfxId` con los **8** identificadores de la especificación, en `src/design/sound.ts`;
`SfxBus` lo importa en vez de redefinirlo. El `AudioContext` se **crea dentro** del primer
`pointerdown`/`keydown`, se suspende al ocultar la pestaña con debounce de 250 ms, y **nunca** se cierra.
*Por qué:* un track había declarado la unión con solo 5 miembros, y los 3 que faltaban (`levelUp`,
`chestOpen`, `streakFire`) son justo los de las tres cinemáticas de pantalla completa, o sea los que se oyen
en la demo. Y en Safari/iOS crear el contexto fuera del gesto lo deja `suspended` para siempre: la primera
respuesta correcta de la demo sonaría a nada.

**R9 · Anuncios.** **Dos** regiones `aria-live`: `polite` para el feedback del ejercicio, `assertive` para la
pérdida de vidas. La firma es `announce(message, politeness)`. La mascota va `aria-hidden` salvo en
cinemáticas.
*Por qué:* con una sola región `polite`, la pérdida de un corazón —el evento que la especificación marca
explícitamente como `assertive`— llega tarde o se pisa con el feedback del ejercicio. Y sin el `aria-hidden`
de la mascota, el lector de pantalla anuncia dos veces cada cambio de estado.

**R10 · Foco.** Anillo **compuesto**: 3px de `--lime-500`, 1px de offset del color de superficie, 1px exterior
de casing en `--ink-900`. Nunca se deriva del color de marca.
*Por qué:* el anillo lima simple que pide la especificación da **1.35:1** sobre papel blanco y **1.25:1** sobre
`--canvas`, contra los 3:1 que exige WCAG 1.4.11. Ver el teorema de cobertura en `PLAN.md` §2.2: el compuesto
garantiza ≥3.69:1 contra **cualquier** superficie posible.

**R11 · Color de sección.** El enum pierde `lime` y gana `grape`:
`['brand','grape','mint','coral','amber','sky']`. Cada token viaja como par `--section-fill` /
`--section-on-fill` con prueba de contraste automática.
*Por qué:* con `lime` disponible, un administrador no técnico puede publicar una sección del camino ilegible —
en la demo de branding, que es la pantalla que vende el white-label.

**R12 · El contrarreloj sigue siendo plugin.** Son **14 plugins**, no 13. Su `TData` lleva sus propios
mini-ítems en línea (`DrillItem { id, prompt, options: 2–4, correctIndex }`), **no** referencias a `Step`.
*Por qué:* un track propuso convertirlo en `LessonKind: 'time-attack'`, que es técnicamente más limpio pero
deja 13 entradas en el registro contra un criterio de aceptación explícito de 14 dinámicas jugables y
editables. Los mini-ítems en línea resuelven la recursión de tipos sin romper el conteo. (Y aquí sí uso
`correctIndex`: el alcance del `DrillItem` es el propio `data`, sus ítems no son reordenables desde el editor,
y por eso la excepción es segura y está nombrada.)

**R13 · Frontera cliente/servidor.** `src/mock/**` es client-only, con módulo barrera `'use client'`, guardia
de importación en lint, y aislamiento por `next/dynamic({ ssr: false })` — no solo por `'use client'`.
*Por qué:* el estado de módulo (`let ix`, `let overlays`, `const callCount = new Map()`) en un RSC **se
comparte entre peticiones**. El síntoma —el segundo visitante ve la racha del primero— solo aparece en
producción con dos usuarios reales, es decir, en la sala de venta.
*Matiz (R13b):* `src/content/seed/catalog.ts` **sí** es isomorfo. Es puro y determinista (3 cursos, 26
secciones, 190 lecciones: id, título, orden, paleta) y no importa `src/mock/**`. Lo consume el servidor para
`generateStaticParams`, los `<title>` y los banners pre-pintados. Sin esto, el LCP de `/aprende` sería un
esqueleto y se regalarían 600–900 ms.

**R14 · Carga de plugins.** Cada dinámica se parte en `meta.ts` (puro, en el barrel: schemas, `defaultData`,
`grade`, `solution`, `searchText`, `describe`, `refs`, `estimateSeconds`, `supports`, `version`) y `ui.ts`
(`Player`/`Editor`/`FeedbackDetail` por `next/dynamic`). `ErasedDynamic` expone `loadPlayer()`. La lección
precarga el paso n+1.
*Por qué:* un barrel que importa las 14 dinámicas completas mete `@dnd-kit` + `react-hook-form` en la ruta del
camino. **El code-splitting lo decide el registro**, así que agregar la dinámica 15 no toca el splitting de
nadie: es la misma promesa del plugin, aplicada al bundle.

**R15 · El contrato del plugin gana ocho miembros** sobre la firma de la especificación: `version`, `refs`,
`searchText`, `describe`, `solution`, `distractor`, `requires`, y un tercer genérico `TDetail` con
`detailSchema` + `FeedbackDetail`. `PlayerProps` gana `rng(salt)`. `GradeResult` gana `skillScores`.
Justificación miembro por miembro en `PLAN.md` §4.4.

**R16 · Reloj.** `src/lib/clock.ts` es la única fuente; `Date.now`, `new Date` y `performance.now` están
prohibidos fuera de ahí por lint. Tres relojes **dentro del mismo módulo dueño**: `now()` anclado y deslizante
(racha, ligas, heatmap, misiones, publicación programada), `nowReal()` sin ancla (corazones, potenciadores,
expiración de sesión) y `mono()` + `monoEpochId` (recarga de corazones dentro de la pestaña).
*Por qué el desdoble:* si los corazones cuelgan del ancla deslizante de la demo, "Re-anclar demo a hoy"
regala vidas. Y si cuelgan solo del reloj de pared, adelantar el reloj del Mac —lo primero que hace alguien
inspeccionando una maqueta de gamificación— las regala igual. El doble reloj cierra las dos puertas.
*Frontera de día (R16b):* **04:00 en la zona IANA de la oficina** del usuario
(`America/Mexico_City` | `America/Chicago` | `America/Phoenix`), no medianoche del dispositivo. La misma
frontera gobierna racha, misiones diarias y semana de liga (lunes 04:00). El cliente tiene oficinas en dos
países con reglas de DST divergentes.

**R17 · Lint.** `eslint.config.mjs` en **flat config** (ESLint 9). Prohíbe: `TSAsExpression` salvo `as const`;
`transition` inline y objetos literales en `animate`/`initial`/`exit`/`whileHover`/`whileTap`/`whileInView`;
el import de `motion/react` fuera de `src/design/**`; `canvas-confetti` fuera de `fx.ts`; `Date.now`,
`new Date`, `Math.random`, `performance.now`, `crypto.randomUUID`, `toLocaleDateString`, `localStorage` fuera
de sus módulos dueños; literales numéricos en `src/game/**` y `components/game/**` (regla local
`no-magic-economy`); e imports cruzados de frontera (`no-restricted-paths`).
*Por qué:* un track había escrito `.eslintrc.clock.cjs` con `module.exports` y `overrides`. **Ese archivo
nunca se carga** con ESLint 9, así que todas sus garantías de determinismo eran decorativas.

**R18 · Seguridad del contenido.** El corpus se escribe sobre dominios internos verificables —ética
profesional, manejo de expedientes, seguridad de la información del cliente, atención en recepción, cobranza y
planes de pago, uso del sistema interno— y lo estrictamente jurídico se limita a ~20 átomos de procedimiento,
con etiqueta visible **"contenido de ejemplo"** en el pie del player.
*Por qué:* el comprador son abogados migratorios. Un enunciado incorrecto sobre I-130 o TPS mata la venta en
la sala. Es el único riesgo del proyecto que no es técnico y es el más caro.

**R19 · Persistencia.** Una sola puerta `src/mock/persist.ts` con `BudgetKey` tipado, presupuesto en UTF-16,
orden de desalojo declarado y rama `sessionStorage`. `resetDemo()` barre localStorage **y** sessionStorage,
limpia el overlay de impersonación en memoria, emite el reset por el canal y hace `location.replace('/')` —
nunca un reset suave.
*Por qué:* la impersonación vive en `sessionStorage` (desviación deliberada, ver D14), así que un
`resetDemo()` que solo barre `localStorage` **deja al presentador viendo la App como otra persona, con la
barra coral encima**. Y un `store.reset()` en memoria deja vivo el `AudioContext` suspendido, los
`IntersectionObserver` del camino anterior y el `BroadcastChannel` duplicado.

**R20 · Qué se regenera y qué se persiste.** El mundo (1,247 usuarios, 3 cursos, 26 unidades, 190 lecciones,
~2,100 pasos) **se regenera desde la semilla en cada arranque**; `localStorage` guarda solo el registro de
mutaciones. La actividad histórica por usuario se deriva perezosamente con sub-semilla por id; los agregados
del dashboard se generan directamente.
*Por qué:* 1,247 × 120 días = **149,640 filas**, y `localStorage` tiene ~5 MB. Pero la razón buena no es el
presupuesto: como `isActive(ordinal, day)` es una función pura, **el agregado del dashboard y el detalle del
alumno no pueden divergir jamás — son la misma línea de código.** Con dos caminos separados (números bonitos
hardcodeados arriba, datos aleatorios abajo), en la primera demo alguien filtra por cohorte, suma la columna y
no cuadra.
*Coste medido:* contenido ~23 ms, usuarios ~6 ms, índice de búsqueda ~3 ms, bitset ~1.6 ms; total eager ~35 ms
en M-class (~98 ms en un Pixel 6a). Con slices memoizados, `/aprende` paga ~8 ms. **Sin worker**: para este
volumen el transporte domina y el worker empeora el LCP. Umbral duro de 50 ms en `boot()` que escribe un
warning visible.

---

## 2. Desviaciones de la especificación

Donde me aparto de la letra. Todas conservan la intención.

| # | La especificación dice | Hago | Por qué |
|---|---|---|---|
| **D1** | `defineDynamic<TData, TAnswer>(config)` | `DynamicDefinition<K extends DynamicType>`, con `TData`/`TAnswer`/`TDetail` leídos del registro | Con dos genéricos libres, `type` y `TData` son independientes: puedo registrar `'multiple-choice'` con el data de flashcard y compila |
| **D2** | `GradeResult = { correct, partial?, feedback?, diff? }` | `{ correct, score: Score01, feedback: I18nKey \| null, detail: TDetail, skillScores }` | `diff?: unknown` obliga a un cast en cada punto de pintado, y son tres (analítica, resumen, bandeja de reportes). `feedback?: string` mete texto no traducible en un producto que declara chrome bilingüe |
| **D3** | `hint?`, `explanation?`, `partial?`, `diff?` | Todos obligatorios y `nullable` | `exactOptionalPropertyTypes` es requisito, y `?: T` pelea con cada reducer hasta que alguien apaga la bandera |
| **D4** | Ejemplo de error: `falta "correctIndex"` | `correctOptionId`; el mensaje pasa a *"falta la opción correcta (ninguna opción tiene «correcta» marcada)"* | Referencias por id en todo el catálogo: reordenar opciones en el editor no puede cambiar la respuesta correcta |
| **D5** | Sombra sólida de 4px en el tono `-700` | 4px sólidos en el tono **`-800`** | `brand-600` sobre `brand-700` separa 1.38:1 y el canto desaparece. Regla dura [1.9, 2.7] |
| **D6** | Anillo de foco lima de 3px, offset 2 | Núcleo lima de 3px + offset 1 + casing exterior `--ink-900` de 1px | 1.35:1 sobre papel: incumple WCAG 1.4.11. Se conserva el núcleo lima y el offset |
| **D7** | `--lime-500` como acento de sección | `lime` sale del enum de paleta de sección; entra `grape` | Un admin podría publicar un camino ilegible |
| **D8** | Todo se degrada a fades de 120 ms con `prefers-reduced-motion` | 120 ms es la constante única, **pero el shake degrada a un pulso de borde** y el flash del cofre **se elimina** | Un fade no comunica "error". Y el flash es un riesgo fotosensible, no solo una animación |
| **D9** | Latencia artificial de 80–260 ms en toda función de repo | Dos niveles (`instant` / `network`), y determinista por firma | La especificación también exige <16 ms de interacción y <30 ms de búsqueda |
| **D10** | Persistencia en `localStorage` con clave `senda:v1:*` | Igual, **más** `sessionStorage` con el mismo prefijo para impersonación y memoria de scroll | Cerrar la pestaña debe terminar la sesión suplantada. Un flag persistido deja al presentador atrapado como otra persona tras una recarga accidental |
| **D11** | `seedrandom` | `seedrandom` **solo** para las ~12 semillas de namespace; el fan-out usa `mix32` entero y `mulberry32` | `seedrandom(...)` dentro de un bucle de 150k asigna un ARC4 por llamada: 600 ms de arranque en vez de 1.6 ms. El determinismo global se conserva íntegro |
| **D12** | Next.js 15 App Router, "RSC donde aplique" | Se declara en `ARCHITECTURE.md` que **casi nunca aplica**: `(app)` y `(studio)` son client desde el layout; RSC de verdad en `(marketing)`, los layouts estáticos y los banners del camino | Todo el estado vive en `localStorage`. Salpicar componentes de servidor para que el repo *parezca* moderno es peor que decirlo |
| **D13** | Fase 6 = "Movimiento y mascota" | `motion.ts`, `fx.ts`, `sound.ts`, `synth.ts` y el rig de Cuati con 5 estados salen en la **Fase 1**. La Fase 6 queda en los 9 estados, las cinemáticas y la auditoría de las 27 | La animación es requisito funcional: la micro-interacción 6 define el árbol de rutas y la 10 la estructura del DOM. Construir F4 y F5 sin el sistema significa escribir `transition` inline que la F6 arranca |
| **D14** | *(no lo menciona)* | Máquina de sesión **headless** (`session-machine.ts`, reducer puro que devuelve `[estado, Cmd[]]`) como entregable de la Fase 2 | Permite que el preview del Studio, el test de nivel, el contrarreloj y el repaso SRS corran la misma máquina sin duplicar reglas — y que el Studio la reinicie sin desmontar y perder el draft |
| **D15** | Medianoche | 04:00 en la zona de la oficina, declarado en `/ajustes`: *"Tu día termina a las 4:00 a. m., hora de tu oficina"* | Dos países, reglas de DST divergentes, y la racha es el sistema del que cuelga la retención |
| **D16** | Corazones habilitados sí/no por lección | La lección puede **apagarlos** globalmente pero no encenderlos donde el plugin declara `consumesHearts: false`. **La intersección manda** | Descontar corazones en flashcards envenena el SRS: el usuario deja de admitir que no sabía |
| **D17** | `reported` como estado del paso | Región **paralela** (`ReportPhase`), junto a `StepPhase` y `OverlayPhase` | Tres cosas ortogonales tienen que coexistir; un enum plano no las modela |
| **D18** | *(no lo menciona)* | Un fallo **re-encola el paso al final** de la lección, una vez, por el 50% del XP, con tope de 3 | "Reintenta hasta acertar" destruye la métrica; "fallaste, sigue" no enseña. ~30 líneas en el reducer compran las dos cosas |
| **D19** | Editor de zonas para el hotspot | Editor de **selección y micro-ajuste** sobre regiones que el generador de escena produjo | Dibujar polígonos a mano en un CMS es un proyecto aparte, y el resultado no es versionable por campo |
| **D20** | `apps/senda-web` + `packages/senda-content` si existe el monorepo, standalone si no | Standalone, con la frontera del paquete impuesta por `no-restricted-paths` | No hay monorepo previo en `~/dev/solis/apps`: las 21 apps son repos independientes. Se compra el aislamiento verificable sin el coste de tooling |
| **D21** | Mensajes de commit fijos por fase | Se conservan **9 de 11**; cambian los de F1 y F6 | Si `motion.ts` sale en F1, el mensaje `chore: scaffold app with design tokens and theming` miente sobre lo que la fase entrega. F1 → `…design tokens, theming and motion kernel`; F6 → `feat(app): add mascot choreography and cinematics` |
| **D22** | Lista de dependencias de runtime | `fast-check` y `@vitest/browser` como **devDependencies** | El fuzz sobre el `answerSchema` encuentra el `answer[i]` que `noUncheckedIndexedAccess` te obliga a chequear pero que llega igual desde un JSON importado a mano. No entran al bundle |

---

## 3. Hipótesis de dominio

**El contenido semilla asume capacitación corporativa interna de un despacho de servicios legales y
migratorios con oficinas en México y Estados Unidos, ~1,250 empleados.** Tres cursos por función: *Primer
Contacto* (recepción, ventas, citas), *Expediente Impecable* (asistentes legales, abogados) y *Cobranza con
Dignidad* (cobranza, facturación). Nueve cohortes con nombres de área real y tamaños asimétricos (41 a 380)
que suman exactamente 1,247, con una de exactamente 300 personas para el ensayo del criterio de aceptación.

**De dónde viene la hipótesis.** La especificación misma la insinúa: 1,247 usuarios en 9 cohortes de 40–380 es
una plantilla, no un mercado de consumo; la dinámica 12 (escenario ramificado) se describe como *"ideal para
capacitación profesional"*; y el volumen de 3 cursos / 26 unidades tiene forma de currículo corporativo. Lo
confirmé con el contexto del entorno: `~/dev/solis/` contiene 21 aplicaciones del mismo dominio —expedientes
de visas humanitarias, `billing-hub`, `dialstrat`, `workforce-ci` con análisis de llamadas,
`contrataciones_carlos`, `reviews_oficinas`, `bienvenidos`— y esta sesión tiene acceso a herramientas de
operación de un despacho con recepción, cobranza, fechas de corte y nómina.

**El eje no es "aprender leyes": es riesgo operativo** (ejercicio no autorizado de la profesión, FDCPA,
plazos, privilegio abogado-cliente). Esa es la diferencia entre un curso que justifica corazones, ligas y
escenarios ramificados, y una inducción genérica de RH que no justifica ninguno.

**Si la hipótesis es incorrecta, cuesta seis archivos:**
`src/mock/fixtures/{courses,lesson-plan,org,names,voice,badges}.ts` más el campo `example` de cada dinámica.
**Cero cambios** en el motor, los repos, la UI o el Studio. Ese aislamiento es el propósito de la capa de
fixtures, y es la razón por la que doy la hipótesis por buena en vez de bloquear el plan preguntando.

---

## 4. Preguntas abiertas

Todas tienen ya un valor elegido, así que **ninguna bloquea**. Si no dices nada, arranco con el valor por
defecto.

**P1 · Next 15 o 16.** Por defecto: **15.5.x**, como pide la especificación. Es la única pregunta que
considero genuinamente tuya, porque el criterio ("alineado con las otras 21 apps de la casa") no es técnico.
Detalle en `PLAN.md` §1.

**P2 · Generosidad de la economía.** `economySchema.generosity: 'sales' | 'realistic'`, por defecto
**`'sales'`** (saldo semilla de 500 gemas, fuentes ×1). El modo `'realistic'` da 60 y ×0.4. El interruptor vive
en `/studio/gamification` con etiqueta explícita y un panel que proyecta *"un usuario de 15 min/día alcanza el
nivel N en D días"* para ambos modos lado a lado. **Riesgo declarado:** ante un comprador financiero, 500
gemas de arranque pueden leerse como economía inflada; el guion de demo lo menciona en voz alta al abrir la
tienda.

**P3 · Las dos experiencias negativas.** La cinemática de **racha perdida** y la de **descenso de liga** están
diseñadas completas. Por defecto **no entran** en el guion de 3 minutos y quedan accesibles desde un botón
"Simular racha perdida" en `/ajustes`. Enseñarlas demuestra que el producto tiene consecuencias; ocultarlas
mantiene el tono. Es decisión de guion, no técnica.

**P4 · `en.ts`.** Por defecto se envía el *seam* tipado completo con **~40 claves** traducidas y el toggle
marcado *"vista previa"* en `/ajustes`. Mantener 620 claves en inglés tiene coste real y el comprador es es-MX;
la especificación pide "solo el andamiaje", y esto lo es.

**P5 · Reactivos del examen de atajo.** El diseño pide 12 reactivos por unidad, pero con 26 unidades y 190
lecciones el promedio es ~7 lecciones por unidad. Por defecto **bajo a 8 reactivos** con umbral de aprobación
de 0.8 ponderado por peso y máximo 2 errores. La alternativa —garantizar ≥12 pasos evaluables por unidad en el
generador de contenido— infla el plan de lecciones sin beneficio visible.

**P6 · Un noveno SFX.** La tienda necesita un *cha-ching*. Por defecto se resuelve como **receta compuesta**
(`chestOpen` + `tap` desafinado +7 semitonos a +40 ms) para no tocar la unión de 8 de la especificación. Si en
pruebas no convence, pediría autorización para un noveno miembro `'cashRegister'`.

---

## 5. Lo que decidí no decidir

Dos cosas que deliberadamente dejo abiertas hasta tener código enfrente, porque decidirlas ahora sería
adivinar:

1. **El reordenamiento agresivo de las fases 6–8** que un track propuso (subir el Studio a escala a F6 y las
   ligas a F7, bajando las dinámicas 8–14 a F8). El argumento es bueno —ordenar por riesgo técnico y afinidad
   de mecanismo en vez de por producto— pero parte el catálogo de dinámicas en dos y mezcla App y Studio en la
   misma fase. Adopté solo el movimiento que tiene una causa mecánica indiscutible (el kernel de física a F1,
   D13). El resto se reevalúa al cerrar la F5, con datos de velocidad real.

2. **Las props exactas de los 27 componentes de `components/game/`.** Están nombrados y tienen dueño de
   selector asignado, pero tipar sus interfaces ahora, antes de que exista `LessonRuntime` compilando, produce
   firmas que se reescriben. Se congelan al inicio de la F5.

---

## 6. Hallazgos de la Fase 1 (construyendo, no planeando)

Siete cosas que el plan afirmaba y que resultaron distintas al escribir el código. Se registran aquí porque
son desviaciones del propio plan, no del superprompt.

**H1 · La sombra sólida no es un escalón de la rampa: es una RELACIÓN con la cara.**
`D5` decía que la sombra sólida es el tono `-800`. Al generar las rampas quedó claro que no cabe ahí: cada
variante del botón usa una cara distinta —primary la `-600` de brand, success la `-500` de lima— así que
como escalón fijo de la familia, `-800` acababa siendo el más oscuro para brand y un tono medio para lima,
y encima rompía el orden de la rampa. La sombra pasó a un token propio, `--<familia>-shadow`, derivado de la
cara. `-800` recuperó su rol real: el extremo oscuro para texto sobre tinte (≥9:1 sobre papel).
Las siete sombras caen ahora en 1.90–1.91:1, dentro de la banda [1.9, 2.7].

**H2 · `contrast()` es simétrico, y eso produjo un bug silencioso.**
El objetivo "separación ≥1.9 respecto a la cara" lo satisface también el BLANCO, así que el solver eligió
`#FFFFFF` como sombra de un violeta oscuro. La sombra necesita una restricción de DIRECCIÓN
(`luminancia(sombra) < luminancia(cara)`), y hay un test que lo asevera para las cinco variantes
precisamente para que no vuelva.

**H3 · Con una marca casi negra no existe sombra posible, y eso tenía respuesta de diseño.**
Para un cliente que elige `#111111` en `/studio/branding` no hay ningún color más oscuro con la separación
mínima: haría falta luminancia negativa. En vez de devolver una sombra inservible en silencio,
`solveShadow` declara `strategy: 'edge'` y el botón comunica la profundidad con un canto superior claro —el
mismo recurso que ya usa el tema oscuro. El white-label degrada en vez de producir un canto invisible.

**H4 · Un token de TEMA no puede portar el rol "tinta sobre relleno claro".**
`--ink-900` vale `#16121F` en claro y `#F4F1FF` en oscuro. Todos los alias `--fg-on-*` lo usaban, así que en
tema oscuro el texto sobre un menta o un ámbar claro se volvía casi blanco. Lo cazaron seis aserciones de
contraste a la vez. Se añadieron `--ink-fixed` y `--paper-fixed`, que valen lo mismo en los dos temas, y
todos los roles `on-fill` los usan. Es el mismo razonamiento que el brief de la mascota ya había aplicado a
la trufa y la boca, generalizado.

**H5 · Un borde de control se resuelve contra la superficie MÁS OSCURA, no la más clara.**
`--line-400 #BCB0DE` da 2.03:1 sobre papel y no puede ser el borde de un input (WCAG 1.4.11 exige 3:1). Se
derivó `--line-control`, pero resolverlo contra `--paper` daba 3.05:1 sobre papel y **2.84:1 sobre el
lienzo**: un input dentro de una tarjeta pasaba y el mismo input sobre el fondo no. Resuelto contra el
lienzo: 3.31:1 y 3.07:1.

**H6 · La garantía de degradación es "todo variant declara su canal", no "un mapa total de degradados".**
El plan prometía que añadir un variant sin degradado no compilaría. Construirlo mostró que un mapa total de
overrides obliga a escribir a mano el degradado mecánico de las 19 entradas, y esa lista se desincroniza. La
garantía que sí se sostiene: `VariantSpec` exige el campo `channel`, el canal decide el degradado mecánico y
`reduced` solo existe donde el degradado mecánico no comunica lo mismo (el caso canónico es el shake). Un
variant sin canal no compila.

**H7 · El presupuesto de fuentes estaba mal formulado.**
`subsets: ['latin']` en `next/font` controla qué rangos se PRECARGAN, no qué archivos se guardan: Next
conserva los `@font-face` de todos los rangos que Google publica (cirílico, hebreo, vietnamita, math) para
que un glifo inesperado siga renderizando. En disco hay 8 archivos y 176 KB; el navegador solo pide los 2
precargados del rango latin, **67.2 KB**. El script medía artefactos de disco y reportaba un coste que nadie
paga. Ahora mide lo precargado y reporta el resto como informativo.

**Bonus · Un único sitio autorizado a afirmar una marca.**
La regla de ESLint que prohíbe `TSAsExpression` cazó ocho casts que yo mismo había escrito. Ninguno se
arregló debilitando la regla: seis desaparecieron con tuplas de claves declaradas y comprobación de
completitud a nivel de tipos, y los dos irreductibles viven en `src/lib/brand.ts`, cuyo propósito entero es
ser esa excepción. Un tipo marcado no se puede construir sin una afirmación en algún punto; la elección real
no era "con casts o sin ellos" sino si hay **uno**, declarado y auditable, o veinte repartidos por el árbol.
