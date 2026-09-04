# PHASE_REPORT — Fase 3

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
Test Files  9 passed (9)
      Tests  348 passed (348)
   Start at  11:40:03
   Duration  1.11s (environment 75%, transform 14%, import 5%, tests 5%)
```

## Presupuestos medidos

```
métrica                                medido presupuesto      delta   veredicto
------------------------------------------------------------------------------------
First Load JS /                       103.8 KB      132 KB   -28.2 KB   OK
First Load JS /kitchen-sink           191.7 KB      200 KB    -8.3 KB   OK
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
