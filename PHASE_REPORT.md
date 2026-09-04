# Fase 5 — El Camino y los trece sistemas de gamificación

`feat(app): add learning path and gamification systems`

## Criterios de aceptación

| Criterio | Estado | Cómo se comprueba |
| --- | --- | --- |
| LCP de `/aprende` < 2.0 s con el `<h1>` pintado desde HTML estático | ⚠️ **reformulado** | No es medible aquí: sin navegador en `devDependencies` y jsdom no pinta. Se comprueba lo que decide el número — el candidato a LCP está en el HTML estático (posición 3558) y **antes** del primer esqueleto (3804), afirmado en `check-budgets` |
| `render-isolation.test.tsx`: perder corazones no repinta el camino | ✅ **reformulado** | El enunciado literal ("10 → 11 renders") es imposible con `maxHearts` 5. Reescrito contra la economía, más la aserción que el literal escondía: gastar sin corazones **no repinta** |
| Las 32 insignias con condición evaluable | ✅ | Las 32 se evalúan contra un estado vacío sin lanzar; ningún umbral mira un contador que pueda bajar |
| Mover el XP en el Studio cambia el HUD sin recargar | ✅ | `fold.test.ts`: duplicar `xpBase` duplica exactamente el total histórico |

Dos criterios se reformularon, no se cumplieron a medias. Los dos enunciados originales eran defectuosos:
uno pedía medir lo que este repo no puede medir, el otro pedía un número aritméticamente imposible.

## Verificación

```
typecheck ✅   lint ✅ (0)   test ✅ 456   css-vars ✅ 231   shadows ✅   build ✅   budgets ✅
```

| Ruta | First Load | Techo |
| --- | ---: | ---: |
| `/` | 104.0 KB | 132 |
| `/logros` | 134.3 KB | 160 |
| `/tienda` | 138.3 KB | 160 |
| `/ligas` | 176.7 KB | 200 |
| `/misiones` | 181.2 KB | 200 |
| `/perfil` | 230.3 KB | 250 |
| `/practica` | 233.7 KB | 250 |
| `/aprende` | 234.6 KB | 250 |
| `/bienvenida` | 244.1 KB | 275 |
| `/leccion/[id]` | 246.9 KB | 275 |

Arranque: **42.3 ms en frío** (promesa: 50), **9.4 ms en caliente** mejor de tres (techo de regresión: 15).

## El usuario con el que abre la demo

> **Efraín Hernández Castillo** · Recepcionista · CDMX
> 9,791 XP · nivel 30 · 265 gemas · 119 lecciones · 16 de 26 unidades
> racha de 21 días · 57 días activos de 120 · 17 de 32 insignias

El ordinal está elegido recorriendo los 1,247: racha viva, historia con huecos creíbles, catálogo sin
terminar, y el puesto al que apunta el primer curso. Su ledger se deriva del **mismo bitset** que alimenta
la analítica del Studio, así que agregado y detalle no pueden discrepar.

## Lo que se construyó

- **`game/`** — puro, sin acceso al reloj, a la capa mock ni al catálogo (prohibido por lint): `types`,
  `fold`, `day`, `path`, `badges`, `quests`, `shop`, `leagues`, `placement`, `onboarding`, `schema`.
- **`mock/ledger.ts`** — el basis cacheado con identidad estable y un temporizador al cruce de día.
- **`mock/ledger-seed.ts`** — la historia inicial derivada de la actividad sembrada.
- **Diez pantallas**: camino, misiones, tienda, ligas, logros, perfil, práctica, onboarding de cinco pasos,
  más las dos que ya existían.

## Los cinco bugs en código ya commiteado

La crítica adversarial se lanzó sobre el diseño y encontró el daño en lo anterior. Detalle en
`DECISIONS.md` §11.

1. `initClock` no se llamaba nunca: **el anti-trampa de corazones de la Fase 4 estaba desactivado**.
2. El deslizamiento del ancla atravesaba el cambio de horario y perdía la columna de hoy.
3. La historia de los 1,247 usuarios **se re-tiraba entera cada medianoche** (6% de bits).
4. El hundimiento de fin de semana no caía en fin de semana; el test que lo cubría tenía el mismo error.
5. Cinco tokens CSS fantasma que fallaban en silencio heredando el color del padre.

Los cinco tienen ahora un invariante que los vuelve a cazar, incluido `check-css-vars` dentro de `verify`.

## Deuda declarada

Elección de líder entre pestañas para los corazones; `countsForProgress` congelado en el intento (ya en el
evento del ledger, falta atarlo al reproductor); la ruta interceptada `@player/(.)leccion`; y el techo del
reproductor, que la dinámica 12 reventará.
