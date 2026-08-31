---
name: mercadotech-architecture-enforcer
description: Gate PREVIO a crear o mover un archivo en el repo MercadoTech — verifica SOLO ubicación y dependencias permitidas (nunca estilo, naming ni calidad). Usar ANTES de escribir código, cuando el usuario pide cosas como "crea un componente que consulte productos directamente de Supabase", "agrega un hook para...", "¿dónde va este archivo?", "mueve X a Y", "implementa una tool MCP para...", o cualquier petición que implique un archivo nuevo o reubicado en app/, components/, hooks/, services/, lib/ o mcp/.
---

# mercadotech-architecture-enforcer

Inspector de permisos de obra: antes de que se levante un muro, dice si puede
ir ahí. Se ejecuta ANTES de escribir o mover un archivo — nunca después.

**Reporta, no edita código.** No mueve archivos, no corrige imports, no
escribe nada — señala la regla violada y la ubicación correcta; la
corrección la aplica un paso aparte, humano-supervisado.

## Qué NO hace (deslinde con las otras 3 Skills)

- No opina de estilo, naming, ni calidad del código — eso es
  `mercadotech-code-reviewer`.
- No da una calificación ni pondera trade-offs de diseño — eso es
  `mercadotech-tech-lead`.
- No corre `lint`/`type-check` ni da un veredicto binario sobre todo el
  repo — eso es `mercadotech-automatic-validator`.
- Si la ubicación es correcta, no tiene más nada que decir sobre ese archivo.

## Checklist (cada ítem se verifica con un grep o una lectura, no a ojo)

1. **¿Un archivo en `components/` hace fetching, importa `@/lib/supabase/*`
   o `@/services/*` directo?** → rechazar. `components/` es presentación
   PURA: recibe props, no conoce Supabase (CLAUDE.md, "Arquitectura por
   capas"). El fetching va en un hook que llama a un service.
2. **¿Un archivo en `services/` importa `react`, `next/*`, o algo de
   `app/`?** → rechazar. `services/` es lógica de negocio pura, inyectable
   por cualquier caller (hook o Route Handler), sin conocer la UI.
3. **¿Alguien fuera de `lib/ai/` importa `@anthropic-ai/*` o llama a
   `api.voyageai.com`?** → rechazar. `lib/ai/` (`embeddings.ts`,
   `completion.ts`, `prompts.ts`, `context-builder.ts`) son los ÚNICOS
   archivos que conocen los proveedores de IA.
   Verificar: `grep -rln "@anthropic-ai\|api.voyageai.com" --include="*.ts" . | grep -v node_modules | grep -v lib/ai` → debe ser vacío.
   > **Corrección sobre la spec de la sesión 5:** `MercadoTech_sesion5.md`
   > (Fase 5.1) escribe esta regla como "`@huggingface/*`" — quedó
   > desactualizada: la sesión 4 reemplazó Hugging Face por Voyage AI +
   > Claude (`MercadoTech_sesion4.md`, "Registro de cambios"). `CLAUDE.md`
   > ya trae el grep real con Anthropic/Voyage — ante la contradicción,
   > `CLAUDE.md` gana, y esta es la versión vigente de la regla.
4. **¿Alguien fuera de `lib/voice/` usa la Web Speech API
   (`SpeechRecognition`, `speechSynthesis`, etc.)?** → rechazar. Rige desde
   la sesión 8 (`lib/voice/` reservado, todavía vacío salvo `.gitkeep`),
   pero la regla se hace cumplir desde ya.
5. **¿Se importa `lib/supabase/admin.ts`, o se construye un cliente con
   `SUPABASE_SERVICE_ROLE_KEY`, fuera de `app/api/v1/*`, `scripts/*`, o
   `mcp/src/context.ts`?** → rechazar. `lib/supabase/admin.ts` bypasea RLS
   por completo (ver la advertencia en su propia cabecera) — jamás desde
   `components/`, `hooks/`, ni ningún archivo `"use client"`.
   Verificar: `grep -rl "lib/supabase/admin" app components hooks services | grep -v api/v1` → debe ser vacío. Si aparece un match dentro de un
   comentario que EXPLÍCITAMENTE dice que ese archivo NO lo importa (caso
   real ya presente en `services/embedding.service.ts`), leer la línea
   antes de rechazar — no es una violación.
   `mcp/src/context.ts` construye sus PROPIOS clientes con
   `@supabase/supabase-js` (decisión cerrada de la Fase 5.2) — nunca
   importa `lib/supabase/admin.ts` directo, para mantener `mcp/`
   desacoplado de la capa server de Next.
6. **¿Se agrega un Route Handler nuevo para un CRUD que ya funciona vía
   hooks + RLS (sin que sea IA, secretos o service role)?** → rechazar. Un
   solo camino de datos: hooks → services → Supabase (CLAUDE.md, regla
   derivada 4). `app/api/v1/` es solo para lo que NO puede correr en el
   navegador.
7. **¿Un import trae "todo el módulo" desde un barrel/index en vez del
   archivo específico** (ej. `from "@/services"` en vez de
   `from "@/services/product.service"`)? → rechazar. Sin barrels (CLAUDE.md,
   regla derivada 2).
8. **¿Un valor "mágico" (límite, threshold, nombre de modelo, tamaño de
   página, umbral de similitud) se hardcodea fuera de `lib/constants/`?**
   → rechazar, proponer agregarlo a `lib/constants/<archivo>.ts` con el
   comentario que justifica el valor (CLAUDE.md, regla derivada 5).
9. **¿Se agrega lógica del servidor MCP (tools, resources, prompts,
   contexto, clientes) fuera de `mcp/`?** → rechazar.
10. **¿Un archivo en `mcp/src/` reimplementa una consulta de negocio que ya
    existe en `services/*.service.ts` o `lib/ai/*`, en vez de importarla?**
    → rechazar — salvo que sea una DERIVACIÓN documentada en
    `mcp/src/shared/` componiendo funciones existentes (Guía de lecciones
    de `MercadoTech_sesion5.md`, lección 6: "reutilizar, no reimplementar").
11. **¿Un componente o hook del lado del cliente importa `lib/ai/*`
    directo?** → rechazar. La única cadena válida es hook → `fetch` a
    `app/api/v1/*` → service → `lib/ai/` (CLAUDE.md, regla derivada 3).

## Referencia — estructura de carpetas vigente (fuente: `CLAUDE.md`)

```
app/(auth)/            login, register
app/(shop)/             catálogo (/, /buscar, /categoria/[slug]), /producto/[id],
                        /carrito, /favoritos, /pedidos, /pedidos/[id],
                        /asistente, /soporte
app/(seller)/            panel del vendedor, prefijo /vendedor/
app/api/v1/               Route Handlers server-only: reindex, search/semantic, chat
components/ui/             primitivas shadcn/ui, sin lógica de dominio
components/shared/          EmptyState, ErrorState, LoadingState, Price, ProductImage,
                           RatingStars, ConditionBadge, Container
components/layout/           Navbar, MobileNav, SearchBar, CategoriesMenu, CartIndicator,
                            UserMenu, SellerSidebar, NavLink
components/{catalog,product,cart,orders,seller,auth,chat,support}/  por dominio
hooks/, services/              un archivo por dominio, mismo nombre en ambos
lib/supabase/                   client.ts, server.ts, middleware.ts, admin.ts
lib/constants/                    roles.ts, catalog.ts, product.ts, orders.ts, routes.ts,
                                  ai.ts, tickets.ts
lib/ai/                                   embeddings.ts, completion.ts, prompts.ts, context-builder.ts
lib/validators/, lib/voice/
types/                              tipos de dominio + database.ts generado
mcp/src/                              servidor MCP (sesión 5): tools/, resources/, prompts/, shared/
```

Un archivo nuevo que no encaje en ninguna fila de esta tabla no se rechaza
automáticamente — se señala como "ubicación no contemplada" y se pide
confirmación antes de crearlo ahí.

## Formato de salida

```
✅ UBICACIÓN CORRECTA
<archivo propuesto> — sin objeciones.
```

o

```
❌ UBICACIÓN RECHAZADA
Regla violada: <número y texto literal del ítem del checklist>
Por qué: <una línea>
Ubicación correcta: <ruta propuesta, con el patrón que ya sigue el repo>
```

Si hay más de una violación, listarlas todas antes de proponer la
corrección — no cortar en la primera.

---

**Fuente de verdad: `CLAUDE.md`.** Ante cualquier contradicción entre esta
Skill, la spec de una sesión, o lo que "parece razonable", `CLAUDE.md` gana
— releerlo antes de insistir en una regla que no está ahí.
