# CLAUDE.md — MercadoTech

Guía de trabajo para Claude Code en este repositorio. Léela antes de tocar código.

## Qué es esto

MercadoTech: marketplace de productos tecnológicos (tipo Mercado Libre) con
centro de soporte operado por agentes de voz. Plan completo del proyecto en
[`README.md`](README.md).

## Estado del proyecto

Sesiones completas: **2** (infraestructura — BD, RLS, Storage, seed), **3**
(frontend — las 14 rutas del mapa, flujo comprador y vendedor), **4** (RAG
de compras/soporte — indexación vectorial, chat con fuentes citadas,
`/asistente` y `/soporte`), **5** (Skills de gobernanza en
`.claude/skills/` + servidor MCP de solo lectura en `mcp/`) y **6**
(testing — Vitest unitario, Playwright E2E comprador/vendedor, CI en
GitHub Actions, runbook de debugging; sin tests de componentes, sin tests
de `mcp/`, sin branch protection). Heredado sin resolver:
`docs/COSTOS.md`/`docs/PROMPTS.md` de la sesión 1 (nunca ejecutada).
Próxima: sesión 7 (performance, secretos y deploy — el CI ya quedó
armado en la sesión 6, no se repite).

Detalle fase por fase, decisiones y deuda técnica vigente:
[`docs/BITACORA.md`](docs/BITACORA.md). Pasada de QA (responsive/a11y/estados)
de la sesión 3: [`docs/SESION3_CHECKLIST.md`](docs/SESION3_CHECKLIST.md).
Los 6 casos de prueba del RAG y su calibración de thresholds:
[`docs/RAG.md`](docs/RAG.md). Arquitectura, modelo de datos y políticas RLS:
[`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Ciclo de revisión de
gobernanza de la sesión 5 (Skills sobre código real, hallazgo →
corrección/deuda): [`docs/REVISION_S5.md`](docs/REVISION_S5.md). Servidor
MCP: [`mcp/README.md`](mcp/README.md). Runbook de debugging (síntoma →
test → logs → fix, errores típicos del stack):
[`docs/DEBUGGING.md`](docs/DEBUGGING.md).

## Comandos

```bash
npm run dev          # servidor de desarrollo (Turbopack), http://localhost:3000
npm run build         # build de producción (Turbopack)
npm run start          # sirve el build de producción
npm run lint            # ESLint (eslint-config-next)
npm run type-check       # tsc --noEmit, type-check estricto sin emitir archivos
npm run db:types          # regenera types/database.ts desde el Supabase local
npm run test                # Vitest — lib/ y services/, sin red (sesión 6)
npm run test:coverage        # ídem + cobertura en coverage/ (el reporte de consola OCULTA
                             #   archivos al 100% — ver el HTML si un archivo no aparece)
```

Con Supabase local levantado (`supabase start`, requiere Docker):

```bash
supabase db reset    # reconstruye BD desde migraciones + seed.sql — PRERREQUISITO de test:e2e
npm run test:e2e      # Playwright E2E (comprador + vendedor), SOLO contra Supabase local
```

Con `ANTHROPIC_API_KEY`/`VOYAGE_API_KEY` en `.env.local` (sesión 4):

```bash
npx tsx scripts/index-all.ts   # (re)ficha todos los productos activos y artículos publicados en knowledge_embeddings
```

Servidor MCP (`mcp/`, sesión 5 — ver [`mcp/README.md`](mcp/README.md)):

```bash
cd mcp && npm run dev      # servidor MCP por stdio (tsx watch), reinicia solo al guardar
cd mcp && npm run build     # build de producción a mcp/dist/ (tsup)
npx @modelcontextprotocol/inspector npx tsx mcp/src/index.ts   # Inspector: probar tools/resources/prompts sin Claude
```

## CI (`.github/workflows/ci.yml`, sesión 6)

Corre en cada push/PR a `main` (y manual): job `checks` (lint,
type-check, `npm run test`, type-check de `mcp/`) → job `e2e` (Playwright
contra un Supabase local EFÍMERO del propio runner, credenciales leídas
con `supabase status`, sin secretos). Sin branch protection todavía
(sesión 7).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript estricto · TailwindCSS v4 ·
shadcn/ui (base-ui, estilo "base-nova") · Supabase (Postgres, Auth, Storage,
RLS) · @dnd-kit (drag & drop) · next-themes (tema claro/oscuro).

## Variables de entorno

**Un solo archivo de entorno local: `.env.local`.** Copiar
[`.env.example`](.env.example) a `.env.local` (ignorado por git) y completar
ahí — nunca crear además un `.env` plano, aunque algún prompt de una fase lo
mencione al pasar. Next.js carga `.env` y `.env.local` a la vez y
`.env.local` gana en las claves repetidas, así que un `.env` paralelo no
funciona como "valor por defecto": es un segundo lugar donde el mismo dato
puede quedar desactualizado sin que nada avise (pasó una vez en este
proyecto — `.env` apuntaba al Supabase cloud, `.env.local` al local, y
`npm run dev` cargaba una mezcla de ambos en silencio). Si ya existe un
`.env`, fusionarlo a `.env.local` y borrarlo, no dejar los dos.

`.env.local` trae dos grupos de variables (ver comentarios en
`.env.example`): las 4 que lee la app Next.js en runtime (apuntan al
Supabase **local** por default — `supabase status -o env` las imprime), y 2
que solo usa el Supabase CLI para `link`/`db push` contra un proyecto cloud
(`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`) — la app nunca las lee.
`.env.local` nunca se commitea.

## Referencia de diseño

[`docs/design-reference/`](docs/design-reference/README.md) es el canvas de
diseño usado para construir el frontend de la sesión 3 (ya completo). Sigue
vigente como fuente de los tokens visuales en `globals.css` (`industry.css`:
color primario `--color-accent: #5980a6`, tipografía Barlow/Barlow Condensed,
radios `sm 2px / md 4px / lg 7px`) — consultarlo si una pantalla nueva
necesita un componente que todavía no existe en `components/`. `support.js`
es el motor de renderizado del canvas (de terceros): no es referencia de
implementación.

## Arquitectura por capas (regla número uno del proyecto)

```
components/       Presentación PURA. Reciben props, no hacen fetching, no conocen Supabase.
hooks/             Estado de cliente. Llaman a services. Cero lógica de negocio propia.
services/          Lógica de negocio. Cada función acepta un SupabaseClient INYECTABLE
                   (default: cliente de navegador) — así hooks y Route Handlers comparten
                   la misma lógica, y los tests la mockean sin red.
lib/supabase/      Clientes: client.ts (navegador/anon), server.ts (servidor/cookies,
                   respeta RLS), middleware.ts (refresco de sesión), admin.ts
                   (service role — SOLO servidor, bypasea RLS, ver advertencia en el archivo).
lib/ai/            ÚNICOS archivos que importan `@anthropic-ai/sdk` o llaman a la API de Voyage
                   (embeddings.ts, completion.ts, prompts.ts, context-builder.ts).
lib/voice/         ÚNICOS archivos que conocen la API de voz del navegador/proveedor (sesión 8).
lib/validators/    Validación framework-agnóstica, compartida entre UI y servidor.
lib/constants/     Todos los tunables (roles, estados, límites) centralizados y documentados.
types/             Tipos de dominio + database.ts generado por Supabase.
app/api/v1/        Route Handlers DELGADOS, solo para lo que no puede correr en el
                   navegador (secretos de IA, service role, cookies de sesión).
mcp/               Servidor MCP (sesión 5, proceso Node aparte de la web, solo
                   lectura). Solo importa services/, lib/ai/, lib/constants/ y
                   types/ — nunca app/, components/ ni hooks/. Sus clientes de
                   Supabase se crean en mcp/src/context.ts (createContext(), por
                   llamada), NUNCA vía lib/supabase/admin.ts.
```

Reglas derivadas (aplican en todas las sesiones):

1. **Un archivo, una responsabilidad.** `product.service.ts` no sabe de pedidos.
2. **Sin barrels.** Se importa el archivo específico, nunca "todo el módulo".
3. **La UI nunca importa `lib/ai/`** (tampoco `lib/voice/` ni
   `lib/supabase/admin.ts`): el navegador llega a la IA solo vía
   hook → fetch a `app/api/v1/*` → service → `lib/ai/`.
4. **Un solo camino de datos:** hooks → services → Supabase (RLS). No se
   construye una API REST paralela "por si acaso".
5. **Todo tunable vive en `lib/constants/`** con un comentario que justifica su valor.
6. **`mcp/` es un consumidor más de `services/` y `lib/ai/`:** jamás
   reimplementa lógica de negocio ni importa de `app/`, `components/` o
   `hooks/`. Lo que un service no expone, se DERIVA componiendo services
   existentes en `mcp/src/shared/` (documentado ahí, archivo por archivo)
   — nunca una consulta de negocio nueva "porque era más corto".

## Skills de gobernanza (`.claude/skills/`)

Cuatro Skills cargadas por Claude Code (reiniciar sesión tras crear o
editar una para que se recarguen): `mercadotech-architecture-enforcer`
(gate ANTES de crear/mover un archivo — solo ubicación, nunca estilo),
`mercadotech-code-reviewer` (informe DESPUÉS de escribir, con nota —
nunca bloquea), `mercadotech-automatic-validator` (veredicto binario
APROBADA/FALLIDA al cerrar una fase) y `mercadotech-tech-lead` (scorecard
ponderado ante decisiones de diseño o deuda técnica). Las 4 **reportan,
nunca editan código** — corregir es siempre un paso humano aparte.

**Norma de cierre (sesión 6):** al terminar cualquier feature, el ciclo es
`code-reviewer` → correcciones humanas → `automatic-validator` (que ya
corre `npm run test` obligatorio y `npm run test:e2e` si el stack local
está arriba). Rojo en cualquiera de los dos = no se commitea.

## Estructura de carpetas

```
app/(auth)/           login, register
app/(shop)/            catálogo (/, /buscar, /categoria/[slug]), /producto/[id],
                       /carrito, /favoritos, /pedidos, /pedidos/[id],
                       /asistente, /soporte (sesión 4)
app/(seller)/           panel del vendedor, prefijo /vendedor/: productos,
                        publicar, productos/[id]/editar, pedidos
app/api/v1/              Route Handlers server-only: reindex, search/semantic, chat (sesión 4)
components/ui/            primitivas shadcn/ui (base-ui), sin lógica de dominio
components/shared/         EmptyState, ErrorState, LoadingState, Price,
                          ProductImage, RatingStars, ConditionBadge, Container
components/layout/          Navbar, MobileNav, SearchBar, CategoriesMenu,
                           CartIndicator, UserMenu, SellerSidebar, NavLink
components/{catalog,product,cart,orders,seller,auth,chat,support}/  presentación por dominio
hooks/, services/             un archivo por dominio, mismo nombre en ambos
lib/supabase/                  client.ts, server.ts, middleware.ts, admin.ts
lib/constants/                   roles.ts, catalog.ts, product.ts, orders.ts, routes.ts,
                                  ai.ts, tickets.ts
lib/ai/                                  embeddings.ts, completion.ts, prompts.ts, context-builder.ts
lib/validators/, lib/voice/
types/                             tipos de dominio + database.ts generado
supabase/migrations/                 fuente de verdad del esquema, RLS y Storage
supabase/schema.sql, policies.sql, seed.sql   referencia, NO fuente de verdad
supabase/tests/                        rls-validation.sql (Fase 2.6)
mcp/src/                                 tools/, resources/, prompts/, shared/ (servidor MCP, sesión 5)
docs/                                    ARQUITECTURA.md, BITACORA.md, SESION3_CHECKLIST.md, RAG.md, REVISION_S5.md, DEBUGGING.md
```

## Convenciones

- TypeScript estricto (`strict: true` en `tsconfig.json`). No usar `any` sin justificar.
- Import alias `@/*` apunta a la raíz del proyecto (no hay `src/`).
- **Patrón de service (cliente inyectable):** toda función de `services/`
  recibe el `SupabaseClient` como ÚLTIMO parámetro, con default al cliente de
  navegador — así `hooks/` y los Route Handlers de `app/api/v1/` comparten
  la misma lógica sin duplicarla:
  ```ts
  export async function getProductById(
    id: string,
    supabase: SupabaseClient<Database> = createClient(),
  ) { /* ... */ }
  ```
- `numeric(12,2)` (`price`, `total`, `price_snapshot`) llega de PostgREST
  como **`string`**: se convierte con `Number()` dentro del service; los
  componentes siempre reciben `number`.
- Los componentes de producto reciben `image_url` ya resuelta (URL pública
  completa), nunca el `image_path` crudo — lo resuelve
  `storage.service.getPublicUrl` en el service/hook, no el componente.
- Filtros y paginación del catálogo viven en la URL (`useSearchParams` /
  `router.push`), no en estado de componente.
- Las transiciones de estado del kanban de pedidos se validan en
  `hooks/useSellerOrders.ts` (`move`), ANTES de llamar al service — nunca en
  `components/` ni en el service.
- **Testing (sesión 6):** un test unitario vive JUNTO al archivo que
  prueba (`cart.service.test.ts` al lado de `cart.service.ts`); los E2E
  viven en `e2e/`. Los tests unitarios inyectan el cliente Supabase por
  parámetro — jamás `vi.mock` de `lib/supabase/*`; `lib/ai/*` sí se
  mockea por módulo. Un test documenta el CONTRATO REAL del código, no el
  que "debería" tener — si un comportamiento real parece un bug, se anota
  como deuda técnica en `docs/BITACORA.md`, nunca se ajusta el test para
  que luzca bien. Selectores E2E: `data-testid` en kebab-case o rol
  accesible — nunca clases CSS ni texto largo.
- `package.json` fija `"packageManager": "npm@11.6.2"` (la versión que
  generó `package-lock.json`) — no se cambia sin regenerar el lockfile Y
  actualizar el mismo pin en `.github/workflows/ci.yml`; si se
  desalinean, `npm ci` falla en CI con "Missing from lock file"
  (`docs/DEBUGGING.md`).
- Verificación de capas (debe devolver vacío antes de cerrar cualquier fase):
  ```bash
  grep -rl "@/lib/supabase" components hooks
  grep -rl "from \"@/services" components
  grep -rln "@anthropic-ai\|api.voyageai.com" --include="*.ts" . | grep -v node_modules | grep -v lib/ai
  grep -rl "lib/supabase/admin" app components hooks services | grep -v api/v1
  grep -rl "from \"@/app\|from \"@/components\|from \"@/hooks" mcp/src
  ```
