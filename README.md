# clasesmaqueta — SENDA

Maqueta funcional de una plataforma de capacitación interna gamificada, construida para un despacho de
abogados de inmigración. **Un repo, dos productos**: la App que abre el alumno y el Studio con el que se
administra.

Todo funciona sin backend: no hay red, ni base de datos, ni autenticación. El mundo —1,247 personas, 120
días de historia, 190 lecciones— se deriva de forma determinista, así que la demo es idéntica en cualquier
máquina y en cualquier recarga.

---

## Por dónde empezar la demo

| Ruta | Qué enseña |
| --- | --- |
| `/` | Portada con las tres puertas de entrada |
| `/bienvenida` | Onboarding de 5 pasos con **test de nivel real**, calificado por el mismo motor que las lecciones |
| `/aprende` | El Camino: 190 lecciones, 26 unidades, con la historia sembrada de Efraín |
| `/leccion/[id]` | El reproductor. **Jugable solo con teclado**: `1`–`9`, `Enter`, `?`, `Esc` |
| `/studio/gamification` | Cambia el **XP base** y mira `/aprende` en otra pestaña: el HUD se mueve **sin recargar** |
| `/studio/users` | Las 1,247 personas, virtualizadas, con búsqueda que pliega acentos |
| `/studio/dashboard` | Analítica derivada del **mismo índice** que el heatmap del alumno |
| `/kitchen-sink` | Las siete dinámicas jugables y los nueve estados de la mascota |

El usuario de la demo es **Efraín Hernández Castillo**, recepcionista en CDMX: 9,791 XP, nivel 30, racha de
21 días, 119 de 190 lecciones, 17 de 32 insignias. El ordinal está elegido recorriendo los 1,247 y filtrando
por racha viva, historia con huecos creíbles y catálogo sin terminar.

---

## Correr en local

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm verify     # typecheck + lint + 470 tests + css-vars + build + presupuestos
```

---

## Las decisiones que sostienen la maqueta

**Las dinámicas son plugins.** Añadir un tipo de ejercicio es un archivo y una línea de registro: editor,
preview, reproductor, calificación y analítica vienen gratis. Hay siete implementadas de catorce.

**El XP no se guarda; se deriva.** El contenido almacena *pesos*, no XP. Por eso mover un número en el
Studio reescribe la historia entera al instante. La frontera está declarada: se **deriva** lo monótono y sin
cargos (XP, nivel) y se **congela** lo que participa en un saldo (gemas), porque re-tarifar los dos lados de
un saldo produce números negativos por compras ya hechas.

**Tres relojes, no uno.** Uno anclado y deslizante para la racha y el heatmap, uno de pared para los
corazones y los potenciadores, y uno monótono para lo que no puede depender del reloj del sistema. Cambiar
la hora del Mac no regala corazones, y hay una prueba aritmética que lo demuestra sin *fake timers*.

**El color nunca es la única señal.** Cada estado lleva forma, icono o texto además del matiz. Los pares de
contraste se derivan resolviendo la luminosidad contra un objetivo WCAG declarado, no eligiéndolos a ojo.

**Los presupuestos son ejecutables.** `pnpm verify` falla si una ruta pasa su techo de bundle, si una
variable CSS no existe, o si el candidato a LCP deja de estar en el HTML estático.

---

## Estado

Construido y probado: cimientos y sistema de diseño, el motor de contenido, siete dinámicas, el reproductor
de lección, el Camino y los trece sistemas de gamificación, la mascota con sus nueve estados, y el Studio
con panel, personas y economía en vivo.

Pendiente: las dinámicas 8–14, la cola de cinemáticas, y del Studio el editor de lecciones, la biblioteca de
medios y el white-label. La capa de datos de todo eso existe y está probada; faltan las pantallas.

`DECISIONS.md` documenta cada decisión y cada error encontrado durante la construcción, con el escenario que
lo dispara. `PLAN.md` tiene el plan completo de las diez fases.
