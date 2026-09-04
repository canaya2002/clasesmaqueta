# SENDA

Plataforma de aprendizaje gamificada. Un repo, dos productos:
**SENDA App** (alumno, mobile-first) y **SENDA Studio** (administrador: CMS + analítica + 1,247 usuarios).

Maqueta front-only: **cero red, cero backend, cero auth, cero base de datos.** Todo se resuelve contra la
capa mock (`src/mock/`), que expone repositorios asíncronos con latencia artificial determinista.

## Arranque en 3 comandos

```bash
pnpm install
pnpm dev
open http://localhost:3000/kitchen-sink
```

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm verify` | `typecheck` → `lint` → `test` → `shadows` → `build` → `budgets`. **La puerta de cada fase.** |
| `pnpm typecheck` | `tsc --noEmit` con `strict`, `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` |
| `pnpm test` | Vitest: calificación, validación, contraste y conformidad de dinámicas |
| `pnpm tokens` | Regenera `src/design/tokens.generated.css` desde el algoritmo OKLCH |
| `pnpm shadows` | Falla si aparece un `box-shadow` con blur fuera de los overlays autorizados |
| `pnpm budgets` | Compara el build contra `perf/budgets.json` y sale con código 1 si algo excede |
| `pnpm phase-report` | Genera `PHASE_REPORT.md` con medido/presupuesto/delta |

## Documentos

- `PLAN.md` — el plan completo: design plan, árbol, los 14 contratos del motor, fases.
- `DECISIONS.md` — resoluciones vinculantes, desviaciones de la especificación y preguntas abiertas.
- `ARCHITECTURE.md`, `ADDING_A_DYNAMIC.md`, `CONTENT_SCHEMA.md`, `DEMO_SCRIPT.md` — a partir de la Fase 2.
