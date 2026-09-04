# Fase 4 — Reproductor de lección

`feat(app): add lesson player with hearts and combo`

## Criterios de aceptación

| Criterio | Estado | Cómo se comprueba |
| --- | --- | --- |
| Una lección de 10 pasos de punta a punta **solo con teclado** | ✅ | `lesson-keyboard.test.tsx`: el test solo emite `KeyboardEvent`. En cada uno de los 10 pasos asegura que `activeElement` no es `body` y que es el `<h1>` del paso — nunca "Continuar" |
| `resolveHearts` con un test por rama | ✅ | 7 ramas, 7 pruebas (la especificación pedía 5; el rediseño separó `hud` de `consumes` y añadió el modo práctica) |
| Perder la última vida anuncia en `assertive` y abre el modal de tres salidas | ✅ | Test dedicado: lee `role="alert"` y comprueba las tres salidas por su texto |
| Cambiar el reloj del Mac **no** regala corazones | ✅ | Aritmética pura, sin fake timers: adelantar la pared 24 h con 1 h monótona da 2 corazones, no 5 |

## Verificación

```
typecheck  ✅        lint  ✅ (0)        test  ✅ 368         shadows  ✅
build      ✅        budgets ✅
```

| Ruta | First Load JS | Techo |
| --- | --- | --- |
| `/` | 103.9 KB | 132 KB |
| `/kitchen-sink` | 192.3 KB | 200 KB |
| `/leccion/[lessonId]` | **226.8 KB** | 250 KB |

## Lo que se construyó

- **`content/engine/hearts.ts`** — el núcleo de corazones, PURO, sin un solo `import` de reloj. La muestra
  entra como argumento, que es lo que permite probar el criterio de "cambiar el reloj" con dos objetos
  literales en vez de con fake timers. `reduceHearts` acumula siempre antes de consumir.
- **`content/engine/runtime.ts`** — el puerto `LessonRuntime` y `resolveHearts` con seis reglas ordenadas
  que devuelven además la RAZÓN, para que el Studio pueda decir por qué están apagados.
- **`mock/hearts.ts` + `mock/hearts-ticker.ts`** — el adaptador con estado y el ticker a 1 Hz alineado al
  borde de segundo, fuera de React, escribiendo por `textContent`.
- **`components/game/LessonShell.tsx`** — la máquina, el ejecutor de comandos de una vez, un solo listener
  de teclado, el sentinel de historia, las dos regiones vivas y los tres modales.
- **`Modal`** sobre `<dialog>` nativo, **`FeedbackPanel`** con altura reservada e `inert`, **`PlayerSlot`**
  compartido con `StepHost`, **`LessonSummary`**, **`HeartBar`**, y la ruta `(player)/leccion/[lessonId]`.
- **`lib/a11y/focus.ts`** (foco por directiva más red de seguridad), **`lib/a11y/hotkeys.ts`**,
  **`lib/viewport.ts`** (`--app-h` y `--kb-inset` para el teclado virtual).

## Fallos reales encontrados y corregidos

Ocho de ellos estaban en código ya escrito y en verde. Los detalles están en `DECISIONS.md` §9.

1. Los corazones leían el reloj dos veces por transición; el empate recarga-vs-fallo era no determinista.
2. Llenarse acumulando no re-anclaba el sello: el siguiente corazón perdido volvía en segundos.
3. `data-hotkey` solo se emitía tras detectar teclado — **la primera tecla de cada lección no hacía nada**.
4. `click()` sobre el `<span>` envolvente no alcanzaba al botón: los atajos numéricos estaban rotos.
5. Cuatro variantes combinaban un muelle con tres fotogramas; `motion` lanza y el elemento no se mueve.
6. La región `aria-live` del veredicto vivía dentro de un subárbol que se vuelve `inert`.
7. El overlay estaba duplicado entre el reducer y el componente.
8. El presupuesto de la ruta nueva medía 0 KB y salía verde.

Los puntos 5 y 8 tienen ahora un invariante que los vuelve a cazar: una prueba que recorre el catálogo
buscando muelles con tres fotogramas, y un `check-budgets` en el que **medir cero es un fallo duro**.

## Deuda declarada

El presupuesto del reproductor (226.8 de 250 KB) lo revienta la dinámica 12: el techo está puesto para que
obligue a decidir, no para absorberlo. Pendientes también la elección de líder entre pestañas para los
corazones, congelar `countsForProgress` dentro del intento, y la ruta interceptada, que necesita el mapa de
la Fase 5.
