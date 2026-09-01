---
name: mercadotech-automatic-validator
description: Portero binario de MercadoTech — checklist fija (reglas del enforcer + errores críticos del reviewer + lint + type-check) con un único veredicto, VALIDACIÓN APROBADA o FALLIDA, sin matices. Usar al cerrar una tarea o fase, o cuando el usuario pide explícitamente "corré el validator", "¿está listo para commitear?", "dame el veredicto final", "valida el repo".
---

# mercadotech-automatic-validator

Portero binario: pasa o no pasa, sin "casi" ni "aprobado con
observaciones". Un solo ítem fallido hace fallar todo el veredicto.

**Reporta, no corrige nada.** Dice QUÉ falló y DÓNDE (con el error pegado
tal cual salió); la corrección es un paso aparte y humano-supervisado.

## Qué NO hace (deslinde con las otras 3 Skills)

- No decide ubicación de archivos nuevos — eso es
  `mercadotech-architecture-enforcer` (pero SÍ corre su checklist como
  parte de este gate).
- No da consejos de mejora, sugerencias, ni calificación /10 — eso es
  `mercadotech-code-reviewer` (pero SÍ cuenta sus hallazgos "críticos" como
  parte de este gate).
- No pondera trade-offs de diseño ni deuda técnica — eso es
  `mercadotech-tech-lead`. Este validator no tiene opinión, solo ejecuta la
  checklist fija de abajo.

## Checklist fija (correr TODOS los ítems, sin saltarse ninguno)

- [ ] `mercadotech-architecture-enforcer` sobre el código en cuestión — 0
      violaciones. Si hay alguna, FALLIDA (listar cada una con su regla).
- [ ] `mercadotech-code-reviewer` sobre el código en cuestión — 0 errores
      CRÍTICOS. (Los "importantes" y "sugerencias" NO hacen fallar el
      validator — son terreno del reviewer, no del gate binario.)
- [ ] `npm run lint` exit 0 — si no, FALLIDA (pegar la salida del comando).
- [ ] `npm run type-check` exit 0 — si no, FALLIDA (pegar el error).
- [ ] `npm run build` exit 0 — si no, FALLIDA (pegar el error). (Solo
      cuando el cambio toca la app web; si es un cambio exclusivo de
      `mcp/`, correr en su lugar `npm run type-check` DENTRO de `mcp/`.)
- [ ] `npm run test` exit 0 — OBLIGATORIO desde la Fase 6.8
      (`docs/DEBUGGING.md`). Si falla, FALLIDA (pegar el test que rompió,
      tal cual lo reporta Vitest).
- [ ] `npm run test:e2e -- --project=chromium` — SOLO si el stack local
      está arriba (`supabase status` en verde primero). Si el stack está
      abajo, este ítem se marca N/A y NO cuenta como fallo (no se levanta
      Supabase solo para el gate). Si el stack está arriba y la suite
      falla, FALLIDA (pegar el resumen de Playwright).
- [ ] Los 4 greps de verificación de capas de `CLAUDE.md` → los 4 vacíos:
  ```bash
  grep -rl "@/lib/supabase" components hooks
  grep -rl "from \"@/services" components
  grep -rln "@anthropic-ai\|api.voyageai.com" --include="*.ts" . | grep -v node_modules | grep -v lib/ai
  grep -rl "lib/supabase/admin" app components hooks services | grep -v api/v1
  ```
  (El último puede dar un match dentro de un comentario que dice
  explícitamente que ese archivo NO importa `admin.ts` — leer la línea
  antes de contarlo como fallo real, mismo criterio que usa el enforcer.)

## Formato de salida

```
## Validación — <alcance: archivo/fase/repo completo>

- [x] architecture-enforcer: 0 violaciones
- [ ] code-reviewer (críticos): 1 hallazgo — <archivo:línea>, <resumen>
- [x] npm run lint: exit 0
- [x] npm run type-check: exit 0
- [x] npm run build: exit 0
- [x] npm run test: exit 0
- [—] npm run test:e2e: N/A (Supabase local abajo)
- [x] greps de capas: los 4 vacíos

## VALIDACIÓN FALLIDA

Motivo: <el/los ítem(s) marcado(s) [ ] arriba, con el detalle pegado>
```

o, si todo pasa:

```
## VALIDACIÓN APROBADA
```

Sin texto adicional después del veredicto — es la última línea del
informe, no el inicio de una recomendación.

---

**Fuente de verdad: `CLAUDE.md`.** Ante cualquier contradicción entre esta
checklist y `CLAUDE.md`, `CLAUDE.md` gana — releerlo antes de marcar un
ítem como fallido por una regla que no está ahí.
