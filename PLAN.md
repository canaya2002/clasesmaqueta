# SENDA — PLAN (Fase 0)

> Plataforma de aprendizaje gamificada. Maqueta front-only, dos productos en un repo:
> **SENDA App** (alumno) y **SENDA Studio** (administrador).
> Este documento es el entregable de la Fase 0 junto con `DECISIONS.md`. **No hay código todavía.**

---

## 0. Cómo se produjo este plan, y qué tan verificado está

No es un plan escrito de corrido. Se produjo en dos rondas de diseño paralelo con crítica adversarial:

**Ronda 1 (completa, 25 agentes).** Ocho tracks de arquitectura —motor de contenido, capa mock, Studio,
movimiento y audio, tokens y contraste, dominio del contenido, árbol de carpetas y fases, calidad— cada uno
seguido de un crítico cuyo único mandato era cazar *defaults*. Después, cinco verificadores adversariales
independientes: cobertura de la App, cobertura del Studio, rigor de TypeScript y movimiento, criterios de
aceptación, y completitud. Encontraron **87 conflictos y tres errores en la propia especificación**. En
paralelo, un panel de tres conceptos de mascota bajo restricciones de búsqueda disjuntas, con un juez.

**Ronda 2 (parcial, 7 de 20 agentes).** Los verificadores de la ronda 1 detectaron un hueco en mi propio
reparto: nadie había diseñado **el producto del alumno**. La segunda ronda cerró ese hueco en siete tracks
—runtime de lección, los 13 sistemas de gamificación, mapa de rutas y arranque, circuito Studio→App, las 14
dinámicas, capa de diseño ejecutable, y guion de demo— pero **sus críticos y verificadores no llegaron a
correr** (fallo de infraestructura: los agentes se colgaron). Consecuencia honesta:

| Parte del plan | Estado de verificación |
|---|---|
| Motor, mock, Studio, tokens, contenido, fases, calidad, mascota | Diseñado + criticado + verificado adversarialmente |
| Runtime, gamificación, rutas, circuito, dinámicas, diseño ejecutable, demo | Diseñado, **sin crítica ni verificación adversarial** |
| §2.7 (matriz de las 27 micro-interacciones) e inventario de componentes | **Autoría mía directa**, sin panel |

Los números de contraste de §2.2 **los recalculé yo mismo** con una implementación propia de la luminancia
relativa de WCAG 2.1, no los tomé de los agentes. Un agente se equivocó (proponía `--mint-700 #0E8A50`, que
da 4.40:1 y falla): ese es el tipo de error que la verificación propia atrapa.

Si apruebas el plan, la Fase 1 arranca con una pasada de crítica sobre las siete áreas no verificadas.

---

## 1. Ubicación, stack y la única pregunta que necesito que respondas

**Ubicación:** `~/dev/solis/apps/senda` — repo git standalone, igual que las otras 21 apps de `~/dev/solis/apps/`.
No monorepo. La frontera del "paquete" se impone con lint, no con workspaces (ver §3.1 y `DECISIONS.md` D20).

**Herramientas verificadas en esta máquina:** Node v24.19.0 · pnpm 9.15.9 · git 2.55.0 · macOS.

**La pregunta:** la especificación fija **Next.js 15**. El estándar real de la organización es **Next 16**
(13 de 17 apps de `~/dev/solis/apps` con `package.json` legible corren 16.1–16.2; solo una está en 15.5.22).
Tailwind v4 ya es el estándar de la casa, así que ahí no hay tensión.

- **Mi recomendación: Next 15.5.x**, como pide la especificación. Es donde el patrón de ruta interceptada +
  slot paralelo que sostiene la micro-interacción 6 (nodo → lección con `layoutId`) está más rodado, y ese
  patrón es el riesgo técnico número uno de la maqueta.
- **Alternativa: Next 16.2.x**, alineado con la organización. Cuesta una prueba de humo extra el primer día y
  algún ajuste de `next/dynamic`.

Es la única decisión que no tomo yo, porque cambia la línea `next` de `package.json` y el criterio de
"alineado con la casa" es tuyo, no técnico. Todo lo demás está resuelto en `DECISIONS.md`.

**Idioma:** prosa de producto y segmentos de URL visibles en **es-MX**; identificadores de código, nombres de
archivo y mensajes de commit en **inglés**. `PLAN.md`, `DECISIONS.md` y `DEMO_SCRIPT.md` en español.

---

## 2. Design plan

### 2.1 Identidad y mascota

**Identidad:** juguetona con estructura. Superficie limpia, **sombras sólidas sin blur**, bordes gruesos,
esquinas muy redondeadas, una sola familia display redonda que carga toda la personalidad. Violeta eléctrico
con acento lima. No es Duolingo verde y no se le parece.

**La mascota es Cuati** — un coatí de nariz blanca (*Nasua narica*) estilizado, chibi 1:1.2.

Ganó un panel de tres conceptos bajo restricciones disjuntas (raíz mesoamericana / entidad no-animal /
elegida por su anatomía). Los otros dos fueron *Ocote*, un tlacuache con una brasa en la cola, y *Nito*, una
mojonera de piedras apiladas. Se descartaron por razones concretas, no por gusto: "tlacuache" arrastra
*plaga*, *borracho* y *hacerse el tlacuache* en México y alguien lo iba a decir en voz alta en la primera
demo; y una pila de piedras se recuerda como forma, no como personaje, en un producto cuya mecánica entera es
afecto diario. El ajolote se descartó explícitamente por dos motivos: saturación (billete de 50, Minecraft,
seis años de atajo de mexicanidad) y una contradicción semántica — la neotenia es la negativa a
metamorfosearse, y una app cuya tesis es el trayecto no puede tener por símbolo al que se queda en larva.

Por qué el coatí:

- **Se eligió desde la lista de capas que se querían animar, no al revés.** Dos orejas móviles independientes,
  cola erguida más larga que el cuerpo con origen dentro del torso, pelo dorsal eréctil, trompa prensil
  articulada. El default es elegir un animal simpático y descubrir que solo puedes animarle los ojos.
- **Silueta asimétrica**: asta de cola a la izquierda, trompa a la derecha. Casi toda mascota es bilateralmente
  simétrica de frente; esa asimetría es el gancho de los cinco segundos.
- **Es animal de procedimiento, no de talento innato.** No es un búho sabio ni un zorro listo: mete la nariz,
  voltea la piedra, repite. Es el animal que hace el ejercicio 2,100 veces.
- **Encaje geográfico exacto**: el coatí habita el corredor México–Arizona–Nuevo México–sur de Texas, que es
  el corredor de las oficinas, sin ser símbolo nacional de un solo país. Viaja en tropas de 20–30, que es el
  tamaño de una sala de liga.
- **Registro adulto.** El usuario es un profesional de 42 años en su trabajo, no un niño. Una mascota
  infantil es un riesgo de adopción medible, no una preferencia estética.

Tres decisiones de rig que no son decoración:

1. **La punta de la cola es el estado de la racha.** `mascot-tail-tip` se pinta con `--streak-ink`, un token
   que `tokens.css` resuelve desde `data-streak="cold|warm|hot|blaze"` en `<html>` — **no desde una prop**.
   Con la racha rota la punta está apagada en el nav, la tienda, el perfil y el resumen. El estado del alumno
   vive en el cuerpo de la mascota, no en un badge. Y como es un atributo del root, un tick de racha no
   re-renderiza el árbol de la mascota ni arrastra el Camino con él.
2. **El morral es la puerta de recompensas.** `mascot-satchel` con `scaleY 1→1.28`: gemas, llaves de cofre e
   insignias nacen ahí con `layoutId` compartido hacia el contador del HUD. No aparecen del centro de la
   pantalla. El coatí es animal de banda que carga; el morral no es adorno, es la mecánica.
3. **La cola ES la senda.** `src/design/curves.ts` exporta `TAIL_SPINE`, una sola cadena Bézier consumida por
   el atributo `d` de `mascot-tail` y por el trazo serpenteante de `PathSpine`. En el nodo activo, el primer
   segmento del camino es la curva de la cola.

**Tres componentes, no un SVG escalado.** A 32px un contorno de 8u mide 1.6px y se alía a gris sucio. La
salida no es recortar la cola sino **recortar el cuerpo**:

| Componente | Tamaños | viewBox | Grupos | Notas |
|---|---|---|---|---|
| `Mascot` | 96 · 160 · 240 | `0 0 160 200` | 18 (16 animados) | Rig completo |
| `MascotChip` | 32 · 48 | `16 22 122 122` | 7 | Cola + cabeza + trompa; contorno 11u; sin cejas, boca ni brillos; `trackPointer=false`; **conserva la punta de la cola** |
| `MascotSolid` | cualquiera | `0 0 160 200` | 1 path | `--ink-900`; favicon, `og:image`, `forced-colors`, impresión |

**El pelaje no usa el color de marca.** `--mascot-500 #B4552A` (hue 18.7°, 4.58:1 sobre canvas claro). Lo
único violeta es la bandana. Con el default —mascota del color primario— el primer cliente white-label
destruye el personaje; aquí cambiar el primario cambia una prenda. El hue se movió desde un #C96A3C original
porque estaba a 16° del ámbar de racha y a 32px, junto al contador, se leían como la misma familia; a 18.7°
el hueco sube a 20° y la luminancia se separa.

**El contorno no es un color, es un rol: siempre el extremo del rango.** En claro `--mascot-700 #7A3719`
(8.15:1 sobre canvas); en oscuro la escala se invierte completa a `#E8A377` (9.11:1). El pelaje oscuro solo
da 2.58:1 y no tiene que dar más: **la mascota nunca se lee por el relleno, se lee por el contorno.** Por eso
la máscara facial y el vientre llevan contorno de 3u en ambos temas.

Nueve estados (`idle` `think` `correct` `wrong` `celebrate` `sleep` `sad` `levelUp` `cheer`) más `poke` y
`speak`. Detalles que la vuelven memorable y que están especificados capa por capa: las pupilas siguen el
puntero en un **disco de radio 4.2u con clamp radial**, no rectangular; las orejas nunca comparten ángulo
salvo en `correct` (`EAR_MIN_DELTA_DEG = 6`, con lags de 60 y 100 ms como constantes nombradas); el shake de
`wrong` vive en `mascot-head`, no en el root, porque sacudir el root lee como *me caigo* y sacudir la cabeza
con el cuerpo plantado lee como *no*; la boca son cuatro variantes discretas intercambiadas por opacidad, **cero
morphing de path**; y la respiración y el vaivén de la cola tienen periodos primos entre sí (2,600 y 3,400 ms)
para que jamás se sincronicen.

Guardarropa de 10 prendas por `slot`, con precio en gemas que vive en `economySchema`, **no en el componente**.
Incluye una con `animatedNodes: 0` ("Polvo de sendero") pensada para quien juega con movimiento reducido y aun
así quiere personalizar, y una no comprable (`priceGems: null`, Corona de Ónix) que se gana ganando la semana
en la división más alta. Es la única que la tienda no puede vender y por eso la que la gente va a querer.

**Plan B de nombre**, si branding lo rechaza: **Tejo** —de *tejón*, como se le dice al coatí en México, y de
*tejo*, la piedra que se lanza para marcar el tiro. Cambiar el nombre no toca una línea del rig.

### 2.2 Color — la paleta dada es de superficie, no de texto

Recalculé la luminancia relativa (WCAG 2.1) de cada token de la especificación. El resultado es la premisa del
sistema de color, no una nota al pie:

| Token | Hex | Y | vs `--paper` #FFFFFF | Rol real |
|---|---|---|---|---|
| `--brand-600` | `#6C4CF1` | 0.14708 | **5.33:1** | El único cromático que puede ser texto, y solo en claro |
| `--brand-700` | `#5334D8` | 0.09253 | 7.37:1 | Texto y sombra |
| `--coral-500` | `#FF5470` | 0.28770 | 3.11:1 | Objeto no textual |
| `--sky-500` | `#38BDF8` | 0.44013 | 2.14:1 | Solo relleno |
| `--mint-500` | `#3DD68C` | 0.50979 | 1.88:1 | Solo relleno |
| `--amber-500` | `#FFB020` | 0.52415 | 1.83:1 | Solo relleno |
| `--lime-500` | `#B6F03C` | 0.72592 | **1.35:1** | Solo relleno |
| `--ink-500` | `#6B6480` | 0.13799 | 5.59:1 | Texto secundario (claro) |
| `--ink-900` | `#16121F` | 0.00702 | 18.41:1 | Texto principal |

**De los seis colores cromáticos, exactamente uno puede portar texto.** Y en tema oscuro ni ese: `--brand-600`
sobre `--paper` oscuro `#1A1428` da **3.36:1** (pasa como objeto gráfico, falla como texto) y `--brand-700` da
2.43:1 (falla todo). `--ink-500` también falla en oscuro: 3.20:1.

**Dos consecuencias verificadas, no asumidas:**

**(a) El anillo de foco de la especificación es invisible.** "Anillo lima de 3px, offset 2" con `#B6F03C` da
**1.35:1** sobre papel blanco y **1.25:1** sobre `--canvas`, contra los **3:1** que exige WCAG 1.4.11 / 2.4.13
para indicadores no textuales. Se sustituye por un **anillo compuesto**: 3px de `--lime-500` con 1px de offset
del color de superficie y 1px exterior de casing en `--ink-900`.

Y esto es demostrable, no una esperanza. Para cualquier superficie `S`, al menos uno de los dos tonos supera
3:1 contra `S`: el lima cubre todo `Y(S) < 0.2087` y la tinta cubre todo `Y(S) > 0.1211`; los intervalos se
solapan, así que **no existe superficie descubierta**. El peor caso está en el cruce, `Y(S) = 0.1603`, donde
ambos valen **3.69:1**. Ese teorema de dos líneas se escribe como test y es lo que blinda el foco incluso
contra el color arbitrario que un cliente elija en `/studio/branding`. El anillo **nunca** se deriva del color
de marca.

**(b) Sobre relleno de color, el texto va tinta en cinco de seis familias.**

| Relleno | Texto blanco | Texto `--ink-900` | Gana |
|---|---|---|---|
| `--brand-600` | 5.33:1 | 3.46:1 | **Blanco** |
| `--coral-500` | 3.11:1 | 5.92:1 | Tinta |
| `--sky-500` | 2.14:1 | 8.60:1 | Tinta |
| `--mint-500` | 1.88:1 | 9.82:1 | Tinta |
| `--amber-500` | 1.83:1 | 10.07:1 | Tinta |
| `--lime-500` | 1.35:1 | 13.61:1 | Tinta |

De ahí sale una decisión de producto: **el botón de éxito es lima con tinta, no verde con blanco.** El par
verde+blanco obliga a bajar a un verde institucional oscuro para pasar AA, que es el opuesto exacto del wow.
El menta queda reservado para *texto* de estado.

**Rampas por objetivo de contraste, no por escalón nominal.** Seis familias (`brand`, `grape`, `mint`,
`coral`, `amber`, `sky`) × pasos 300–800, cada uno con un **rol declarado** y su ratio recalculado al lado:

| Paso | Rol | Contrato |
|---|---|---|
| 300 | Tinte, fondo de avatar | — |
| 400 | Texto sobre oscuro | ≥4.5 sobre `--paper` oscuro |
| 500 | Relleno grande, color de firma | **sin contrato de contraste** |
| 600 | Relleno que acepta texto blanco | ≥4.5 con blanco |
| 700 | Texto sobre papel claro | ≥4.5 sobre `--paper` |
| 800 | Sombra sólida, texto sobre tinte | ≥6 sobre papel |

Marcar explícitamente el paso que **no** se puede prometer es lo que hace creíbles los otros cinco.
Correcciones que el cálculo obligó: `coral-600 #ED2149` daba 4.27 con blanco → recalibrado a `#D4143E`
(5.29). `sky-600 #0C93D4` da 3.42 → el token de texto informativo es `sky-700 #0A6E9E` (5.62). El lima nunca
es texto por encima de `lime-800 #4A6C0A` (6.10); `lime-700 #6B9A0E` da 3.36 y falla. `mint-700` es
**`#0B7F4A` (5.06:1)**, no `#0E8A50` (4.40:1, falla).

**Alias semánticos, y ningún componente puede escribir un paso numerado.** Los primitivos (`--mint-400`,
`--brand-700`…) viven en un `:root` plano de `tokens.css` **fuera de `@theme`**, así que no generan
utilidades: `bg-mint-400` no existe como clase. Los alias semánticos (`--fg-success`, `--bg-success`,
`--border-success`, `--fg-danger`, `--focus-ring-inner/outer`, `--btn-shadow`, `--section-fill`,
`--section-on-fill`, `--streak-ink`, `--mascot-*`, `--av-bg-1..8`) se declaran en `@theme inline` y sí las
generan. Un componente que quiera el verde crudo tiene que editar `tokens.css`, y eso sale en el diff. El
white-label es imposible si un solo componente escribió el violeta a mano, así que **la clase no debe existir**.

La palabra `inline` de `@theme inline` no es cosmética: sin ella Tailwind v4 congela el valor resuelto en
tiempo de build y el toggle de tema deja de funcionar en todas las utilidades.

**Color de sección:** el enum pierde `lime` y gana `grape` → `['brand','grape','mint','coral','amber','sky']`.
Cada uno viaja como par `--section-fill` / `--section-on-fill` con prueba de contraste automática. Con `lime`
disponible, un admin no técnico puede publicar un camino ilegible en la demo de branding.

**Los tres bloques de tema, en CSS válido.** Un selector **no puede** llevar `@media` embebido —el navegador
descarta la regla completa, incluida la parte que sí era válida. Orden correcto: `:root` pelado con la paleta
clara completa; luego `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){…} }`; luego
`:root[data-theme="dark"]{…}` idéntico, para que el toggle gane en ambos sentidos.

### 2.3 Tipografía

- **Display / UI de juego:** `Fredoka` variable (eje `wght` únicamente), pesos 500–600.
- **Texto y contenido:** `Nunito` variable, 400/600/700. Sin itálicas: SENDA no usa cursivas en ningún lugar
  del sistema, y eso ahorra 26 KB.
- **Coste real medido:** 34 KB (Fredoka latin) + 27 KB (Nunito latin) = **61 KB**, dos peticiones al mismo
  origen. `subsets: ['latin']` únicamente — es-MX no necesita `latin-ext` (á é í ó ú ñ ü ¿ ¡ están en latin).
  `display: 'swap'` y `adjustFontFallback` en su valor por defecto, que genera el `@font-face` de respaldo con
  `size-adjust` calculado y es lo que lleva el CLS a 0. Al auto-hospedarlas `next/font` ahorra el DNS+TLS+RTT
  a `fonts.gstatic` (~120 ms en 4G) y cumple "cero assets remotos".
- **Escala sobre rejilla de 4px, con tracking negativo creciente:** 12/16 +0.02em · 14/20 +0.005em ·
  16/24 0 · 18/28 −0.003em · 22/28 −0.008em · 28/36 −0.012em · 36/40 −0.018em · 48/52 −0.024em. Todas las
  alturas de línea son múltiplos de 4 para que el ritmo vertical del player y de las tablas del Studio
  coincidan sin ajustes manuales. Ancho máximo de cuerpo 34rem (68 caracteres).
- **Reparto de familias:** Fredoka solo en 22/28/36/48, en etiquetas de botón (14/16/18) y en cifras. Nunito
  lleva todo el texto corrido.
- **Ajuste óptico:** la altura de x de Fredoka es ≈535/1000 em y la de Nunito ≈490/1000, así que Fredoka se ve
  9.2% más grande al mismo `font-size`. Token `--display-optical: 0.92`, aplicado **solo** cuando una cifra en
  Fredoka vive dentro de un párrafo en Nunito (`+45 XP` dentro del panel de feedback). Los títulos
  independientes **no** llevan el ajuste, porque las alturas de mayúscula sí coinciden (700 vs 705, 0.7% de
  diferencia) y aplicarlo ahí encogería los H1 sin motivo.
- **Los contadores no confían en `tabular-nums`.** `<Odometer value={xp}/>` emite un `<span>` por dígito con
  `width: 1ch` y `overflow: hidden`, y anima cada dígito por separado (`translateY -100%→0`, `spring.snap`,
  escalonado 24 ms desde el dígito menos significativo). `tabular-nums` se declara igualmente pero no es la
  garantía. Además todo contador reserva su ancho por el **valor máximo alcanzable**, no por el actual, para
  que el XP no empuje a las gemas al cruzar un orden de magnitud.

**Cinco reglas anti-genérico** que un revisor puede aplicar en un PR, además de las tres que la
especificación ya prohíbe (kickers en mayúsculas espaciadas, palabra del headline en otro color, flechitas
pegadas al texto del botón):

1. Ningún texto de producto empieza con un gerundio de marketing ("Impulsando…", "Transformando…").
2. Ningún número aparece sin su unidad o su sustantivo en la misma línea ("+45 XP", nunca "+45" flotando).
3. Ninguna tarjeta usa a la vez borde grueso y sombra sólida: una de las dos comunica el borde, no ambas.
4. Ningún estado vacío usa la palabra "todavía" sin ofrecer la acción que la resuelve en el mismo bloque.
5. Ningún título de sección del Studio repite el nombre de la ruta que ya está en el sidebar.

### 2.4 Elevación, botón 3D y foco

**El botón 3D es la firma visual, y se implementa con solo `transform`.** La especificación pide un borde
inferior de 4px que pasa a 0 en `:active` — eso reflowea el contenido del botón en la interacción más
frecuente del producto (unos 200 taps por sesión), y es el jank más visible que podría tener la maqueta.

Dos capas apiladas: `.btn3d__shadow` (absoluto, `top: var(--btn-depth)`, `bottom: 0`) y `.btn3d__face`
(relativo, altura fija). `:hover` → `translate3d(0,-1px,0)`. `:active` → `translate3d(0,var(--btn-depth),0)` en
60 ms lineales, y la cara tapa la sombra. Nunca se anima `box-shadow`, `top`, `height` ni `margin`.

Tamaños: `sm` h44/depth3/r12 · `md` h52/depth4/r16 · `lg` h60/depth4/r20 — alturas totales 47/56/64, todas
≥44px de objetivo táctil sin trucos de `::before`.

**La sombra sólida es el tono -800, no el -700.** Medido: `brand-600 #6C4CF1` sobre `brand-700 #5334D8` solo
separa **1.38:1** — a 4px de altura, en un móvil al sol, el canto del botón desaparece. Sobre
`brand-800 #3E24A6` separa **1.96:1**. Regla dura: cara y sombra deben quedar en **[1.9, 2.7]**. Tabla final:
primary 1.96 · success (lima 500→700) 2.48 · danger 1.79 · amber 2.63 · sky 2.62 · ghost 2.02. El default es
copiar el "-700" del sistema de referencia sin medir que la distancia entre 600 y 700 depende del hue: en
violeta son 5 puntos de luminancia, en ámbar son 35.

**El estado `locked` es legible a propósito:** cara `--line-200`, etiqueta `--ink-700 #3A3350` (9.30:1),
`aria-disabled="true"` en vez de `disabled` (sigue enfocable), candado obligatorio, y al pulsar hace el
*clunk* (translateY 1px + `wrong` al 40% de ganancia) en vez de no hacer nada. El default —`opacity: .5` y
`disabled`— produce un gris ilegible, no enfocable, y el usuario nunca se entera de qué le falta.

**Escala de elevación sólida de 5 niveles, con asignación cerrada por componente:** e0 sin sombra (filas de
tabla, celdas de heatmap, chips inertes) · e1 `0 2px 0 0` (inputs, chips, píldoras del nav, filas de liga) ·
e2 `0 4px 0 0`, la firma (botones, nodos del camino, tarjetas de lección y de dinámica) · e3 `0 6px 0 0` (FAB
de repaso, cofre cerrado, burbuja de la mascota, fantasma de arrastre) · e4 `0 8px 0 0` (insignia heroica del
takeover, emblema de división). El `:active` de cada nivel consume exactamente su altura. **Única excepción
con blur:** overlays que flotan sobre fondo arbitrario —modal, drawer, popover, command palette, toast.

Radios 12 · 16 · 20 · 28 · 999. Espaciado en múltiplos de 4, grid de 8. Iconos `lucide-react` con
`strokeWidth={2.5}`.

### 2.5 Dark mode — seis cosas que no son de color

El default es invertir tinta y papel y declarar el trabajo hecho. Esto es la lista de lo que esa inversión
rompe:

1. **La sombra sólida se oscurece, no se invierte.** Conservar el `-800` claro en oscuro daría una banda más
   clara que el canvas y leería como halo, no como profundidad. Objetivo 2.6–3.4:1 contra la cara
   (`brand-600` sobre `#22125C` = 3.01).
2. **Se añade un canto superior:** `--edge-highlight: inset 0 1px 0 rgba(244,241,255,.10)`, blur 0, solo en
   oscuro.
3. **La elevación deja de ser un escalón de superficie.** `--paper #1A1428` sobre `--canvas #100C1B` es
   **1.08:1**, invisible. En oscuro la profundidad se comunica con canto superior + sombra sólida + contorno
   de 1px, y se añade `--paper-raised #2A2140` (1.27 vs canvas) exclusivamente para modales y drawers.
4. **Los bordes de control cambian de token.** `--line-200 #2E2542` da 1.24:1 sobre papel oscuro y no puede
   ser el borde de un input; se añade `--line-strong #6E6090` (3.18 sobre papel, 3.43 sobre canvas), el único
   borde permitido en controles.
5. **El lima florece en OLED.** `#B6F03C` sobre `#100C1B` da 14.23:1 y deslumbra durante los transforms; en
   oscuro `--lime-500` se remapea a `#8FBE2E` (8.78:1, −38% de luminancia) **para rellenos grandes**. El
   anillo de foco conserva el lima original: es un trazo de 3px, no un área.
6. **El canvas oscuro nunca es `#000`.** Los píxeles negros de OLED tienen respuesta más lenta y arrastran
   durante el scroll del Camino.

Y `--ink-500` no sobrevive: 3.20:1 en oscuro. Se sustituye por `#9FA0BF` (7.03:1).

### 2.6 White-label — el color es el dato del cliente; la variable libre es el texto

`src/design/color.ts`, ~90 líneas escritas a mano, **cero dependencias**: sRGB↔lineal, lineal↔LMS con la
matriz M1 de Björn Ottosson, LMS→OKLab, OKLab↔OKLCH, la inversa completa, luminancia y contraste, recorte de
gamut por búsqueda binaria sobre el croma (12 iteraciones, tolerancia 0.0005) y `deriveRamp`.

El espacio es OKLCH y no HSL porque en HSL bajar la L de un amarillo saturado lo vuelve verde oliva y el paso
-700 pierde el matiz del cliente. Y no se instala `chroma-js` (+18 KB) porque `darken()` opera con un paso
fijo y **no garantiza contraste**: aquí la función objetivo *es* el contraste, así que el algoritmo correcto
es una búsqueda binaria sobre L, y eso no existe en ninguna librería como tal.

Objetivos de L por escalón: 300:0.80 · 400:0.72 · 500:0.65 · 600:0.575 · 700:0.49 · 800:0.40, con C escalada
por [0.55, 0.75, 0.92, 1.00, 0.95, 0.82] y recorte a gamut. Después corre una **pasada de corrección
numérica**: baja L del 600 en pasos de 0.01 hasta que `contrast(600, #FFF) ≥ 4.5` (máximo 12 iteraciones), y
del 700 hasta ≥4.5 sobre papel.

La decisión de tinta sobre el relleno **no** es `luminancia > 0.5`: es
`contrast(#FFF, fill) >= contrast(--ink-900, fill) ? blanco : tinta`. Si el ganador queda por debajo de 4.5, se
oscurece el relleno ΔL = −0.02 hasta 20 veces y la UI dice, con muestra antes/después: *"Ajustamos tu color un
X% para cumplir AA (3.9 → 4.6)"*. El resultado se guarda como `contrastReport` en el slice de branding y es lo
que alimenta la prueba automática.

Lo que el default hace —forzar blanco y oscurecer el color del cliente hasta que pase— destruye la marca del
cliente. Aquí el hex del cliente se conserva siempre que sostenga *algún* texto, y lo que se elige es el
texto. Verificado contra nueve colores de referencia (`#6C4CF1`, `#FFD400`, `#E11D48`, `#0F766E`, `#1B2A6B`,
`#FF6B00`, `#111111`, `#B6F03C`, `#22D3EE`): los nueve se conservan tal cual, cambiando solo si el rótulo va
blanco o tinta.

### 2.7 Movimiento — el mecanismo primero, el catálogo después

> Esta subsección es de mi autoría directa: el track que debía producirla se perdió en el fallo de la ronda 2.

**El problema real no son las 27 animaciones, es que la número 40 se le olvide a alguien.** Si cada componente
escribe `if (reducedMotion)`, la regla se rompe. Por eso la degradación es estructural:

`src/design/motion.ts` exporta dos catálogos, `FULL` y `REDUCED`. El segundo lo genera `degrade()` en tiempo
de módulo: conserva solo las claves informativas (`opacity`, `pathLength`), borra `x/y/scale/rotate` y
sustituye la transición por `{ duration: 0.12, ease: 'linear' }`. **El tipo lo obliga:**
`buildReduced<T extends Catalog>(full: T, overrides: Partial<Record<keyof T, Variants>>): { [K in keyof T]: Variants }`
— si añades un variant y no declaras su degradado, TypeScript no compila.

`<MotionRoot>` lee `useReducedMotion()` **una vez** y pone el catálogo elegido en un contexto. Los componentes
escriben `const v = useVariants(); <motion.div variants={v.feedbackCorrect} animate="in"/>`. Cero `if` en el
100% de los componentes: la única rama del sistema está en `MotionRoot`. Encima va
`<MotionConfig reducedMotion="user">` para lo que framer maneja internamente (`layoutId`, `drag`, `layout`).

**Cinco canales semánticos, no un booleano.** `MotionChannel = 'entrance' | 'emphasis' | 'physics' |
'continuity' | 'ambient'`. Bajo movimiento reducido, `entrance` y `emphasis` siguen **activos** (degradados a
120 ms o a un destello), y `physics`, `continuity` y `ambient` se apagan por completo. Apagar todo eliminaría
el feedback de correcto/incorrecto, que por accesibilidad ya no puede ser solo color; dejar todo ignora la
preferencia. La granularidad por canal es lo que permite decir *"el corazón desaparece con fade pero el
contador de vidas sigue siendo assertive"*.

**Lo que no es un variant pasa por una fachada.** Confetti, shake imperativo, partículas y SFX viven en
`src/design/fx.ts`: `fx.confetti(origin, wave)`, `fx.burst(el)`, `fx.shake(el)`, `fx.play(sfxId)`. La fachada
lee la misma señal: confetti → no-op; shake → destello de borde de 120 ms en coral; burst → pulso de opacidad.
ESLint prohíbe importar `canvas-confetti` fuera de `fx.ts`. Casi nadie degrada el confetti, porque no está en
el sistema de animación: está en un `import` suelto dentro de la pantalla de resumen.

**Springs:** `pop` 620/22/0.7 · `soft` 260/26 · `snap` 900/40 · `bouncy` 400/12.

**Los loops `ambient` llevan triple compuerta:** se apagan si el canal está off, si el elemento no está en
viewport (`IntersectionObserver`), o si `document.visibilityState !== 'visible'`. En un camino de 190 nodos,
`repeat: Infinity` sin compuertas es el bug de rendimiento número uno del producto, y no se nota en desarrollo
porque la lista de prueba tiene seis nodos.

**Las excepciones a "solo transform y opacity" son dos, nombradas y con cuota:**

1. `pathLength` en el anillo de XP (paint sin layout). Cuota: **máximo 3 anillos animando a la vez**,
   prohibido dentro de listas y de la tabla de usuarios.
2. Ninguna otra. En particular **`stroke-dasharray` queda prohibido**: el anillo nuevo de la cola en `levelUp`
   entra con `scale 0→1`, no animando el dash.

**Y una corrección de WebKit que habría roto la cinemática más visible:** el giro 3D de la insignia de subida
de nivel **no puede vivir en un `<g>` de SVG**. WebKit no aplica `perspective` ni `transform-style: preserve-3d`
a elementos SVG, así que en el Safari de escritorio de una laptop corporativa el `rotateY` colapsa a un
aplastamiento horizontal sin aviso. El `rotateY` va en el `<div>` que envuelve al `<svg>`.

#### La matriz de las 27

`motion.ts` exporta `MICRO_INTERACTIONS: readonly { id, name, owner, variant, channel, reducedFallback }[]`
con 27 entradas, y cada componente que implementa una lleva `data-mi="07"`. `motion.spec.ts` cruza la
constante contra un grep del árbol y **falla si alguna no tiene implementación declarada**. Una tabla en
PLAN.md con casillas que alguien marca a mano no se audita en la fase 10.

| # | Dueño | Variant | Técnica (solo transform/opacity salvo nota) | Degradación con reduced-motion |
|---|---|---|---|---|
| 1 | `FeedbackPanel` + `Mascot` | `feedbackCorrect` | Panel siempre montado, `translateY(110%)→0` con `spring.pop`; `fx.burst` suelta 14 spans de 6px desde el botón; mascota entra 40 ms **después** del panel | Panel con fade 120 ms; sin partículas; mascota va a su fotograma final |
| 2 | `ExerciseCard` + `HeartBar` | `shakeX` | `translateX` 3 ciclos, 320 ms, `spring.snap`; borde coral por opacidad; corazón sale con gravedad simulada en `y` + `rotate` | Destello de borde coral 120 ms; corazón con `opacity 1→0`; el contador `assertive` hace el trabajo |
| 3 | `ComboMeter` | `comboPulse` / `comboBlaze` | 5 segmentos discretos que se llenan por `scaleX`; chispas del pool DOM; ruff de la mascota a `scaleY 1.35` | Sin chispas ni pulso; el segmento y el número `×1.25` cambian con fade |
| 4 | `PathNode` | `breathe` | `scale 1→1.03`, 2,400 ms, `delay: index * 0.18`, canal `ambient` con triple compuerta | `scale: 1` fijo — el variant existe, el loop no corre |
| 5 | `PathNode` | `activeRing` + `startBubble` | Anillo con `pathLength` (cuota 1 de 3); burbuja "EMPEZAR" con `y` en loop `soft` | Anillo salta a su valor; burbuja estática |
| 6 | `PathNode` → `LessonOverlay` | `lessonOverlay` | `layoutId={`path-node:${lessonId}`}` **condicional**, activado por spread solo si el nodo origen está montado | Se **omite** `layoutId` (spread condicional); overlay con fade 120 ms + backdrop que oscurece |
| 7 | `PathNode` | `clunk` | `translateY 1px` + `rotate ±1.5°`, 180 ms, `snap`; `fx.play('wrong')` al 40% de ganancia | Solo el sonido y un destello de borde |
| 8 | `SectionFill` | `sectionFill` | **Una** losa con `scaleY 0→1`, `transformOrigin: 50% 0%`, detrás de nodos con `color-mix`: 12 nodos cambian de color con 1 animación y 0 re-renders | Losa aparece con fade; confetti apagado |
| 9 | `Odometer` | `counterDigit` | Un `<span>` por dígito, `width: 1ch`, `translateY -100%→0` escalonado 24 ms | `motionValue.set(target)` inmediato; se conserva `aria-live="polite"` |
| 10 | `LessonProgressBar` | `progressAdvance` | `scaleX` con `useSpring`, `transformOrigin: 0% 50%`; el overshoot (~1.06) se recorta con `overflow: hidden`; **el brillo se contra-escala** con `useTransform(sx, v => 1/v)` | `scaleX` sin spring, 120 ms; sin brillo |
| 11 | `XPRing` | `xpRing` | `pathLength` animado (cuota 2 de 3) | Salta al valor final |
| 12 | `LevelUpTakeover` | `levelUp` | Insignia entra girando: `rotateY` en el **`<div>` que envuelve el `<svg>`**, nunca en un `<g>`; confetti en dos oleadas de 60 y 30 separadas 260 ms; botón a 400 ms | Fotograma final con fade 120 ms; confetti no se monta; botón inmediato |
| 13 | `ChestCinematic` | `chestShake` → `chestBurst` | Temblor 600 ms (`rotate` + `x`), estallido, recompensa que gira y se acerca con `scale` + `rotate` | Va directo a la recompensa; **el flash se elimina por completo** (es un riesgo fotosensible, no solo una animación) |
| 14 | `LeaguePromotion` | `leaguePromote` | Tabla baja opacidad; tu fila vuela con `layout`; emblema con destello radial por `scale` + `opacity` | Emblema con fade; la fila salta a su posición |
| 15 | `StreakLostCinematic` | `streakLost` | Desaturación por capa de overlay (no `filter` en el árbol); mascota a `sad`; `--streak-ink` → `--ink-500` | Cambio de token + fade; sin desaturación progresiva |
| 16 | `(app)/template.tsx` | `routeEnter` | Solo **entrada**: fade + `scale 0.985→1`, `spring.soft`, ~160 ms. Sin truco de `FrozenRouter`. La única salida real es la del overlay de lección, que la obtiene de su `AnimatePresence` local | Fade 120 ms |
| 17 | `BottomNav` | `navActive` | Ícono con `scale` `spring.pop`; etiqueta con `scaleY` + `opacity` | Solo cambio de color y peso del ícono |
| 18 | `StickyHeader` | `headerCollapse` | `translateY` + `scale` del bloque de título, dirigido por `useScroll` con `will-change` acotado | Header en su estado compacto sin animar |
| 19 | `Modal` / `Drawer` | `modalIn` | `scale 0.94→1` con `spring.pop`; backdrop con `opacity` (el blur es de los overlays, única excepción autorizada) | Fade 120 ms, sin escala |
| 20 | `sonner` (config propia) | `toastIn` | Entrada elástica desde arriba con `bouncy` | Fade 120 ms |
| 21 | `Skeleton` | `shimmer` | Overlay con `translateX()`, **jamás `background-position`**; canal `ambient` | Sin barrido; superficie estática |
| 22 | `DataTable` fila | `rowHover` / `rowSelect` | `translateY(-1px)` + sombra e1; check con `pathLength` (cuota 3 de 3) | Sin elevación; check aparece con fade |
| 23 | `Drawer` del Studio | `drawerRight` | `translateX(100%)→0` con `spring.soft` | Fade 120 ms |
| 24 | `SortableList` | *(sin variant)* | El reacomodo lo hace **dnd-kit** con `transition: null` en `useSortable` y `spring.snap`. **Prohibido `layout` de motion en cualquier nodo con `useSortable`**: ambos escriben el mismo transform y producen jitter de 2–4px | Sin animación de reacomodo; el orden salta |
| 25 | `LivePreview` | `previewPulse` | `useAnimationControls().start({ scale: [1, 1.004, 1] })` en un efecto sobre el contador de commits. **Nunca con `key`**: cambiar la `key` desmonta el subárbol y destruye el estado de juego que el preview existe para conservar | Sin pulso; un borde ámbar de 1px marca el cambio |
| 26 | `KpiTile` | `kpiCountUp` | `Odometer` disparado por `IntersectionObserver`, **una sola vez** (`once: true`) | Número final directo |
| 27 | `CommandPalette` | `spotlightIn` | `scale 0.96→1` + `opacity`, `spring.pop`, backdrop con blur | Fade 120 ms |

**Timeline de la respuesta correcta como dato, no como `setTimeout`s.** `CORRECT_TIMELINE` es un arreglo de
beats `{ at, id, layers }` con offsets 0 / 70 / 120 / 140 / 200 / 260 / 420 / 700 ms y un **techo declarado de
3 capas compositadas nuevas por frame**. Existe `CORRECT_TIMELINE_REDUCED` de 4 beats, todos en `t=0`. Ponerlo
en un archivo de datos permite que el test lo verifique y que ajustar el ritmo de la demo sea cambiar números.

**Regla numérica de confetti vs partículas DOM:** si hay ≥2 animaciones de UI activas al mismo tiempo →
partículas DOM (14 spans de 6px, pool premontado, `will-change` encendido 700 ms y apagado). Si la pantalla es
un takeover donde nada más se mueve → `canvas-confetti`, canvas persistente con `resize: false`,
`useWorker: true`, `disableForReducedMotion: true`, 90 partículas en dos oleadas.

**"Ningún transition inline" se hace cumplir con selectores AST**, no con revisión humana. `eslint.config.mjs`
(flat, ESLint 9) prohíbe `JSXAttribute[name.name='transition']`, cualquier `animate`/`initial`/`exit`/
`whileHover`/`whileTap`/`whileInView` con objeto literal (obliga a `variants={} + animate="nombre"`), y el
import de `motion/react` fuera de `src/design/**`. Más un `scripts/check-solid-shadows.mjs` que falla si
aparece un `box-shadow` con blur ≠ 0 fuera de `tokens.css` o de una clase `.overlay-*`.

**La regla operativa anti-decoración**, aplicable en un PR: *una animación se queda si responde a una acción
del usuario o comunica un cambio de estado que el usuario no pidió pero necesita saber. Si su ausencia no
cambia lo que el usuario entiende, se va.* Corolario práctico: ninguna sección de contenido entra con
fade-and-slide-up al hacer scroll.

### 2.8 Audio — sintetizado, y armónicamente ligado al feedback

`src/design/sound.ts` declara `type SfxId = 'correct' | 'wrong' | 'combo' | 'levelUp' | 'chestOpen' | 'tap' |
'whoosh' | 'streakFire'` (los 8 de la especificación, en el módulo donde la especificación los ubica), y
`src/lib/audio/synth.ts` los sintetiza con osciladores + envolvente ADSR + filtro. Cero archivos `.mp3`.

**El combo sube por una pentatónica mayor de Re, no por semitonos.**
`COMBO_SCALE = [587.33, 659.25, 783.99, 880.00, 987.77, 1174.66, 1318.51, 1567.98]` Hz — D5 E5 G5 A5 B5 D6 E6
G6. El índice es `min(combo, 8) − 1`; de 8 en adelante se mantiene G6 y solo sube la ganancia 0→+1.5 dB y se
abre el paso-bajo de 4 kHz a 8 kHz (modo "en llamas"). El default (`freq * 2^(combo/12)`) es una cromática
ascendente, barata de escribir y desagradable a partir del quinto acierto, **y disonante contra el sonido de
acierto que ya está sonando**. La decisión no es "que suba de tono": es que el combo esté armónicamente ligado
al cue de correcto.

**Desbloqueo y ciclo de vida.** Máquina `'idle' | 'unlocking' | 'ready' | 'unavailable'`. El `AudioContext` se
**crea dentro** del primer `pointerdown`/`keydown` (`{ capture: true, once: true }`) porque en Safari/iOS
crearlo fuera del gesto lo deja `suspended` para siempre; luego `resume()`. Si no existe o `resume()` rechaza
→ `'unavailable'`: el toggle de `/ajustes` se deshabilita con la leyenda *"Audio no disponible en este
navegador"* y `fx.play()` es un no-op silencioso — **nunca lanza dentro del player**.

**Ocho grupos de voces concurrentes** en un anillo; al desbordar se roba la más antigua con
`gain.setTargetAtTime(0, now, 0.012)` + `disconnect` a los 40 ms, nunca `stop()` abrupto (produce un clic de
una muestra). Throttle por id: `tap` 45 ms, `wrong` 90 ms, `correct` 60 ms. Cadena master →
waveshaper (soft clip) → compresor → destino: sin ella, apilar `correct` + `combo` + `chestOpen` satura y
suena a distorsión de bocina de laptop.

**Apagar el sonido a media envolvente** hace `cancelScheduledValues` + `setTargetAtTime(0, now, 0.012)` y
`suspend()` a los 60 ms. **Nunca `close()`**: en Safari no se puede reabrir sin otro gesto del usuario.
`visibilitychange` → `suspend` con debounce de 250 ms, para no matar el sonido de lección completa cuando el
usuario baja el centro de notificaciones.

**El audio no se degrada con movimiento reducido; se *duckea* en cinemáticas.** `playLevelUp()` llama
`duck(0.45, 900)` para bajar el master mientras corre el takeover, y el cue de combo mantiene su ascenso de
tono incluso con movimiento reducido. Sonido y movimiento son ejes distintos: el audio **compensa** la pérdida
visual, y es lo que hace que el modo reducido sea informativamente equivalente y no una versión mutilada.

---

## 3. Árbol de carpetas final

### 3.1 La frontera del paquete se impone con lint

Un solo repo, sin workspaces. `src/content/` **es** el paquete reutilizable: tiene su propio `index.ts` como
única superficie pública, se importa como `@senda/content` vía `tsconfig` paths, y
`eslint-plugin-import/no-restricted-paths` **prohíbe con error** que `src/content` importe de `src/app`,
`src/mock`, `src/lib/store` o `src/components`, y que `engine` importe de `dynamics`. Además `src/content/engine`
lleva `no-restricted-globals` sobre `window`, `document` y `localStorage`.

Se compra la garantía del monorepo —aislamiento verificable— sin comprar su coste de tooling, y la afirmación
de arquitectura se comprueba con `pnpm lint` en vez de por revisión humana.

```
senda/
├── PLAN.md · DECISIONS.md · README.md · ARCHITECTURE.md
├── ADDING_A_DYNAMIC.md · CONTENT_SCHEMA.md · DEMO_SCRIPT.md
├── package.json · pnpm-lock.yaml · tsconfig.json
├── eslint.config.mjs                  # flat config, ESLint 9 — reglas de determinismo y de movimiento
├── eslint-local-rules/
│   ├── no-magic-economy.mjs           # prohíbe literales numéricos en src/game/** y components/game/**
│   └── require-boot-num-suppress.mjs
├── next.config.ts · postcss.config.mjs · vitest.config.ts
├── perf/budgets.json                  # única fuente de verdad de los 7 presupuestos
├── scripts/
│   ├── check-budgets.mjs · check-solid-shadows.mjs · check-inline-script-size.mjs
│   └── gen-phase-report.mjs           # genera PHASE_REPORT.md; no hay forma de reportar sin medir
└── src/
    ├── app/
    │   ├── layout.tsx · globals.css · not-found.tsx · global-error.tsx
    │   ├── (marketing)/page.tsx                     # "/" — landing de una pantalla
    │   ├── (onboarding)/bienvenida/page.tsx         # reducer único, 5 pasos, ?paso= por nuqs
    │   ├── (app)/
    │   │   ├── layout.tsx · template.tsx · loading.tsx · error.tsx
    │   │   ├── aprende/page.tsx                     # EL CAMINO
    │   │   ├── @player/default.tsx
    │   │   ├── @player/(.)leccion/[lessonId]/page.tsx   # ruta interceptada → layoutId
    │   │   ├── practica/ · ligas/ · misiones/ · tienda/
    │   │   └── perfil/ · logros/ · ajustes/
    │   ├── (player)/leccion/[lessonId]/page.tsx     # fallback duro, pantalla completa, deep link
    │   ├── (studio)/
    │   │   ├── layout.tsx · template.tsx · loading.tsx · error.tsx
    │   │   ├── dashboard/ · users/ · users/@drawer/(.)[userId]/ · users/[userId]/
    │   │   ├── cohorts/ · courses/ · courses/[courseId]/edit/
    │   │   ├── lessons/[lessonId]/edit/             # EL EDITOR
    │   │   ├── dynamics/ · media/ · reports/ · inbox/
    │   │   └── gamification/ · branding/ · audit/
    │   └── kitchen-sink/page.tsx + perf/page.tsx    # todo jugable + el medidor de 60fps
    ├── content/                                     # === EL PAQUETE ===
    │   ├── index.ts                                 # única superficie pública
    │   ├── engine/
    │   │   ├── primitives.ts                        # marcas, mintId, Json, ContentText, I18nKey, Score01
    │   │   ├── registry.types.ts · registry.ts      # declaration merging + prueba de completitud
    │   │   ├── dynamic.ts                           # DynamicDefinition, ErasedDynamic, BoundStep
    │   │   ├── schema.ts · step.ts                  # Course→Section→Unit→Lesson→Step (Zod)
    │   │   ├── grade.ts · session-machine.ts        # calificación pura; reducer headless
    │   │   ├── runtime.ts                           # el puerto LessonRuntime
    │   │   ├── path.ts                              # ContentPath + formatContentPath
    │   │   ├── validate.ts · issues.ts              # walker + vocabulario cerrado de códigos
    │   │   ├── diff.ts · lis.ts                     # emparejamiento por id + LIS (compartido)
    │   │   ├── serialize.ts · canonicalize.ts       # CoursePackage, hash canónico, ENGINE_VERSION
    │   │   ├── introspect.ts                        # ZodObject → FieldDescriptor[] para SchemaForm
    │   │   └── conformance.ts                       # describeDynamic(): 16 aserciones × 14
    │   ├── dynamics/
    │   │   ├── index.ts                             # barrel: solo meta.ts (puro, ~2 KB)
    │   │   ├── multiple-choice/     {meta,ui,schema,Player,Editor,FeedbackDetail}.ts(x)
    │   │   ├── multiple-select/ · true-false-swipe/ · fill-blank/ · word-bank/
    │   │   ├── match-pairs/ · order-sequence/ · sort-buckets/
    │   │   ├── hotspot/             + scenes/{form,reception,file,system,floorplan}.ts
    │   │   ├── listen-choose/ · speak-mock/ · branching-scenario/
    │   │   ├── flashcards/ · timed-challenge/
    │   │   └── __tests__/contract.test.tsx          # describe.each sobre el registro vivo
    │   └── seed/catalog.ts                          # ÚNICO módulo isomorfo: 3 cursos, 26 secciones, 190 lecciones
    ├── mock/                                        # client-only (barrera + guard de lint)
    │   ├── boot-client.ts · db.ts · seed.ts · rng.ts · activity.ts
    │   ├── persist.ts                               # única puerta a localStorage/sessionStorage
    │   ├── clock.ts → (re-export de lib/clock)
    │   ├── economy.ts                               # economySchema + defaults + rangos + EconomyFieldMeta
    │   ├── overlay/{types,materialize,compact,quarantine}.ts
    │   ├── srs.ts · hearts.ts · impersonate.ts · bus.ts · avatar.tsx
    │   ├── repo/{users,courses,progress,leagues,analytics,cohorts,assignments,releases,audit,media}.ts
    │   └── fixtures/{courses,lesson-plan,org,names,voice,badges,quests,shop}.ts
    ├── design/
    │   ├── tokens.css · mascot.tokens.css
    │   ├── motion.ts · fx.ts · sound.ts · voice.ts · curves.ts
    │   ├── color.ts · ramp.ts                       # OKLCH a mano, ~90 líneas, cero deps
    │   ├── contracts.ts · contrast.test.ts          # el contraste es un test que rompe el build
    │   └── measure-x-height.ts
    ├── components/
    │   ├── ui/                                      # primitivas re-estilizadas (Button3D, Verdict, EmptyState…)
    │   ├── game/
    │   │   ├── mascot/{Mascot,MascotChip,MascotSolid,MascotRig,choreography,outfits/}
    │   │   ├── PathNode · PathSpine · SectionFill · SectionHeader
    │   │   ├── HeartBar · XPRing · Odometer · GemCounter · StreakFlame · StreakCalendar
    │   │   ├── ComboMeter · Chest · BadgeTile · LeagueRow · QuestCard · ShopCard
    │   │   ├── ExerciseCard · FeedbackPanel · LessonProgressBar · StepDefectCard
    │   │   ├── BottomNav · StickyHeader · AppHud
    │   │   └── CinematicQueue + {LevelUpTakeover,ChestCinematic,LeaguePromotion,StreakLostCinematic}
    │   └── studio/
    │       ├── DataTable · FilterBar · FacetChips · BulkBar · UserDrawer
    │       ├── SchemaForm · PropertyPanel · StepList · LivePreview · PhoneFrame
    │       ├── PublishDialog · DiffView · ImportDialog · CourseTree
    │       └── CommandPalette · AuditFeed · EconomyForm · BrandingForm
    ├── features/                                    # islas 'use client' con ssr:false + skeleton
    │   ├── shell/skeletons/index.tsx                # un solo módulo, consumido por loading.tsx y por dynamic()
    │   └── path/ · lesson/ · leagues/ · studio-users/ · studio-editor/ …
    ├── game/                                        # los 13 sistemas: funciones puras + ledger
    │   ├── ledger.ts · xp.ts · levels.ts · streak.ts · gems.ts · shop.ts
    │   ├── quests.ts · badges.ts · chests.ts · league-runtime.ts · testout.ts · prereqs.ts
    │   └── types.ts
    ├── i18n/{es-MX.ts,en.ts,t.ts}
    └── lib/
        ├── clock.ts                                 # now() anclado · nowReal() · mono() · dayIndexInZone()
        ├── capabilities.ts · scroll-memory.ts · boot-digest.ts · inline-script.ts
        ├── hooks/ · store/{vitals,content,session,ui}.ts · utils/
        └── __tests__/
```

---

## 4. Los 14 contratos de tipos centrales del motor

Bajo `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. Cero `any`, cero
`as unknown as`, cero `@ts-ignore`. `as` está **prohibido por ESLint** en todo `src/` con una única excepción
sintáctica: `as const`.

**1. `Brand<T, K>` y las marcas de identidad.** `primitives.ts` es el dueño único.
`type CourseId = string & { readonly __brand: 'CourseId' }`, y así `SectionId`, `UnitId`, `LessonId`, `StepId`,
`SkillId`, `MediaId`, `UserId`, `CohortId`, `BadgeId`, `AssignmentId`, `AuditId`, `ReportId`. Se producen
**exclusivamente por un parse de Zod** (`.brand<'X'>()`) o por `mintId(prefix, rng)`, la única fábrica. Formato
`<pfx>_<8 base32 Crockford sin i,l,o,u>`. El seed usa `mintId`; `src/lib/ids.ts` no existe.

**2. `Json`, `ContentText`, `I18nKey`, `Score01`, `MilliXp`.** `type Json = null | boolean | number | string |
readonly Json[] | { readonly [k: string]: Json }`. El `data`, el `answer` y el `detail` de toda dinámica están
**restringidos a `Json`**: un `Date` dentro del `data` rompería a la vez los snapshots, el diff campo por campo
y el import/export, en silencio. `ContentText` (contenido monolingüe) e `I18nKey` (`keyof typeof esMX`, unión
literal) son marcas **incompatibles**: el tipo `string` no existe en el motor.

**3. `DynamicRegistryMap` y la prueba de completitud.** `interface DynamicRegistryMap {}` vacía en
`registry.types.ts`; cada plugin la aumenta desde su propio archivo con `declare module`. De ahí se derivan
`DynamicType`, `DataOf<K>`, `AnswerOf<K>`, `DetailOf<K>` y la unión discriminada `TypedStep`. El barrel incluye
un chequeo a nivel de tipos —`[Missing, Extra] extends [never, never] ? true : { error, missing, extra }`—
que **no compila** si el mapa de tipos y el arreglo de runtime divergen. Eso es lo que hace segura la promesa
de "1 archivo + 1 línea".

**4. `DynamicDefinition<K>`.** Un solo genérico, atado al registro, en vez de los dos libres de la
especificación: con `<TData, TAnswer>` el `type: string` y el `TData` son independientes y se puede registrar
`'multiple-choice'` con el data de flashcard, y compila. Miembros:

```
type · label: I18nKey · icon · version: number
dataSchema · answerSchema · detailSchema
defaultData · solution(data) · distractor(data, rng)
grade(data, answer): GradeResult<DetailOf<K>>        // pura
validate(data): readonly LocalIssue[]                // significado, no forma
searchText(data): readonly ContentText[] · describe(data) · refs(data)
estimateSeconds(data) · consumesHearts: boolean
supports: { hearts, timer, audio, keyboard } · requires: readonly ('mic'|'speech'|'pointer-fine')[]
loadPlayer() · loadEditor()                          // next/dynamic desde ui.ts
```

Ocho de esos miembros no están en la especificación. Cada uno paga algo concreto: `solution` habilita el arnés
de conformidad y la validación de "contenido resoluble"; `searchText` es el ⌘K global; `describe` es la lista
de pasos, el diff y la analítica; `refs` es el remapeo de ids del import; `version` llena `dynamicVersions` del
snapshot (que sin él no tenía fuente); `requires` permite advertir que una dinámica no se puede jugar en la
laptop de la demo. Sin ellos, la analítica y el buscador tendrían que meterse *dentro* del `data` de cada
dinámica, que es exactamente el acoplamiento que el patrón de plugins existe para prohibir.

**5. `ErasedDynamic` y `BoundStep` — la erasure por instancia.** El problema real:
`ComponentType<PlayerProps<TData>>` **no** es asignable a `ComponentType<PlayerProps<unknown>>` (varianza
contravariante). El default es `Map<string, DynamicDefinition<any, any>>` con un cast en el punto de uso:
compila y miente. Aquí `defineDynamic` devuelve un `ErasedDynamic` cuyo
`bind(rawData): Result<BoundStep, LocalIssue[]>` **parsea el data una vez** y devuelve un objeto de clausuras
(`renderPlayer`, `renderFeedbackDetail`, `grade`, `solve`, `describeAnswer`, `searchText`) donde `TData` ya no
aparece en ninguna firma. La validación en la frontera es lo que hace *sana* la erasure. El player, la
preview, el editor y la analítica solo conocen `BoundStep`.

**6. `PlayerProps<K>`, `EditorProps<K>`, `PlayerChrome`.** El plugin **nunca dibuja el CTA**: expone
`onDraft(answer | null)` para reportar que hay respuesta armable y `onSubmit(answer)` para atajos; el botón
Comprobar/Continuar de ancho completo lo dibuja siempre el shell. Con un solo `onAnswer` el shell no puede
saber si el botón va habilitado sin preguntarle al plugin. `PlayerProps` incluye
`rng: (salt: string) => number` —barajado determinista, `Math.random` prohibido por lint— y
`EditorProps.onChange(next, intent)` lleva la **intención** para que el undo/redo pueda coalescer.

**7. `GradeResult<TDetail>`.** `{ correct: boolean; score: Score01; feedback: I18nKey | null; detail: TDetail;
skillScores: Readonly<Record<SkillId, Score01>> }`. Sin `partial?`, sin `diff?: unknown`. Ese `unknown` obliga
a un cast en el único sitio donde se pinta, y ese cast se multiplica por tres: analítica, resumen de lección y
bandeja de reportes. En su lugar, `detail` es tipado por el tercer genérico y **el plugin es dueño de su propio
`FeedbackDetail`**. `skillScores` es lo que hace que exista una cola SRS: sin atribución por skill, un paso con
cuatro skills premia o castiga a las cuatro por igual.

**8. `RawStep` → `PreparedStep` y `prepareStep`.** `mock/repo/*` devuelve `RawStep` (`data: Json`). Ningún
componente recibe un `RawStep`: el motor corre `prepareStep(raw, path, econ)` y entrega `PreparedStep`. Si
falla, devuelve `ValidationIssue[]` con su `ContentPath`, que el player convierte en `<StepDefectCard>` y el
editor en marcas de campo. Con un admin editando contenido en vivo, **la invalidez es un estado esperado del
producto, no un bug**.

**9. El árbol de contenido: `Course` · `Section` · `Unit` · `Lesson` · `Step`.** Dos decisiones que atraviesan
todo el modelo:

- **Referencias por ID, nunca por índice.** `correctOptionId: OptionId`, no `correctIndex: number`. Igual
  `correctBucketId`, `pairIds`, `orderedStepIds`, `hotspotId`, `branchId`. Con índices, arrastrar una opción en
  el editor cambia la respuesta correcta —y es exactamente lo que el cliente va a hacer en la demo. Además
  `noUncheckedIndexedAccess` convierte `options[correctIndex]` en `Option | undefined` en cada punto de uso,
  contaminando `grade`, player, editor y analítica con `??` defensivos que esconden el bug real.
- **Cero propiedades opcionales: `null` explícito.** `hint: ContentText | null`, `explanation: ContentText |
  null`. En Zod: prohibido `.optional()`, obligatorio `.nullable()`. El default —copiar `hint?` de la
  especificación— acaba en pelearse con `exactOptionalPropertyTypes` en cada reducer y apagar la bandera. La
  bandera es requisito.
- **Cardinalidad en el tipo:** `options: z.tuple([option, option]).rest(option)` ⇒
  `readonly [Option, Option, ...Option[]]`. `.min(2)` es una regla de runtime que el tipo no ve; la tupla sí.
- **El contenido no guarda XP absoluto.** `Step.xpWeight: 1|2|3` y `Lesson.difficulty: 1..5`. El XP lo calcula
  `economySchema`. Con XP persistido en 2,100 pasos, mover el deslizador del Studio exigiría reescribir el
  contenido y el diff de versiones mostraría 2,100 filas cambiadas.

**10. `ContentPath` y `formatContentPath`.** `NonEmpty<PathSegment>` con segmentos tipados
(course/section/unit/lesson/step/field) que llevan id, índice y título. **Un solo** formateador con cuatro
salidas: `issue` (`"Unidad 3 › Lección 12 › Paso 4"` — arranca en el segmento de unidad, que es literalmente
el string que pide la especificación), `full`, `compact` y **`href`**
(`/studio/lessons/lsn_x9/edit?step=stp_44&field=options.1.text`). Lo consumen `validate.ts`, el diff, el índice
del ⌘K y los errores de import. El default es formatear el breadcrumb con template strings en cada feature:
tres criterios distintos de 0/1-based y ningún enlace. La salida `href` es la que hace la demo: **clic en el
error y estás en el campo**.

**11. `ValidationIssue`, `IssueCode`, `ValidationReport`.** Vocabulario cerrado de 20 códigos
(`unsolvable-step`, `broken-ref`, `orphan-media`, `prereq-cycle`, `duplicate-id`, `plugin-version-ahead`,
`contrast-fail`, `seed-drift`…) con `severity: 'error' | 'warning' | 'info'`, `path: ContentPath`,
`fixHint: string | null` y `autofix: AutofixId | null`. Sin código no hay deep-link a la celda ofensora ni
autofix; sin severidad, todo warning bloquea la publicación.

El walker tiene tres pasadas y la primera es la que importa: **ejecuta `plugin.solution(data)` contra
`plugin.grade` y exige score 1.0**, o emite `unsolvable-step`. Un paso que pasa Zod y es irresoluble llega al
player y le quita corazones a 300 personas. Coste ≈0.06 ms/paso; el curso más grande (~1,100 pasos) son 66 ms,
troceados por `rAF` cada 300 pasos y con debounce de 300 ms en el editor.

**12. `Skill` y `SkillMemory`.** `SKILL_IDS` es una tupla `as const` de 24 entradas que genera el tipo y el
`z.enum`; el editor muestra multiselect, **nunca input libre**. `tags: string[]` es barato de escribir e
imposible de agregar, y rompe el repaso inteligente en la primera demo con datos reales. `SkillMemory {
skill, strength, halfLifeH, lastSeenMs, attempts, lapses }` con media vida exponencial:
`retrievability = 2 ** (−elapsedH / halfLifeH)` y `halfLife' = clamp(halfLife × (score ≥ 0.75 ? 1.9 : 0.45), 4,
1080)`. Ni SM-2 (le falta el grado de calidad que Anki pide al usuario) ni tres cajas de Leitner.

**13. `MediaRef` y `SceneModel`.** Cero assets remotos y cero `<img>`. `MediaRef` lleva los parámetros del
generador (`kind`, semilla, token de paleta, `viewBox`), no una URL. El hotspot va sobre un **SVG declarativo
versionable**: `diagram: { viewBox, shapes: Shape[] }` dentro del mismo JSON del curso, con
`hotspots: { id, label, polygon: [x,y][] }` en coordenadas normalizadas del viewBox, calificado por
point-in-polygon. El default —una imagen con rectángulos en porcentajes— obliga a red, no se puede versionar
por campo y es inaccesible por teclado.

**14. `ContentHash`, `SnapshotTree` y `CoursePackage`.** Hash de **64 bits reales** (dos FNV-1a con semillas
distintas, concatenadas en hex): con 32 bits y ~7,600 blobs la probabilidad de colisión por cumpleaños es
**0.67%**, o sea uno de cada 150 proyectos materializa la lección equivocada al hacer rollback, en silencio.
El snapshot guarda la jerarquía con `lessonRef: ContentHash` y las lecciones viven en un blob store
deduplicado: publicar tocando 3 lecciones cuesta ~12 KB en vez de ~760 KB, y cada versión es materializable en
O(lecciones) **sin replay**. `CoursePackage` lleva `economy: null` **tipado como literal**: empaquetar "todo lo
del curso" es el reflejo natural y es exactamente cómo un import silencioso reescribiría la gamificación de
1,247 personas.

### 4.1 Segundo nivel: los contratos de runtime

No son del motor de contenido, pero se congelan en la misma fase: `LessonRuntime` (el puerto que el shell
inyecta y que el preview del Studio implementa distinto), `SessionState`/`SessionEvent`/`Cmd` (el reducer
devuelve `[estado, Cmd[]]`, y un ejecutor corre los comandos contra el runtime), `EconomyConfig`,
`ContentOverlay`, `Cohort`, `Assignment`, `Release`, `Attempt`, `AuditEntry`.

Dos que merecen una línea:

- **`LessonRuntime` es una interfaz-puerto inyectada, no un contexto de React.** Se crea *fuera* de React
  (`createSessionRuntime()` / `createPreviewRuntime()`) y se pasa como prop. Con un `LessonProvider` y un flag
  `isPreview`, el día que alguien olvide el flag el editor empieza a gastar corazones reales y a escribir
  intentos en la analítica. Aquí eso **no compila**.
- **El reducer devuelve comandos, no efectos.** Un `useState` por cosa (`isChecking`, `isCorrect`,
  `showFeedback`) hace imposible pausar el cronómetro del paso al abrir un modal, imposible reproducir un bug
  desde una lista de eventos, e imposible que el Studio reinicie la sesión sin desmontar y perder el draft.

---

## 5. Cómo se sostiene cada criterio de aceptación

No como intención — con el mecanismo que lo hace verdadero.

| Criterio | Mecanismo |
|---|---|
| **Crear un módulo con 5 ejercicios de 5 dinámicas, publicarlo, asignarlo a una cohorte de 300 y jugarlo, sin código** | Overlay de documentos sombra por entidad + `materializeCourse` cacheado por `overlayRev`; `repo/assignments.ts` con `scope: course \| unit` y `dueAt`; máquina de release de 5 estados; `BroadcastChannel('senda:content')` invalida la caché y `AnimatePresence` inserta la sección — **~340 ms del clic en Publicar al nodo visible**, sin F5. La semilla garantiza una cohorte de **exactamente 300** ("Recepción · México"), porque el comprador cuenta. Ensayo cronometrado: **9:10** |
| **Una dinámica nueva en <30 líneas que aparezca en editor, biblioteca, player y analítica** | `defineDynamic` acepta `player?: PlayerRecipe` (familias `choice \| sort \| match \| text`) y `editorFields?`; sin `ui.ts`, el Editor se genera del `ZodObject` y el Player de la receta. Conteo real de la dinámica 15 (`likert`): **23 líneas de `meta.ts` + 2 en el barrel = 25**. `ADDING_A_DYNAMIC.md` dice explícitamente que el criterio aplica al **cableado**, no a una UI a medida (el escenario ramificado cuesta ~380 líneas) |
| **1,247 filas con filtros, orden y acciones en lote a 60fps** | `haystack` empacado (~92 KB) + `starts: Int32Array` construidos una vez, con folding es-MX; facetas como `Uint32Array(39)` con conteos que **excluyen la propia faceta** (así no colapsan a cero); selección en `Set<UserId>`, jamás índices de fila; lote troceado en chunks de 40 con presupuesto de 5 ms medido y `AbortController`. Presupuesto real: **p95 <2 ms** por búsqueda |
| **Cambiar color y nombre en `/studio/branding` transforma la App** | Canal de matiz OKLCH (`--brand-h`) + `deriveRamp` con pasada de corrección de contraste; script inline lo aplica **antes del primer paint** desde el `BootDigest`; en vivo por `BroadcastChannel`. Verificado contra 9 colores de referencia. El anillo de foco **nunca** se deriva de la marca |
| **Cambiar el XP en `/studio/gamification` se refleja de inmediato** | El contenido guarda `xpWeight`, no XP. Un único `economySchema` con rangos; el XP total se deriva de un **ledger con basis de 22 enteros**, nunca persistido; `useEconomyValue(selector)` para suscripción estrecha; `highWaterLevel` para no degradar a nadie visualmente, y `useFrozenEconomy()` para que la lección en curso no cambie de reglas a media pantalla |
| **Exportar, borrar, reimportar → estado idéntico** | `canonicalize()` con lista de exclusión **explícita** (`updatedAt`, `createdAt`, `by`, `rev`, `base`, `draftNotes`, `_ui`) e inclusión explícita de todo lo demás, ids locales del `data` verbatim. El test asevera `hashBefore === hashAfter` **y** deep-equal estructural. Los derivados (`estimateSeconds`, `searchText`) no se persisten: se recalculan. El diálogo de import **muestra los dos checksums en pantalla**: el criterio se demuestra, no se afirma |
| **`typecheck && lint && build` limpios, cero `any`** | ESLint prohíbe `TSAsExpression` salvo `as const`; el import de `motion/react` fuera de `src/design/**`; `Date.now`/`new Date`/`Math.random`/`performance.now`/`crypto.randomUUID`/`toLocaleDateString`/`localStorage` fuera de sus módulos dueños. `pnpm verify` = typecheck → lint → test → build → budgets |
| **Con movimiento reducido todo funciona** | Intercambio de catálogo con degradado **obligado por el tipo**; cinco canales semánticos; fachada `fx.ts` que degrada confetti y shake; aserción 13 del arnés espía `animate()` y falla si alguna duración pasa de 140 ms con `matchMedia` mockeado |
| **Sin estados vacíos feos, sin Lorem, sin rutas muertas** | Estándar de estado vacío con tres elementos obligatorios (Cuati en un estado concreto + una frase con voz de marca + **una** acción); `/kitchen-sink` enlaza a cada ruta declarada y un test cruza el enlazado contra el árbol de `src/app` |

---

## 6. Fases

Se conservan las once fases y sus mensajes de commit **salvo donde el reajuste de alcance los volvería
mentira**. El reajuste tiene una sola causa de fondo:

> **El kernel de física se entrega en la Fase 1, no en la 6.** El default universal es tokens y colores al
> principio y animación al final, como capa de pulido. Aquí la animación es **requisito funcional**: la
> micro-interacción 6 (`layoutId` nodo→lección) define la estructura del DOM y del árbol de rutas, y la 10
> define cómo se compone la barra de progreso. Construir el player (F4) y el camino (F5) sin el sistema de
> movimiento significa escribir `transition` inline que la F6 arranca. Lo mismo con el audio, que el feedback
> de F4 necesita, y con el rig de la mascota, que usan el onboarding y el modal de salida.

| # | Fase | Alcance | Criterio de aceptación verificable | Commit |
|---|---|---|---|---|
| **0** | Plan | `PLAN.md`, `DECISIONS.md` | Plan aprobado por ti | — |
| **1** | Cimientos **+ kernel de física** | Next + TS strict + Tailwind v4; `tokens.css` completo con los tres bloques de tema; `next/font`; **`motion.ts` + `fx.ts` + `sound.ts` + `synth.ts`**; `Button3D` (3×5) y anillo compuesto; **rig de Cuati con 5 estados + `MascotChip` + `MascotSolid`**; `clock.ts`; `persist.ts`; `eslint.config.mjs`; `/kitchen-sink` | `pnpm verify` verde. `contrast.test.ts` verde con los ~40 pares en ambos temas **y los 9 colores de white-label**. `ls -la .next/static/media/*.woff2` muestra **2 archivos ≤61 KB**. `check-solid-shadows.mjs` sin hallazgos. En `/kitchen-sink`: los 15 botones en claro/oscuro, el anillo de foco visible sobre papel **y** sobre una barra lima, y los 8 SFX suenan tras el primer clic | `chore: scaffold app with design tokens, theming and motion kernel` ⚠️ |
| **2** | Motor + mock | Los 14 contratos; registro con prueba de completitud; `grade`; `session-machine` headless; `validate` + `serialize` + `diff`; `economy.ts`; seed determinista de 1,247; repos con tiers de latencia | `pnpm test` verde en calificación, validación y normalización es-MX. Dos arranques en dos máquinas producen el **mismo `ContentHash`** del catálogo. `boot()` mide **<50 ms** (umbral duro que escribe warning visible). `sum(cohortCounts) === 1247` aseverado. Un `RawStep` corrupto produce `"Unidad 3 › Lección 12 › Paso 4: …"` | `feat(engine): add content schema, dynamic registry and mock data layer` |
| **3** | Dinámicas 1–7 + arnés | Siete `meta.ts` + `ui.ts`; `describeDynamic` con 16 aserciones | Las 7 se juegan con teclado y ratón en `/kitchen-sink`. **112 casos de conformidad verdes**, incluida la aserción de render doble con el mismo `rng` (atrapa `Math.random`) y la de axe + objetivos de 44px | `feat(dynamics): add first seven exercise types` |
| **4** | Player de lección | `LessonRuntime`; `LessonShell`; corazones con doble reloj; combo; re-encolado; resumen; dos regiones `aria-live`; teclado completo; `StepDefectCard`; `StepReport` | Una lección de 10 pasos de punta a punta **solo con teclado**. `resolveHearts` con un test por rama (5). Perder la última vida anuncia en `assertive` y abre el modal de tres salidas. Cambiar el reloj del Mac **no** regala corazones | `feat(app): add lesson player with hearts and combo` |
| **5** | Camino + gamificación | Mapa de rutas y `BootDigest`; onboarding de 5 pasos con test de nivel real; El Camino; `AppHud`; los 13 sistemas sobre el ledger; tienda; misiones; 32 insignias | LCP de `/aprende` **<2.0 s** con el `<h1>` del banner pintado desde HTML estático. `render-isolation.test.tsx`: 10 `loseHeart()` → `HeartBar` 11 renders, `PathScreen` **1**, `PathSection` **1**. Las 32 insignias con condición evaluable. Mover el XP en `/studio/gamification` cambia el HUD sin recargar | `feat(app): add learning path and gamification systems` |
| **6** | Mascota completa + cinemáticas | Los 9 estados + guardarropa; `CinematicQueue` con prioridad; las 4 cinemáticas; auditoría de las 27 | `motion.spec.ts` cruza `MICRO_INTERACTIONS` (27) contra `data-mi` en el árbol y **falla si falta una**. Las 4 cinemáticas encoladas sin solapamiento. Con `prefers-reduced-motion` el recorrido completo funciona y el flash del cofre **no se monta** | `feat(app): add mascot choreography and cinematics` ⚠️ |
| **7** | Dinámicas 8–14 + ligas + práctica | Las 7 restantes con sus decisiones difíciles; ligas (42 salas, 5 divisiones, 28 bots por CDF); práctica con los 4 modos y la cola SRS | Las **14** jugables y editables. La sala de liga a 60fps con reordenamiento (2–4 filas por tick, no 30). Sin voz es-MX instalada, la dinámica 10 entra en **modo lectura** y sigue calificando | `feat(dynamics): complete catalog, add leagues and smart practice` |
| **8** | Studio a escala | Dashboard con Recharts sobre tokens; tabla de 1,247; cohortes mutables; árbol de cursos con dnd anidado; reportes con export CSV real | En `/kitchen-sink/perf`: «Scroll tabla 1,247 (6s)» reporta **p95 de frame <16 ms** y 0 LoAF >50 ms. Acción en lote sobre 380 filas sin frame >8 ms, cancelable, con reporte parcial honesto | `feat(studio): add admin dashboard and user management at scale` |
| **9** | Editor + publicación | Editor de 3 columnas con preview jugable; `SchemaForm`; undo/redo por intención; versionado + diff + rollback; import/export; economía y marca editables; bitácora | **El ensayo de 9:10 completo**, cronometrado, sin tocar código. Export → borrar → import muestra los dos checksums iguales en pantalla. Rollback en un clic. Insertar un paso al inicio de una lección de 20 reporta **1** movimiento, no 19 | `feat(studio): add lesson editor with live preview and publishing` |
| **10** | Pulido | A11y auditada; los 7 presupuestos; estados vacíos y de error; los 6 documentos; `DEMO_SCRIPT.md` | `check-budgets.mjs` sale con 0. `PHASE_REPORT.md` generado con medido/presupuesto/delta por presupuesto. Test de rutas muertas verde. Los 10 estados vacíos escritos con su texto real | `polish: accessibility, performance budgets and documentation` |

⚠️ = mensaje de commit modificado respecto a la especificación, porque el original mentiría sobre lo que la
fase entrega. Ver `DECISIONS.md` D21.

**Al cerrar cada fase:** `pnpm verify` limpio, commit convencional en inglés, `PHASE_REPORT.md` **generado**
por `scripts/gen-phase-report.mjs` (si el reporte existe, la medición ocurrió), y me detengo a esperarte.

---

## 7. Autorrevisión: los defaults que detecté en mi propio plan

La instrucción era: *cualquier decisión que hubieras tomado igual para cualquier app educativa es un default,
no una decisión.* Estos son los que encontré en mi primer borrador y lo que puse en su lugar.

| Era un default | Ahora es | Por qué el default estaba mal |
|---|---|---|
| `correctIndex: number`, como pide la especificación | `correctOptionId: OptionId` en las 14 dinámicas | Arrastrar una opción en el editor cambia la respuesta correcta. El cliente **va** a arrastrar una opción en la demo |
| `Map<string, DynamicDefinition<any, any>>` con un cast en el punto de uso | `ErasedDynamic.bind()` que parsea una vez y devuelve clausuras | Compila y miente: con `any`, cambiar el schema de un plugin no rompe nada en compilación y explota en la demo |
| Semilla determinista con `seedrandom` y ya | Dos relojes (semilla de contenido fija + ancla de tiempo persistida y deslizante por días completos) | Un timestamp fijo envejece la demo ("último acceso hace 47 días"); `Date.now()` puro la vuelve irreproducible. Hacían falta las dos propiedades a la vez |
| Materializar la actividad histórica como filas | `isActive(ordinal, day)` como **función pura**; el bitset dual de 39 KB es el único índice | 1,247 × 120 = 149,640 filas. Y lo más importante: como el dato es la expresión y no el registro, el agregado del dashboard y el detalle del alumno **no pueden divergir** — son la misma línea de código |
| `await sleep(80 + Math.random()*180)` en los repos | `latencyFor(sig)` determinista por firma de llamada, con `speedMultiplier` | Cuesta lo mismo y da reproducibilidad de vídeo, permite testear estados de carga sin fake timers, y convierte "simular errores" en un escenario ensayable en vez de una ruleta |
| Lanzar excepciones y confiar en un error boundary | `Result<T, RepoError>` en todo repo | Con `Result` el compilador **obliga** a pintar el camino de error. Un error sin diseñar se vuelve imposible de compilar, que es lo que cumple "ningún estado vacío feo" |
| `const reduce = useReducedMotion()` + ternario por animación | Intercambio de catálogo con degradado **obligado por el tipo** | 27 micro-interacciones × N componentes = N puntos de fallo y ninguna forma de auditarlo en un PR |
| `border-bottom: 4px` → `0` en `:active`, como pide la especificación | Losa de sombra separada + `translate3d` de la cara | Reflowea el contenido del botón en la interacción más frecuente del producto. ~200 taps por sesión |
| `freq * 2^(combo/12)` para el sonido de combo | Pentatónica mayor de Re, ligada armónicamente al cue de acierto | La cromática suena a máquina y **disona contra el sonido de correcto que ya está sonando** |
| `--focus-ring: 3px solid var(--lime-500)`, como pide la especificación | Anillo compuesto, con el teorema de cobertura de §2.2 | 1.35:1 sobre papel. Se ve sobre nodos violetas y desaparece sobre papel, que es donde vive el 80% del foco de teclado del Studio |
| Copiar los hex del brief a `:root` y usarlos donde caigan | Rampas con **rol declarado por escalón** y el `-500` explícitamente sin contrato | Cinco de siete colores de la paleta no son colores de texto. El fallo tenía que ser la premisa del sistema, no una nota al pie |
| Sombra sólida en el tono `-700`, como pide la especificación | Tono `-800`, con la regla dura [1.9, 2.7] | `brand-600` sobre `brand-700` separa 1.38:1. La distancia entre 600 y 700 depende del hue: en violeta son 5 puntos de luminancia, en ámbar 35 |
| Dark mode = invertir tinta y papel | Los seis cambios de §2.5 | `--paper` sobre `--canvas` oscuros dan 1.08:1: la elevación por escalón de superficie es matemáticamente invisible |
| `npm i chroma-js` y `.darken()` para el white-label | 90 líneas de OKLCH a mano con búsqueda binaria sobre L | `darken()` usa un paso fijo y no garantiza contraste. Aquí la función objetivo **es** el contraste |
| Turborepo, por reflejo, para que el motor sea "reutilizable" | Repo standalone con la frontera impuesta por `no-restricted-paths` | Se compra el aislamiento verificable sin el coste de tooling, y la afirmación se comprueba con `pnpm lint` |
| Curso de idiomas o inducción genérica de RH como contenido semilla | Tres cursos por función sobre **riesgo operativo** (UPL, FDCPA, plazos, privilegio) | La inducción genérica no justifica corazones, ligas ni escenarios ramificados. Aquí cada mecánica mapea a un riesgo real, y el eje no es "aprender leyes" |
| `faker` o "Usuario 001" para los 1,247 nombres | Frecuencias reales de apellidos, 32% de nombres compuestos en mujeres, **8% con un solo apellido** (oficinas de EE.UU.) | Ninguno de los dos ejercita la normalización, y el cliente **va** a buscar su propio apellido en la demo |
| Aciertos/total para la selección múltiple | `clamp01(TP/P − FP/N)` | `TP/P` premia marcar todo con 1.00. En un curso de cumplimiento, premiar el ruido es enseñar a adivinar |
| Contar posiciones correctas al ordenar | LIS normalizado, reutilizando el mismo `lis()` del diff de versiones | Contar posiciones marca 4 errores por mover un elemento y deja la analítica por skill en cero |
| Cada respuesta incorrecta descuenta un corazón, por uniformidad | `consumesHearts` declarado por dinámica (false en flashcards, habla y contrarreloj) | Descontar en flashcards envenena el SRS: el usuario deja de admitir que no sabía |
| "Vuelve a intentarlo" hasta acertar | Un fallo cuesta un corazón, muestra la respuesta, y el paso **se re-encola al final** por el 50% del XP | "Reintenta" destruye la métrica; "fallaste, sigue" no enseña. El re-encolado cuesta ~30 líneas en el reducer y compra las dos cosas |
| Medianoche local del dispositivo para la racha | **04:00 en la zona IANA de la oficina** del usuario | El cliente tiene oficinas en dos países con reglas de DST divergentes, y la racha es el sistema del que cuelga la retención |
| Curva de XP exponencial ×1.3, como en la referencia | Potencia con techo lineal (base 60, exp 1.35, cap 420, nivel máx 30) | La exponencial pide 414,000 XP para el nivel 30: cuarenta veces todo el contenido del despacho. El usuario semilla quedaría clavado en nivel 9 y el medidor no se movería nunca |
| `bot.xp += rand(0,15)` en un `setInterval` | `botXpAt()` como **CDF cerrada** con 5 arquetipos | Como función pura del tiempo no se persiste nada, la recarga es invisible, y el arquetipo `dormant` (λ=0) existe a propósito para que la tabla tenga forma en vez de subir todos en bloque |
| `hsl(hash % 360, 70%, 60%)` para los 1,247 avatares | Catálogo curado con matriz de compatibilidad, y el grosor del anillo derivado del **nivel** | El HSL produce lima sobre lima y se lee como ruido. Anclar el anillo al nivel convierte un adorno en información |
| Un modal por sistema de gamificación, cada uno con su booleano | Una sola `CinematicQueue` con prioridad fija y tope de 3 en cadena | Subir de nivel, abrir un cofre y desbloquear dos insignias ocurren **a la vez** al terminar una lección |
| Event sourcing para el overlay de contenido, como cualquier CMS | Documentos sombra por entidad + membresía como arreglo completo | Un CMS normal asume una base inmutable en servidor. Aquí la base **se regenera**: una op `{move, 4 → 2}` referencia posiciones que dejan de existir |
| Un `<Drawer open={selected != null}>` para el detalle de usuario | Ruta interceptada `users/@drawer/(.)[userId]` | Menos código, y funciona hasta que alguien aprieta atrás delante del cliente |

Y dos cosas que **conservé a propósito** aunque parezcan defaults, porque en este producto no lo son: los
cuatro springs con los números exactos de la especificación (son buenos y son un contrato de identidad), y
`localStorage` en vez de IndexedDB (el presupuesto cabe con el esquema de regeneración de §Ronda-1, y
IndexedDB añade asincronía a la ruta de arranque que paga el LCP).

---

## 8. Riesgos vivos

Los ocho que pueden costar tiempo real o romper la demo:

1. **La interceptación de ruta.** `(.)leccion/[lessonId]` en el slot `@player` del grupo `(app)` mientras la
   ruta real vive en `(player)` es un caso poco transitado que ha cambiado de comportamiento entre minors.
   *Prueba de humo obligatoria el primer día de la F5* (soft-nav, recarga, atrás/adelante, enlace pegado en
   otra pestaña). **Plan B empaquetado:** mover la ruta real a `(app)/leccion/[lessonId]` y apagar header y nav
   con un atributo `data-fullscreen` en CSS, no con un condicional de React (para no re-montar el árbol).
2. **El presupuesto de `localStorage`.** Ledger + snapshot + overlay + blobs + bitácora pueden acercarse al
   techo. Medición en **UTF-16** (`s.length * 2`, no `Blob().size`), compactación al 80% de cada `BudgetKey`,
   orden de desalojo declarado, y sub-presupuesto **anclado** de 64 KB para las entradas de publicación de la
   bitácora, que nunca se desalojan.
3. **Dos pestañas editando la misma lección.** El autoguardado de la última pisa el trabajo de la otra en
   silencio. *Lease por `lessonId` en `BroadcastChannel` + banner "Editando en otra pestaña · solo lectura".*
4. **La laptop de la demo.** Safari de escritorio (el `rotateY` de SVG), sin voz es-MX instalada (modo
   lectura), sin micrófono (estado `StepUnavailable` que sigue contando para progreso), proyector a 1024px.
   *Los cuatro tienen camino diseñado; los cuatro se verifican en `/ajustes`, que muestra el estado efectivo
   del bus de voz, del audio y del movimiento antes de empezar.*
5. **`sessionStorage` se copia al duplicar pestaña en Chrome**, así que duplicar la pestaña impersonada
   arrastra la impersonación a la copia — que es exactamente el escenario de demo lado a lado. *`tabId` en
   memoria: si no coincide, el registro se descarta. 12 líneas.*
6. **El script inline crece.** Gate + tema + marca + impersonación + `scrollRestoration` ya son 0.71 KB, y
   cada resolución futura tenderá a añadirle una línea. *Presupuesto declarado de 1.0 KB minificado, verificado
   en CI sobre el string exportado. Nada que no afecte al primer paint entra ahí.*
7. **Exactitud jurídica del contenido.** El comprador son abogados migratorios: un enunciado incorrecto sobre
   I-130 o TPS mata la venta en la sala. *El corpus se escribe sobre dominios internos verificables —ética
   profesional, manejo de expedientes, seguridad de la información del cliente, recepción, cobranza y planes
   de pago, uso del sistema interno— y lo estrictamente jurídico se limita a ~20 átomos de procedimiento, con
   etiqueta visible "contenido de ejemplo" en el pie del player.*
8. **La deuda de verificación de §0.** Siete de las quince áreas del plan no pasaron por crítica adversarial.
   *Primera tarea de la F1, antes de escribir código de producto.*

---

## 9. Lo que este plan todavía no cubre

Honestidad sobre los bordes, para que no aparezcan como sorpresas en la fase 6:

- **El inventario de componentes de §3 está nombrado pero no tipado.** Las props de los 27 componentes de
  `components/game/` se congelan al inicio de la F5, no ahora.
- **La analítica del Studio tiene las funciones pero no las gráficas.** Ejes, formatos es-MX y comportamiento
  en oscuro de Recharts se resuelven en la F8.
- **La biblioteca de medios** tiene el tipo (`MediaRef` con parámetros de generador) y cinco generadores de
  escena para el hotspot, pero la pantalla `/studio/media` y la comprobación de `orphan-media` son F9.
- **`en.ts` va como *seam* tipado con ~40 claves traducidas y el toggle marcado "vista previa"**, no como
  traducción completa. Mantener 620 claves en inglés tiene coste real y el comprador es es-MX.
- **Las dos experiencias negativas del producto** —racha perdida y descenso de liga— están diseñadas
  completas, pero si entran o no en el guion de demo es decisión tuya, no mía.

---

## 10. Qué necesito de ti para arrancar

1. **Aprobar el plan** (o marcar qué cambiar).
2. **Elegir Next 15.5.x o 16.2.x** (§1). Mi recomendación es 15.5.x.
3. Opcionalmente, revisar las **seis preguntas abiertas** de `DECISIONS.md` §4. Todas tienen ya un valor por
   defecto elegido y justificado, así que ninguna bloquea: si no dices nada, arranco con esos valores.

**No escribo una línea de código hasta que apruebes.**
