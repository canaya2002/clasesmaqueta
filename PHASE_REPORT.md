# PHASE_REPORT — Fase 1

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
Test Files  3 passed (3)
      Tests  122 passed (122)
   Start at  09:51:02
   Duration  614ms (environment 87%, transform 8%, tests 4%, import 1%, setup 1%, worker 1%)
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
