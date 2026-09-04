# PHASE_REPORT — Fase 2

Generado por `pnpm phase-report` el 2026-09-04. Los números salen de la medición, no de una estimación.

## Puertas

| Puerta | Resultado |
|---|---|
| `pnpm typecheck` | limpio |
| `pnpm lint` | limpio |
| `pnpm test` | verde |
| `pnpm shadows` | sin hallazgos |
| `pnpm budgets` | dentro de rango |

## Pruebas

```
Test Files  8 passed (8)
      Tests  223 passed (223)
   Start at  11:15:13
   Duration  896ms (environment 76%, transform 13%, tests 6%, import 5%)
```

## Presupuestos medidos

```
métrica                                medido presupuesto      delta   veredicto
------------------------------------------------------------------------------------
First Load JS /                       103.7 KB      132 KB   -28.3 KB   OK
First Load JS /kitchen-sink           154.0 KB      200 KB   -46.0 KB   OK
Fuentes precargadas (2 archivos)       67.2 KB       80 KB   -12.8 KB   OK
  (bajo demanda, no se piden: 6)      108.9 KB           —          —   informativo

Todos los presupuestos dentro de rango.
```

## Script inline de arranque

```
script inline: 0.50 KB / 1.00 KB  OK
```

## Sombras sólidas

```
check-solid-shadows: sin hallazgos.
```

## Arranque del mundo

```json
{ "totalMs": 44.98, "presupuesto": 50,
  "actividad": 5.27, "usuarios": 3.84, "busqueda": 4.05, "contenido": 31.83 }
```

El contenido consume 32 de los 45 ms y es la parte que crecerá con las 13 dinámicas restantes. Cuando se
acerque al presupuesto, la palanca es rebanar el arranque —materializar solo el curso activo, que son ~700
pasos en vez de 2,090—, no paralelizarlo: lo caro no cruza barato la frontera de un worker.

## El mundo, medido

| | |
|---|---|
| Usuarios | 1,247 · cohortes que suman exactamente eso, una de 300 |
| Ejercicios | 2,090 con 728 enunciados distintos (182 hechos x 4 plantillas) |
| Racha máxima vigente | 64 días · 108 personas con 7+ · 22 con 30+ |
| DAU / WAU / MAU | 304 / 738 / 1,164 |
| Índice de actividad | 37.8 KB para las dos orientaciones del bitset |
| Hechos jurídicos | 20 de 182, etiquetados como contenido de ejemplo |
