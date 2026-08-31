# Revisión de gobernanza — Fase 5.6

Ciclo de revisión real ejecutado con las 4 Skills de la Fase 5.1
(`mercadotech-tech-lead`, `mercadotech-code-reviewer`,
`mercadotech-automatic-validator`) sobre el estado del proyecto al cierre de
la Fase 5.5. Las Skills **reportan**; las correcciones de este documento las
aplicó un humano (Claude Code) por fuera de la invocación de cada Skill, una
por una, con verificación de `lint`+`type-check`+`build` después de cada
commit.

Alcance:

- `mercadotech-tech-lead` → `services/` y `hooks/` completos.
- `mercadotech-code-reviewer` → `lib/ai/`, los 3 Route Handlers de
  `app/api/v1/` (`chat/route.ts`, `reindex/route.ts`,
  `search/semantic/route.ts`) y todo `mcp/src/`.

Cada hallazgo se contrastó contra la lista blanca de deuda técnica aceptada
en `docs/BITACORA.md` (secciones "Deuda técnica y limitaciones conocidas"
de sesión 3 y sesión 4) — lo ya documentado ahí se justifica con su enlace,
nunca se re-corrige (decisión 10 de `MercadoTech_sesion5.md`, Fase 5.6).

## Informes completos

- Scorecard de `mercadotech-tech-lead` sobre `services/`+`hooks/`: nota
  global **Alto** en los 6 criterios — sin violaciones de capas, patrón de
  cliente inyectable respetado en los 15 services, hooks sin lógica de
  negocio propia. Detalle completo en la respuesta de esa invocación
  (no se duplica acá; ver el historial de la sesión).
- Informe de `mercadotech-code-reviewer` sobre `lib/ai/` + 3 Route Handlers
  + `mcp/src/`: **9/10**, 0 críticos, 2 importantes, 2 sugerencias.

## Consolidado

| # | Hallazgo | Severidad | Veredicto | Evidencia |
|---|---|---|---|---|
| 1 | `hooks/useSellerOrders.ts:71` usa voseo ("No podés mover...") — único caso en los 31 archivos de `services/`+`hooks/`, inconsistente con el resto de los toasts de la misma app (neutrales: "Agregado al carrito", "Producto publicado", etc.) | sugerencia | corregido (`226ae64`) | string reemplazado por frase neutral equivalente; lint/type-check/build ok |
| 2 | 8 de 16 hooks (`useAuth`, `useCategories`, `useFavorite`, `useFavorites`, `useProduct`, `useProducts`, `useQuestions`, `useReviews`) duplican inline `err instanceof Error ? err.message : "<mensaje fijo>"`, sin el caso de `PostgrestError` (objeto plano con `.message`, no instancia de `Error`) que `lib/utils.ts:getErrorMessage` ya cubre desde que los hooks más nuevos lo adoptaron — `useProducts` (plural) se sumó a la lista al verificar en la corrección que no quedara ningún `instanceof Error` residual en `hooks/`, no estaba en el conteo original del scorecard | importante | corregido (`8b2396d`) | `getErrorMessage` ganó un segundo parámetro `fallback` opcional (default idéntico al de siempre, cero cambio para los 8 call-sites que ya lo usaban sin él); cada uno de los 8 hooks pasa su propio mensaje fijo como fallback — nunca queda peor de lo que estaba; lint/type-check/build ok |
| 3 | `mcp/src/index.ts:30` — log de conexión desactualizado: sigue diciendo "0 tools, 0 resources, 0 prompts — Fase 5.2" pese a que las Fases 5.3–5.4 ya registraron 10 tools/7 resources/5 prompts | sugerencia | corregido (`9fe3292`) | mensaje actualizado a los conteos reales; lint/type-check/build ok |
| 4 | `mcp/src/shared/stats.ts:66` — cast `as unknown as { orders: { status: string } }` sin comentario propio, a diferencia del resto del archivo (y del repo), donde cada desviación de tipo se documenta in situ | sugerencia | corregido (`b43624b`) | comentario agregado explicando el porqué del cast; sin cambio de comportamiento; lint/type-check/build ok |
| 5 | `mcp/src/tools/find-related-products.ts:63` — cast de `metadata.title` sin verificar `typeof === "string"`, a diferencia del patrón seguro ya usado en `services/chat.service.ts:extractTitle` | importante | corregido (`b9b937a`) | reemplazado por la misma verificación de tipo que `extractTitle` (`extractMetadataTitle`, nueva función local); en la práctica `metadata.title` siempre es string (lo guarda `embedding.service.ts`), así que no cambia ningún resultado observable hoy, solo blinda el caso futuro; lint/type-check/build ok |
| 6 | `mcp/src/shared/products.ts:26-31` (`getProductsByIds`) — `Promise.allSettled` descarta CUALQUIER rechazo por igual (id inválido/inactivo/borrado Y una caída real de Supabase se ven idénticos), pudiendo mostrar "0 de N ids son productos válidos" cuando el problema real es un proveedor caído | importante | aceptado como deuda | requiere distinguir "0 filas" (Postgrest `.single()` vacío) de un error de conexión/timeout real sin tocar el contrato ya documentado de la función ("descarta huérfanos en silencio") — cambiar eso a mitad de este lab arriesgaba comportamiento visible de `compare_products` sin la verificación en vivo que amerita. Propuesta para sesión 6: distinguir por código de error de Postgrest (`PGRST116` = 0 filas, cualquier otro = fallo real) y solo entonces silenciar. |
| 7 | Nombres de otros usuarios no legibles en `questions`/`reviews` (sin `profiles` público) | — | aceptado como deuda | `docs/BITACORA.md` §"Deuda técnica y limitaciones conocidas" (sesión 3, ítem 1) |
| 8 | `order.service.cancelIfPending` no repone stock | — | aceptado como deuda | `docs/BITACORA.md` §"Deuda técnica y limitaciones conocidas" (sesión 3, ítem 2) |
| 9 | Pedidos multi-vendedor comparten un único `status` (`seller.service.listMyOrders`/`updateOrderStatus`) | — | aceptado como deuda | `docs/BITACORA.md` §"Deuda técnica y limitaciones conocidas" (sesión 3, ítem 3) |
| 10 | Búsqueda de `product.service.listActiveProducts` con `ilike` simple, sin ranking | — | aceptado como deuda | `docs/BITACORA.md` §"Deuda técnica y limitaciones conocidas" (sesión 3, ítem 7) |

## Orden de corrección

Aplicado de **menor a mayor riesgo** — un solo archivo/string sin lógica
primero, cambios que tocan varios archivos o rutas de error después:

1. `mcp/src/index.ts` (#3) — un string, cero lógica.
2. `mcp/src/shared/stats.ts` (#4) — un comentario, cero cambio de comportamiento.
3. `hooks/useSellerOrders.ts` (#1) — un string de UI, sin lógica.
4. `mcp/src/tools/find-related-products.ts` (#5) — cambia una rama de tipo, comportamiento idéntico en la práctica.
5. `lib/utils.ts` + los 8 hooks (#2) — el cambio de mayor superficie: toca una función compartida por otros 8 call-sites además de los 8 nuevos, aunque de forma aditiva (parámetro opcional, default idéntico). Verificado explícitamente que ningún otro caller de `getErrorMessage` cambiara de comportamiento antes de commitear.

El hallazgo #6 quedó fuera de esta corrección por ser el único cuyo arreglo
correcto exige decidir qué distingue un error real de un "no encontrado" —
justo el tipo de cambio que las RESTRICCIONES de este lab piden dejar como
deuda con propuesta en vez de forzar en el momento.

## Validación final

`mercadotech-automatic-validator` invocado sobre el estado final del
repo (6 commits de corrección de la Fase 5.6 aplicados, uno por hallazgo,
cada uno verificado con `lint`+`type-check`+`build` antes de commitear).
`mercadotech-architecture-enforcer` corrido primero sobre los archivos
tocados por esas correcciones (ninguna creó un archivo nuevo — las 5
fueron ediciones en su ubicación ya correcta), y sus 0 violaciones se
incorporan al gate de abajo. `mercadotech-code-reviewer` ya corrió en el
paso 2 de este ciclo (0 críticos) — sus hallazgos "importantes" y
"sugerencias" no hacen fallar este gate binario.

```
## Validación — repo completo (post-correcciones Fase 5.6)

- [x] architecture-enforcer: 0 violaciones (5 archivos de corrección revisados,
      ninguno crea ubicación nueva; los 4 greps de capas dan vacío, con el único
      match de "lib/supabase/admin" en services/embedding.service.ts confirmado
      como el comentario ya documentado que dice explícitamente que NO lo importa)
- [x] code-reviewer (críticos): 0 hallazgos críticos
- [x] npm run lint: exit 0
- [x] npm run type-check: exit 0
- [x] npm run build: exit 0
- [x] mcp: npx tsc --noEmit (dentro de mcp/): exit 0
- [x] mcp: npm run build (tsup): exit 0
- [—] npm run test: N/A (sesión 6)
- [x] greps de capas: los 4 vacíos

## VALIDACIÓN APROBADA
```
