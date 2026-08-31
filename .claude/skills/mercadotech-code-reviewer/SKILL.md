---
name: mercadotech-code-reviewer
description: Revisión de código estilo PR sobre el dominio de MercadoTech (RLS, snapshots de pedidos, mutaciones de stock, pipeline RAG, convenciones de CLAUDE.md) — informa con calificación /10, nunca bloquea. Usar cuando el usuario pide "revisa este archivo/service/hook", "hazme code review de...", "¿este código sigue las convenciones del proyecto?", o al cerrar una fase antes de correr el validator.
---

# mercadotech-code-reviewer

Revisor: entrega un informe con nota, errores y sugerencias — como un
comentario de PR. Corre DESPUÉS de que el código ya existe.

**Reporta, no edita código y no bloquea.** No decide si algo puede
commitearse (eso es `mercadotech-automatic-validator`); solo informa.

## Qué NO hace (deslinde con las otras 3 Skills)

- No decide dónde debe vivir un archivo nuevo — eso es
  `mercadotech-architecture-enforcer` (aunque el reviewer SÍ puede señalar
  una violación de capas ya escrita como hallazgo, con la salvedad de que
  no la "rechaza", la reporta).
- No da un veredicto binario APROBADA/FALLIDA ni corre `lint`/`type-check`
  como gate de cierre — eso es `mercadotech-automatic-validator` (el
  reviewer puede mencionar errores de tipo que vea al leer, pero no
  reemplaza correr los comandos).
- No pondera decisiones de arquitectura a largo plazo ni contrasta contra
  deuda técnica aceptada — eso es `mercadotech-tech-lead`.

## Checklist del dominio (cada ítem se verifica leyendo el código real, no
de memoria)

1. **RLS:** ¿la operación nueva respeta las políticas existentes
   (`supabase/migrations/20260821110000_create_rls_policies.sql`,
   `supabase/policies.sql`) o las esquiva usando el cliente admin sin una
   razón documentada? Si usa admin, ¿hay un comentario junto al uso
   explicando qué policy lo obliga (mismo patrón que
   `app/api/v1/reindex/route.ts`)?
2. **Snapshots de pedidos:** en cualquier código que muestre datos de un
   `order`/`order_item` ya creado, ¿usa `price_snapshot`
   (`types/order.ts`) o vuelve a leer `products.price` actual? Un pedido ya
   pagado nunca debe mostrar el precio de HOY.
3. **Stock:** ¿toda mutación de `products.stock` pasa por el RPC
   `create_order_from_cart` (único camino transaccional, sesión 2), o hay
   un `update` directo a `stock` desde algún service/hook nuevo? Un
   `update` directo fuera de ese RPC es un hallazgo crítico (rompe la
   consistencia de inventario).
4. **Orden del pipeline RAG:** en cualquier código nuevo que toque IA, ¿se
   preserva búsqueda (`vector-search.service`) → contexto
   (`lib/ai/context-builder.ts`) → completion (`lib/ai/completion.ts`), sin
   saltos ni atajos? ¿Los tunables usados (thresholds, `topK`, modelo,
   `maxTokens`) vienen de `lib/constants/ai.ts` o están hardcodeados en el
   archivo?
5. **`numeric` como string:** todo campo `numeric(12,2)` de Postgres
   (`price`, `total`, `price_snapshot`) llega de PostgREST como string —
   ¿el `Number()` ocurre DENTRO del service (`mapProductRow`,
   `mapOrderRow`, etc.), o se filtró un componente que recibe el valor
   crudo sin convertir?
6. **Componentes puros:** ¿algún componente hace fetching, importa
   Supabase, o recibe `image_path` crudo en vez de `image_url` ya resuelta
   (`storage.service.getPublicUrl`)?
7. **`any` sin justificar:** TypeScript estricto — cualquier `any` necesita
   un comentario que explique por qué no hay alternativa tipada razonable.
8. **Errores accionables:** ¿los mensajes de error de código que toca
   proveedores externos distinguen casos (401/429/400/cuota) con un mensaje
   claro para quien lo lea en la terminal, siguiendo el patrón ya usado en
   `lib/ai/embeddings.ts`/`completion.ts`, o es un `throw error` genérico?
9. **Filtros y paginación del catálogo:** ¿viven en la URL
   (`useSearchParams`/`router.push`) o se coló estado local de componente
   para algo que debería ser compartible/recargable?
10. **Kanban de pedidos:** si el cambio toca transiciones de estado, ¿la
    validación de "un paso adelante" vive en `hooks/useSellerOrders.ts`
    (`move`) ANTES de llamar al service, o se agregó directo en el
    componente o en el service?

## Formato de salida

```
## Code Review — <archivo(s) revisado(s)>

**Calificación: X/10**

### Errores críticos
- <archivo:línea> — <qué está mal y por qué importa>

### Errores importantes
- <archivo:línea> — <qué está mal>

### Sugerencias
- <archivo:línea> — <mejora opcional, no bloqueante>

### Lo que está bien
- <mención breve de lo que sigue las convenciones correctamente>
```

Sin críticos ni importantes no implica 10/10 automático — las sugerencias
también bajan nota si son varias o repetidas. Si no hay nada que señalar en
una sección, se omite esa sección (no se deja vacía con "N/A").

---

**Fuente de verdad: `CLAUDE.md`.** Ante cualquier contradicción entre este
checklist y `CLAUDE.md`, `CLAUDE.md` gana — releerlo antes de marcar algo
como error.
