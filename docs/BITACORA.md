# Bitácora — MercadoTech

Bitácora acumulativa del proyecto, una sección por sesión, **la más
reciente primero**. Está pensada para que alguien que no estuvo en la
sesión entienda qué se construyó, por qué, y qué quedó pendiente, sin
tener que leer el código entero.

**Nota sobre las fechas de este documento:** el repositorio no tenía
ningún commit al cierre de la sesión 4 (`git log --oneline --all` seguía
vacío en ese momento — se había reverificado con `git rev-list --all
--count` → `0`). Por eso las fechas de las sesiones 1 a 4 salen de la
fecha de modificación de archivos representativos de cada fase (no
inventadas, pero sí aproximadas), y las secciones de las sesiones 1 y 2
están marcadas explícitamente como **reconstruidas**. La sesión 5 es la
PRIMERA con historial git real: su primer commit (`8611160`) es también
el commit raíz de todo el repositorio — arrastra consigo, en un único
commit reconstructivo (`21b28a1`), el estado completo alcanzado por las
sesiones 2 a 4. Ver el detalle de fechas al abrir la sección de la
sesión 5.

---

## Sesión 6 — Testing, Debugging y Automatización (2026-08-31, commits `c622302`..`bb1ebc8`)

Construye la red de seguridad que faltaba: Vitest para lógica pura y
services, Playwright para los dos flujos E2E críticos (comprador y
vendedor, con el kanban movido por TECLADO), un pipeline de CI en GitHub
Actions con dos jobs encadenados, y un runbook de debugging. Spec:
[`MercadoTech_sesion6.md`](../MercadoTech_sesion6.md). Fases ejecutadas:
6.1 a 6.8 (más el Prompt 0 y la conexión del remoto).

**Nota sobre commits:** el cierre de la sesión 5 que abrió esta se pidió
verificar contra el commit `eed65ff` — ese hash **no existe** en este
repositorio (`git log` lo confirma). El cierre real de la sesión 5 es
`99e5a83` (`docs: add project log and update CLAUDE.md at close of Sesion
5`); todo el rango de esta sección se midió contra `99e5a83..HEAD` (11
commits, `git log --reverse --format="%h %s" 99e5a83..HEAD`), no contra
el hash pedido.

### Fase 0 — Remoto de GitHub y tooling (commits `c622302`, `faf21f9`)

**Construido:** `PROMPTS_sesion6.md`; conexión de `origin` a
`github.com/isaidv/MercadoTech_Example` y push inicial; instalación de
`vitest`, `@vitest/coverage-v8`, `@playwright/test`.

**Decisión — sin `gh` CLI autenticado en el entorno:** el push y, más
adelante, la apertura/cierre de PRs de prueba (Fase 6.7) se hicieron con
el token que ya tenía guardado el credential manager de git para
`github.com` (el mismo que ya usaba `git push`) — nunca se pidió ni se
manejó una contraseña a mano.

### Fase 6.1 — Infraestructura de Vitest (commit `eb2b751`)

**Construido:** `vitest.config.mts` (`environment: "node"`, alias `@/` →
raíz, `coverage.include: ["lib/**", "services/**"]`); scripts `test`,
`test:watch`, `test:coverage`.

**Decisión 6 — sin jsdom ni Testing Library:** esta sesión no testea
componentes React (decisión explícita, ver Restricciones de la spec) —
`environment: "node"` alcanza y ninguna de las dos librerías se instaló.

### Fase 6.2 — Suite de lógica pura (commit `2f6c9b0`)

**Construido:** `lib/utils.test.ts`, `lib/validators/auth.test.ts`,
`lib/validators/product.test.ts`, `lib/ai/context-builder.test.ts`,
`lib/ai/prompts.test.ts` — 5 archivos, 511 líneas.

**Corrección sobre la spec (decisión 3):** la versión anterior de la spec
pedía testear "formateo de fechas", una función que no existe en el
repo — se testeó solo lo que existe (`cn` y `formatPrice`).

**Problema real, no un bug:** un test viejo asumía que `formatPrice`
usaba un espacio normal entre `"S/"` y el monto; el código real inserta
`U+00A0` (NBSP, no U+0020) — se verificó carácter por carácter antes de
escribir cada aserción, en vez de copiar el string a ojo.

### Fase 6.3 — Suite de services con mock inyectado (commit `eef7bad`)

**Construido:** `services/test-utils/supabase-mock.ts` (`MockQueryBuilder`
encadenable, `PromiseLike`, `filterCalls`/`mockError`, 246 líneas) + 10
archivos `*.service.test.ts` + `hooks/useSellerOrders.test.ts` — 15
archivos tocados en total, 1646 líneas.

**Decisión 7 — mockeo de DOS niveles:** el cliente Supabase se INYECTA
siempre (nunca `vi.mock` de `lib/supabase/*`); `lib/ai/*`
(`chat.service.test.ts`, `embedding.service.test.ts`) sí se mockea con
`vi.mock` de módulo — es la ÚNICA excepción, porque `chat.service`/
`embedding.service` importan `lib/ai/` directo, sin cliente inyectable.

**Decisión 4 — la regla del kanban se testea donde vive:** la spec
anterior la ponía en `seller.service.updateOrderStatus`, contradiciendo a
`CLAUDE.md` (la secuencia vive en el HOOK). Se exportó `canMove()`, ya
existente en `hooks/useSellerOrders.ts`, y se testeó directo, sin React —
refactor mecánico, cero lógica nueva.

**Decisión 5 — los tests anclan al comportamiento real:** `addItem`
suma cantidades duplicadas y recorta a `[1, stock]`; un test viejo pedía
"rechazar quantity ≤ 0", que no es el contrato real. Se testeó lo que el
código realmente hace.

**Problema real, no corregido (RESTRICCIONES de la fase lo prohibían):**
`storage.service.getPublicUrl` tiene su PROPIO `createClient()` por
default, y ni `product.service.mapProductRow` ni `cart.service.mapCartRow`
le pasan el cliente inyectado del test — bug real de "cliente inyectable"
incompleto. Se trabajó alrededor con valores dummy de
`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` en `vitest.config.mts` (nunca salen
a la red, `getPublicUrl` solo concatena strings). Verificado con Docker
apagado: la suite completa pasa sin red.

### Fase 6.4 — Infraestructura de Playwright (commit `d6bfcad`)

**Construido:** `playwright.config.ts`, 7 Page Objects (`e2e/pages/`),
`e2e/fixtures/test.ts`, `e2e/data/{users.ts,product-image.jpg}`,
`home.spec.ts`, 17 `data-testid` nuevos en componentes reales (17 líneas,
el único cambio de producción permitido en esta fase).

**Problema real del entorno, no del código:** Firefox nunca lanza en este
sandbox (`spawn UNKNOWN`, confirmado con `firefox.exe --version` directo
→ `Permission denied`, exit 126) — bloqueo de permisos del SO, no de
Playwright ni de la app. Chromium y WebKit sí lanzan. `home.spec.ts` se
verificó en 2/3 navegadores; Firefox queda documentado como limitación
del entorno de desarrollo, no como fase incompleta (en CI, sección 6.7,
no aplica: solo corre Chromium).

### Fase 6.5 — E2E del flujo comprador (commit `07f4352`)

**Construido:** `buyer-flow.spec.ts` (8 pasos, `test.step`),
`buyer-negative.spec.ts` (3 casos) — 171 líneas.

**Problema real de la app, encontrado y NO corregido (fuera de
alcance):** `app/(shop)/layout.tsx` y `producto/[id]/page.tsx` llaman
cada uno su PROPIA instancia de `useCart(userId)`, sin contexto
compartido — el contador del navbar no se actualiza al agregar un
producto desde su ficha (el insert en `cart_items` sí es correcto,
confirmado por consulta directa a Postgres). El test se ancló al toast
de confirmación (consecuencia real e inmediata) en vez del contador roto.

**Corrección sobre el seed:** el producto "sin stock" real es
`b0000000-...-007` (SSD), no `...-006` (RAM, con stock 20) como decía un
supuesto previo — verificado leyendo `supabase/seed.sql` directo.

### Fase 6.6 — E2E del flujo vendedor con kanban por teclado (commit `9814d88`)

**Construido:** `seller-flow.spec.ts`, `seller-negative.spec.ts` — 247
líneas; fixture `seller2Page` nueva.

**Decisión 9 — kanban movido por TECLADO** (`KeyboardSensor` activo desde
la sesión 3): focus en la tarjeta (el asa ES la tarjeta completa) →
`Space` → `ArrowRight`/`ArrowLeft` → `Space`. Nunca `mouse.down/move/up`.

**Corrección sobre el seed (verificada, no asumida):** el ÚNICO pedido
`pagado` del seed es `c0000000-...-002` y pertenece a **seller2** (Andes
Digital Store), no a seller1 — `c...03` está `enviado`, no `pagado`. Todo
el flujo se corrió con seller2.

**Problema real de la app, encontrado vía trace de red y NO corregido:**
`app/(seller)/layout.tsx` y `vendedor/publicar/page.tsx` llaman cada uno
su PROPIA instancia de `useAuth()` — al publicar muy rápido, la del
formulario podía no haber resuelto `profile` todavía y mandaba
`seller_id: ""`, rechazado por Postgres (`22P02 invalid input syntax for
type uuid`). Mismo patrón que el bug del carrito (Fase 6.5). El test se
ajustó con `waitForLoadState("networkidle")` antes de llenar el
formulario; producción intacta.

**Hallazgo real de accesibilidad (el que anticipaba la Fase 6.6):**
`ArrowLeft` nunca mueve una tarjeta hacia atrás en el kanban — probado
con eventos de teclado reales en dos pares de columnas distintos, ninguno
resolvió un destino de drop válido (`ArrowRight` sí funciona, confirmado
en el flujo principal). Causa probable: `sortableKeyboardCoordinates` está
pensado para reordenar una lista, no para saltar entre los 5
`SortableContext` independientes del tablero. El negativo de "retroceder"
se reescribió para verificar el comportamiento REAL (nada se mueve,
ningún toast) en vez del toast de rechazo, que nunca llega a intentarse.

**Bug cosmético encontrado, sin corregir:** el `Select` de categoría del
formulario del vendedor muestra el UUID crudo en el trigger en vez del
nombre, tras seleccionar una opción (reproducido con clic real de mouse,
no solo en Playwright) — `categoryId` queda bien guardado, el problema es
solo visual.

### Fase 6.7 — Pipeline de CI en GitHub Actions (commit `8513ddc`)

**Construido:** `.github/workflows/ci.yml` (jobs `checks` y `e2e`, 207
líneas) + `"packageManager": "npm@11.6.2"` en `package.json`.

**Cambio de alcance decidido por el docente (registrado en la propia
spec, `MercadoTech_sesion6.md`, "Registro de cambios de esta versión de
la spec"):** esta sesión ABSORBIÓ el pipeline de CI que antes era la Fase
7.1 — pasó a ser la Fase 6.7. `MercadoTech_sesion7.md` **todavía no
existe en el repo** (`ls` lo confirma) — cuando se escriba, la nota deja
constancia de que debe conservar solo performance/secretos/deploy/docs,
sin repetir el CI.

**Decisión 10 (lección real de ReadHub):** el lockfile lo generó
`npm@11.6.2` en Windows — otra versión de npm en el runner Linux resuelve
las dependencias OPCIONALES distinto y `npm ci` falla con "Missing from
lock file". `packageManager` en `package.json` y `npm install -g
npm@11.6.2` en los dos jobs del workflow tienen que coincidir EXACTO.

**Decisión 11 — credenciales dinámicas, no secretos:** el job `e2e` lee
`supabase status -o json` + `jq` DESPUÉS de `supabase db reset` y arma las
env vars del paso de tests con eso — son las claves estándar de
cualquier `supabase start` local, el contenedor nace y muere con el job,
no protegen nada real. Cero `GitHub Secrets` en el workflow.

**Problema real, verificado y absorbido por diseño:** en la primera
corrida de push (`run #1`), `seller-flow.spec.ts` falló una vez en el
paso del kanban por teclado y pasó en el retry automático (`retries: 2`
en CI) — el job quedó verde porque ese retry existe justo para esto
(decisión 12). Queda como tarea de diagnóstico aparte (hipótesis: el
runner de Actions es más lento que el entorno local y compite con la
`transition` CSS de dnd-kit entre las tres teclas), no se "arregló" el
test a ciegas.

**Verificación real en GitHub Actions** (vía `gh`/API, con el token del
credential manager de git — nunca `gh auth login` con contraseña):

| Run | Evento | Commit | Resultado | `checks` | `e2e` |
|---|---|---|---|---|---|
| #1 | push a `main` | `8513ddc` | ✅ success | 56 s | 3 m 44 s (total 4 m 47 s) |
| #2 | PR #1 (`ci-smoke`, cambio trivial) | `b2bc962` | ✅ success | — | — |
| #3 | PR #1 (test roto a propósito) | `bb97828` | ❌ **failure** | failure | *skipped* (`needs: checks`) |
| #4 | PR #1 (revert) | `5f9084b` | ✅ success | — | — |

El PR #1 se cerró SIN mergear tras el ciclo (rama `ci-smoke` borrada,
local y remota). Artefacto de cobertura del run #1: 130 KB, expira a los
7 días (`retention-days: 7`).

### Fase 6.8 — Debugging y actualización de los gates (commit `bb1ebc8`)

**Construido:** `docs/DEBUGGING.md` (243 líneas: flujo síntoma→test→logs→
fix, cómo pedirle debugging a Claude, tabla de 6 errores típicos) +
edición quirúrgica de `.claude/skills/mercadotech-automatic-validator/SKILL.md`
(ítem `npm run test` obligatorio + `npm run test:e2e` condicional).

**Corrección sobre la spec, dos veces en el mismo lugar:** "modelo HF sin
proveedor" de la tabla de errores típicos es un resabio de ReadHub
(Hugging Face) — MercadoTech usa Claude + Voyage desde la sesión 4. Ya
había pasado exactamente lo mismo en la Fase 5.1 de la sesión anterior
(la regla del enforcer sobre `@huggingface/*`) — spec vieja, mismo patrón
de corrección.

**Problema del propio cierre de esta sesión (no de la 6.8, encontrado al
armar los números finales de abajo):** el reporte de CONSOLA de
`npm run test:coverage` OCULTA archivos con 100 % en las 4 métricas —
`lib/validators/{auth,product}.ts` y `lib/ai/{context-builder,prompts}.ts`
no aparecen en la tabla de texto, aunque SÍ están en `coverage/*.html` al
100 % (verificado abriendo cada uno). No es un déficit de cobertura real:
es que el reporter de texto de Istanbul/v8 no lista archivos totalmente
cubiertos. Documentado acá para que nadie entre en pánico leyendo la
consola.

## Números finales de la sesión

- **Tests unitarios:** 194, en 17 archivos, todos verdes con Docker
  apagado (`npm run test`, sin red).
- **Cobertura de `services/`:** 88.88 % líneas, 86.75 % ramas — supera el
  objetivo de ≥ 80 % líneas.
- **Cobertura de `lib/validators/` y `lib/ai/context-builder.ts`:** 100 %
  en las 4 métricas (verificado en `coverage/*.html`, ver el hallazgo de
  la Fase 6.8 arriba sobre por qué no aparece en la consola).
- **E2E:** 8 tests (`buyer-flow`×1, `buyer-negative`×3, `home`×1,
  `seller-flow`×1, `seller-negative`×2) en 5 specs, 7 Page Objects, verdes
  contra Supabase local con seed (`npm run test:e2e -- --project=chromium`).
- **CI:** job `checks` ~1 min, job `e2e` ~4 min, corrida completa ~5 min
  (run #1, tabla arriba).

## Qué quedó explícitamente fuera de esta sesión

- **Tests de componentes React** (decisión 6) — sin jsdom ni Testing
  Library instalados; fuera de alcance por diseño, no por falta de tiempo.
- **Tests automatizados de `mcp/`** — sigue sin script `test` propio
  (deuda heredada de la sesión 5, ver abajo); el CI solo corre su
  `type-check`.
- **Branch protection** — el CI corre y se ve verde/rojo, pero nada
  todavía impide mergear un PR en rojo (sesión 7).
- **Deploy** — sigue sin Vercel ni ningún otro hosting conectado (sesión 7).

## Estado de los criterios de aceptación de la sesión

| Criterio | Estado | Evidencia |
|---|---|---|
| `npm run test` verde con Docker apagado, con la cobertura objetivo | ✅ | 194/194, Fase 6.3 verificada explícitamente con Docker apagado; `services/` 88.88 % líneas (objetivo ≥80 %), validadores+context-builder 100 % (`coverage/*.html`) |
| `npm run test:e2e` verde contra Supabase local con el seed | ✅ | 8/8 tests, `npm run test:e2e -- --project=chromium` tras `supabase db reset`, run #1 de CI |
| El kanban está cubierto por E2E vía teclado | ✅ con hallazgo | `ArrowRight` (avanzar) cubierto y verde; `ArrowLeft` (retroceder) es un hallazgo de accesibilidad real, documentado y NO maquillado con mouse (`seller-negative.spec.ts`) |
| Push y PR de prueba muestran ambos jobs en verde; un test roto los pone en rojo | ✅ | Tabla de runs #1–#4 arriba, con enlaces verificables en la pestaña Actions del repo |
| La Skill validator ejecuta los tests como parte del gate | ✅ | Diff quirúrgico de `SKILL.md`; demostrado manualmente (FALLIDA→APROBADA) porque la Skill recién editada necesita reiniciar sesión para recargar |
| `npm run lint`, `npm run type-check` y `npm run build` pasan | ✅ | Reverificados al cierre de cada fase de esta sesión, sin excepción |

## Deuda técnica y limitaciones conocidas (nuevas de esta sesión)

1. **`useAuth()` sin contexto compartido** (Fase 6.6, mismo patrón que
   `useCart()` de la Fase 6.5 abajo) — cada componente que lo llama hace
   su propio fetch de `profile`, sin caché ni coordinación; puede mandar
   un `seller_id: ""` si se publica muy rápido tras cargar la página. Sin
   dueño de sesión asignado.
2. **`useCart()` sin contexto compartido** (Fase 6.5) — el contador del
   navbar no se actualiza al agregar desde la ficha de un producto; hace
   falta un reload. Sin dueño de sesión asignado.
3. **Kanban: `ArrowLeft` no mueve tarjetas hacia atrás** (Fase 6.6,
   hallazgo de accesibilidad real) — un vendedor solo-teclado puede
   avanzar un pedido pero nunca retroceder ninguno. Necesita un
   `coordinateGetter` a medida para `OrdersKanban.tsx`, consciente de los
   5 contenedores del tablero. Sin dueño de sesión asignado.
4. **Select de categoría muestra el UUID crudo, no el nombre** (Fase 6.6)
   — cosmético, `categoryId` se guarda bien. Sin dueño de sesión asignado.
5. **`seller-flow.spec.ts` fue flaky una vez en GitHub Actions** (Fase
   6.7) — el retry de CI lo absorbió; falta diagnosticar si es timing de
   dnd-kit bajo un runner más lento antes de que se vuelva costumbre
   confiar en el retry.
6. **`storage.service.getPublicUrl` con su propio cliente por default**
   (deuda ya documentada en la Fase 6.3, sección de arriba) — sigue sin
   dueño de sesión asignado.
7. **Sin tests automatizados en `mcp/`** (heredada de la deuda técnica #5
   de la sesión 5) — **parcialmente resuelta**: el validator ya no la
   marca "N/A" para el proyecto web, pero `mcp/` en sí sigue sin
   `package.json`'s `test` script; el CI solo corre su `type-check`.

## Pendientes para la sesión 7 y heredados

- **Heredado de la sesión 1 (no ejecutada):** sigue sin `docs/COSTOS.md`
  ni `docs/PROMPTS.md`.
- **Vista `public_profiles`** (deuda técnica #1 de la sesión 3) — sin
  dueño de sesión asignado.
- **Trigger de reposición de stock al cancelar** (deuda técnica #2 de la
  sesión 3) — sin dueño de sesión asignado.
- **Estado de pedido por vendedor/ítem** (deuda técnica #3 de la sesión
  3) — sin dueño de sesión asignado.
- **Sugerencia de ticket en modo soporte no 100 % consistente** (deuda
  técnica #1 de la sesión 4) — sin dueño de sesión asignado.
- **Calibración de threshold con tráfico real** (deuda técnica #2 de la
  sesión 4) — sin dueño de sesión asignado.
- **`getProductsByIds` no distingue "no encontrado" de "proveedor
  caído"** (deuda técnica #1 de la sesión 5) — sin dueño de sesión
  asignado.
- **Documentar en `docs/ARQUITECTURA.md` la decisión de no hacer el
  monorepo** (deuda técnica #4 de la sesión 5) — pendiente simple.
- **`useAuth()`/`useCart()` sin contexto compartido, kanban `ArrowLeft`,
  Select de categoría, flake de `seller-flow.spec.ts` en CI** (deuda
  técnica #1–5 de esta sesión, arriba) — ninguna con dueño de sesión
  asignado.
- **Tests automatizados de `mcp/`** (deuda técnica #7 de esta sesión) —
  sin dueño de sesión asignado.
- **Performance, secretos y deploy** — sesión 7. `MercadoTech_sesion7.md`
  todavía no existe (ver la nota de la Fase 6.7 arriba) — cuando se
  escriba, no debe incluir CI: ya quedó armado acá.
- **Branch protection** — sesión 7 (no se configuró a propósito en la
  6.7, ver Restricciones de esa fase).
- **Agente de voz** — sesión 8, sin cambios desde el cierre de la sesión 5.

---

## Sesión 5 — Custom Skills y Protocolo MCP (2026-08-31, commits `8611160`..`fe4d9b0`)

Construye dos cosas nuevas sobre el proyecto existente: cuatro **Skills**
de gobernanza para Claude Code (`.claude/skills/`) y un **servidor MCP**
de solo lectura (`mcp/`) que expone el catálogo, el asistente conversacional
y estadísticas de la tienda a cualquier cliente MCP, reutilizando
`services/`/`lib/ai/` sin duplicar lógica. Spec:
[`MercadoTech_sesion5.md`](../MercadoTech_sesion5.md). Fases ejecutadas:
5.1 a 5.6.

**Nota sobre fechas y commits:** los 11 commits de esta sesión
(`8611160` a `fe4d9b0`, `git log --oneline` completo) están TODOS fechados
`2026-08-31` — a diferencia de las sesiones 3 y 4, esta vez las fechas de
commit son reales (no aproximadas por mtime de archivo), pero reflejan un
solo día de trabajo, no el calendario real de cada fase. El commit raíz
del repo es `8611160` (Skills de la Fase 5.1); el segundo, `21b28a1`, es
una reconstrucción retroactiva de TODO lo alcanzado en las sesiones 2 a 4
(no es trabajo de esta sesión, solo quedó commiteado durante ella) — el
resto de los commits de `mcp/` y del lab 5.6 son posteriores a ese punto.

### Fase 5.1 — Skills de gobernanza (commit `8611160`)

**Construido:** `.claude/skills/{mercadotech-architecture-enforcer,
mercadotech-code-reviewer,mercadotech-automatic-validator,
mercadotech-tech-lead}/SKILL.md` — cuatro manuales de puesto con
frontmatter (`name`, `description` como disparador) y reglas ancladas en
archivos reales del repo, no en dogma genérico.

**Decisión — las Skills se commitean desde el primer commit** (lección 1
de la Guía ReadHub, `MercadoTech_sesion5.md`): a diferencia del proyecto
de referencia, donde quedaron sin versionar y se perdieron del historial.

**Problema:** una Skill recién creada no se activa en la conversación que
la creó — hace falta reiniciar la sesión de Claude Code para que la
descubra (decisión 9 de la spec). **Confirmado en la práctica**: la
sesión del lab 5.6 se corrió en una conversación nueva a propósito, y ahí
sí las 4 Skills respondieron a su nombre.

**Corrección sobre la spec:** `mercadotech-architecture-enforcer/SKILL.md`
trae su propio párrafo de corrección: la regla "¿alguien fuera de
`lib/ai/` importando `@huggingface/*`?" que trae `MercadoTech_sesion5.md`
(Fase 5.1) quedó desactualizada — la sesión 4 reemplazó Hugging Face por
Voyage AI + Claude. La Skill ya usa el grep real de `CLAUDE.md`
(`@anthropic-ai\|api.voyageai.com`), no la regla vieja de la spec.

### Fase 5.2 — Scaffolding del servidor MCP (commit `85fa063`)

**Construido:** `mcp/package.json` (`@modelcontextprotocol/sdk ^1.30.0`,
`zod ^3.25.76`, dev: `tsup ^8.5.1`/`tsx`/`typescript`), `mcp/tsconfig.json`
(extiende el de la raíz, alias `@/*` → `../*`), `mcp/tsup.config.ts`,
`mcp/src/{index,server,env,context}.ts`,
`mcp/src/lib/{tool-result,errors,safe}.ts`.

**Decisión 1 — `context.ts` no importa `lib/supabase/admin.ts`:**
`createContext()` construye `{anon, admin}` con `@supabase/supabase-js`
directo. La spec asumía que `admin.ts` importa `server-only` y por eso
"revienta bajo Node puro" — **verificado línea por línea contra el
archivo real y es falso**, `admin.ts` no importa ese paquete.
`scripts/index-all.ts` (sesión 4) ya lo prueba usándolo directo con
`tsx`. La razón real es otra: `admin.ts` documenta en su cabecera una
lista cerrada de importadores autorizados (Route Handlers, Server
Actions, `scripts/`) que `mcp/` deliberadamente no integra, para no
acoplar el servidor MCP a una convención de la app web.

**Decisión 2 — `env.ts` reutiliza la `.env.local` de la raíz** (no una
propia de `mcp/`), mismo `process.loadEnvFile` que `scripts/index-all.ts`
— una sola fuente de credenciales.

**Decisión 5 — contexto por llamada, no al arrancar:** `createContext()`
se invoca DENTRO de cada handler; el proceso vive horas y un cliente
único quedaría con su conexión/credenciales congeladas.

**Problema — stdout es sagrado:** con transporte stdio, stdout transporta
JSON-RPC — un `console.log` sin redirigir corrompe la sesión completa.
**Resuelto:** la línea 1 de `mcp/src/index.ts` redirige
`console.log/info/warn` a `stderr`, y TODO lo demás (SDK incluido) se
importa dinámico (`await import(...)`) dentro de `main()` — un `import`
estático se evalúa antes de que corra cualquier línea del cuerpo del
archivo (se "hoistea"), así que si una dependencia transitiva hiciera un
`console.log` a nivel de módulo, se ejecutaría ANTES de la redirección
igual. El import dinámico garantiza el orden real.

**Problema — ¿por qué `zod@^3.25.76` exacto, no cualquier v3?**
Verificado en el código instalado (`mcp/node_modules`): el propio SDK
compilado (`@modelcontextprotocol/sdk/dist/esm/types.js`) hace
`import * as z from 'zod/v4'` — un subpath de compatibilidad que zod
recién empezó a publicar en esa versión. Sin él, el SDK no resuelve. No
es una superstición heredada de ReadHub, es una dependencia real
verificable.

### Fase 5.3 — 10 Tools (commit `df65404`)

**Construido:** `mcp/src/tools/{define-tool,index,search-products,
get-product,list-categories,semantic-search-products,ask-assistant,
compare-products,find-related-products,summarize-reviews,
get-store-stats,get-order-status}.ts`, `mcp/src/shared/{products,stats}.ts`
(primeras derivaciones).

**Decisión 3 — cliente admin en `semantic_search_products`,
`ask_assistant` y `find_related_products`:** `knowledge_embeddings_select_authenticated`
(sesión 4) exige `authenticated`; el MCP no tiene sesión de usuario.

**Decisión 4 — cliente admin (parcial) en `get_store_stats` y
`get_order_status`:** `orders`/`order_items` solo autorizan
comprador/vendedor-con-ítems/admin; `get_order_status` expone
ÚNICAMENTE estado/fecha/total/ítems-snapshot, nunca `buyer_id`.

**Decisión 6 — derivaciones en `mcp/src/shared/`, no services nuevos:**
`getCategoriesWithCounts`/`getTopSellingProducts`/`getStoreStats`
componen `category.service`/`product.service` existentes; `getStoreStats`
hace consultas agregadas directas SOLO donde de verdad no hay service que
componer (top vendidos sobre `order_items`), documentado como excepción,
no como patrón.

**Decisión 8 — cliente SIEMPRE explícito:** toda llamada a un service
desde una tool pasa `anon`/`admin` del contexto — nunca se deja caer al
default `= createClient()` (cliente de navegador) de la firma del
service, que sería inofensivo pero incorrecto por accidente.

**Desviación respecto a la spec:** la tabla de la Fase 5.3
(`MercadoTech_sesion5.md`) dice que la tool #2 (`get_product`) reutiliza
también `review.service.getAverage` — el código real NO la llama:
`product.service.getProductById` ya calcula `average_rating`/`review_count`
en el mismo `mapProductRow` (join a `reviews(rating)`, sesión 3), así que
llamarla aparte sería una segunda consulta para un dato que ya viene
armado. Documentado en el comentario de `tools/get-product.ts`.

**Desviación respecto a la spec:** la tabla de la Fase 5.3 agrupa las
tools #4/#5/#7/#8 como "requiere token HF" por igual. En el código real,
solo #4/#5/#7 tocan `knowledge_embeddings`/Voyage; #8
(`summarize_reviews`) reutiliza `lib/ai/completion.generateCompletion`
(Claude) sobre reseñas ya públicas — no necesita cliente admin ni toca
embeddings. `mcp/README.md` ya refleja el agrupamiento real ("las 4 tools
semánticas: #4, #5, #7 y la mitad de #9").

### Fase 5.4 — 7 Resources y 5 Prompts (commit `49c8a37`)

**Construido:** `mcp/src/resources/{define-resource,index,info,products,
product-detail,categories,sellers,faq,stats}.ts`,
`mcp/src/prompts/{define-prompt,build-prompt-result,index,
describir-producto,comparar-productos,redactar-respuesta-pregunta,
resumen-de-resenas,generar-articulo-faq}.ts`,
`mcp/src/shared/{faq,questions,sellers,summarize}.ts` (derivaciones
restantes) y `mcp/src/lib/safe-resource.ts`.

**Decisión 5 — `sellers/{sellerId}` expone SOLO `display_name` + productos
activos:** `profiles` no tiene SELECT público (deuda técnica #1 de la
sesión 3) — ni siquiera se PIDEN `phone`/`avatar_path` en la consulta de
`shared/sellers.ts` (no es "se ocultan al responder": no se traen de la
base). Cliente admin porque `profiles_select_own_or_admin` no alcanza
para leer el perfil de un tercero.

**Regla de la lección 7 (ReadHub), aplicada:** cada resource va envuelto
en `safeRead`/`safeList` (`mcp/src/lib/safe-resource.ts`) — un resource
caído nunca tumba `resources/list` completo.

**Problema — errores `PostgrestError` mostraban `"[object Object]"`:**
detectado probando la degradación de `resources/list` con Supabase
detenido (verificación de la propia Fase 5.4). `error instanceof Error ?
error.message : String(error)` falla porque el cliente de
`@supabase-js` rechaza con un objeto plano (`{message, code, details,
hint}`), no siempre una instancia real de `Error`. **Resuelto:**
`mcp/src/lib/errors.ts` exporta `getErrorMessage()` — intenta
`Error.message`, después `.message` de cualquier objeto que lo tenga como
string, y solo como último recurso `JSON.stringify`.

**Problema — un `z.array(z.string())` en un Prompt nunca recibe valor
real:** descubierto probando `comparar_productos` con el Inspector
(`"Expected array, received string"`). El protocolo MCP tipa
`GetPromptRequestParams.arguments` como `{[key: string]: string}` — un
Prompt (a diferencia de una Tool, cuyo `tools/call` sí acepta JSON
arbitrario) NUNCA puede recibir un array, sea cual sea el `argsSchema`.
**Resuelto:** `ids` es un string de ids separados por coma, parseado y
validado (2-4) dentro del handler — límite del protocolo, no elección de
diseño.

**Problema — casts genéricos en `define-tool.ts`/`define-prompt.ts`:**
`server.tool(...)`/`server.registerPrompt(...)` son genéricos del SDK;
envueltos dentro de otra función genérica (`defineTool<Shape>`,
`definePrompt<Shape>`), TypeScript no puede probar que un callback armado
a partir de un `Shape` todavía ABSTRACTO satisface la sobrecarga del SDK
para ESE `Shape` — confirmado con un archivo de prueba aparte donde la
llamada DIRECTA (sin el wrapper genérico) compila limpia sin cast.
**Resuelto** con `as unknown as <Callback><Shape>` (el mismo doble-cast
que sugiere el propio error de `tsc`) SOLO en los dos helpers genéricos;
cada `tools/*.ts`/`prompts/*.ts` real sigue type-checkeando en serio
porque llama a los helpers con un `Shape` concreto.

### Fase 5.5 — Registro y validación (commit `088d30f`)

**Construido:** `.mcp.json` en la raíz, `mcp/README.md` (arquitectura,
decisiones, tabla completa de tools/resources/prompts, síntomas).

**Decisión 7 — el alias `@/*` se resuelve dos veces, por separado:** en
dev (`tsx`), `mcp/tsconfig.json` lo resuelve vía `paths`. En build,
`tsup`/`esbuild` NO leen `tsconfig.json` para resolver imports en tiempo
de bundling (solo para type-checking) — hubo que declarar el mismo alias
otra vez en `mcp/tsup.config.ts` (`esbuildOptions.alias`), apuntando a la
raíz del repo (un nivel arriba de `mcp/`). Sin esa segunda declaración,
`npm run build` compila pero `node dist/index.js` falla al no encontrar
`@/services/...`.

**Problema — `npm run lint` de la raíz saltó a 174 problemas** en cuanto
`mcp/dist/` existió por primera vez (tras el primer `npm run build`
dentro de `mcp/`): ESLint escaneaba el bundle de terceros (el SDK de MCP
vendorizado y minificado por `tsup`) como si fuera código propio.
**Resuelto:** `eslint.config.mjs` suma `"mcp/dist/**"` a `ignores`
(`mcp/node_modules` ya caía bajo `node_modules/**`, que matchea en
cualquier profundidad, pero una carpeta con otro nombre como `dist`
necesita su propia entrada explícita). También se sumó `"mcp"` al
`exclude` de `tsconfig.json` de la raíz — sin eso, `npm run type-check`
de la raíz barría `mcp/src/` con las opciones del proyecto web en vez de
las suyas.

### Fase 5.6 — Lab de gobernanza aplicada (commits `9fe3292`..`fe4d9b0`)

**Construido:** [`docs/REVISION_S5.md`](REVISION_S5.md) — ciclo completo:
scorecard de `mercadotech-tech-lead` sobre `services/`+`hooks/` completos
(nota global **Alto** en los 6 criterios), informe de
`mercadotech-code-reviewer` sobre `lib/ai/` + 3 Route Handlers +
`mcp/src/` completo (**9/10**, 0 críticos), consolidación contra la
lista blanca de deuda técnica ya documentada en este archivo, y veredicto
final de `mercadotech-automatic-validator`.

**Resultado del lab, en cifras:** 10 hallazgos consolidados → **5
corregidos** (uno por commit, de menor a mayor riesgo, cada uno
verificado con `lint`+`type-check`+`build`: log de arranque desactualizado
en `mcp/src/index.ts`; cast sin comentario en `mcp/src/shared/stats.ts`;
un string en voseo aislado en `hooks/useSellerOrders.ts`; cast de
`metadata.title` sin verificar tipo en
`mcp/src/tools/find-related-products.ts`; duplicación de manejo de
errores en 8 hooks, corregida extendiendo `lib/utils.ts:getErrorMessage`
con un `fallback` opcional) → **5 aceptados como deuda** (1 nueva —
`mcp/src/shared/products.ts:getProductsByIds` confunde "id no encontrado"
con "proveedor caído", con propuesta para sesión 6 — y 4 ya documentadas
en este archivo: nombres de usuario no legibles, stock no repuesto al
cancelar, `status` único en pedidos multi-vendedor, búsqueda `ilike`
simple) → **0 falsos positivos**. Ninguna corrección cambió comportamiento
visible de la app ni contratos de `services/`.

**Decisión 9, confirmada en la práctica:** el lab se corrió en una
conversación nueva de Claude Code a propósito, para que las 4 Skills
recién creadas en la Fase 5.1 estuvieran cargadas.

**Decisión 10, aplicada:** cada hallazgo se cruzó contra la lista blanca
de deuda técnica de este archivo (secciones de sesión 3 y sesión 4) antes
de asignar veredicto — lo whitelisteado se justificó con cita, nunca se
re-marcó como hallazgo nuevo.

---

## Estado de los criterios de aceptación de la sesión

| Criterio | Estado | Evidencia |
|---|---|---|
| MCP Inspector lista y ejecuta las 10 tools sin errores con datos del seed | ✅ | `mcp/README.md`, sección "Cómo probarlo" — comandos CLI del Inspector documentados como los usados para reunir la evidencia de ese README (tabla de las 10 tools con service/cliente reales) |
| `ask_assistant` desde MCP produce la misma calidad que la UI web | ✅ | `mcp/README.md`, tool #5 — reutiliza `chat.service.ask` tal cual, el mismo pipeline búsqueda→contexto→completion que `/asistente`/`/soporte` (sesión 4), sin reimplementación |
| Con Supabase detenido, `resources/list` sigue respondiendo | ✅ | `mcp/src/lib/safe-resource.ts` (`safeList`/`safeRead`) — verificado durante la Fase 5.4 (evidencia del bug real de `"[object Object]"` encontrado en esa misma prueba, arriba) |
| Ninguna tool/resource expone teléfono, email ni nombre de comprador | ✅ | `mcp/src/shared/sellers.ts` solo pide `id, display_name, role`; `mcp/src/tools/get-order-status.ts` descarta `buyer_id` explícito del `Order` completo que devuelve `getOrderById` |
| La Skill validator termina en APROBADA sobre el estado final del repo | ✅ | `docs/REVISION_S5.md`, sección final — salida literal `VALIDACIÓN APROBADA` |
| `type-check` de la raíz Y de `mcp/` pasan; el build de `mcp/` arranca | ✅ | Reverificado en esta sesión: `npm run type-check` (raíz) exit 0, `npx tsc --noEmit` dentro de `mcp/` exit 0, `npm run build` (tsup) dentro de `mcp/` exit 0 |

## Deuda técnica y limitaciones conocidas (nuevas de esta sesión)

1. **`mcp/src/shared/products.ts:getProductsByIds` no distingue "id no
   encontrado" de "proveedor caído".** `Promise.allSettled` descarta
   cualquier rechazo por igual — una caída real de Supabase se ve
   idéntica a un id inválido/inactivo/borrado. `compare_products` puede
   terminar mostrando "0 de N ids son productos válidos" cuando el
   problema real es un timeout de conexión. Hallazgo del lab 5.6,
   aceptado como deuda (`docs/REVISION_S5.md`, hallazgo #6): la
   corrección correcta exige decidir qué código de error de Postgrest
   distingue ambos casos (`PGRST116` = 0 filas vs. cualquier otro), sin
   tocar el contrato ya documentado de la función ("descarta huérfanos en
   silencio"). Sin dueño de sesión asignado.
2. **`shared/stats.getCategoriesWithCounts` es N+1 a propósito** (una
   consulta por categoría) — aceptable con 8 categorías, no escalaría a
   cientos sin una agregación real. Documentado en `mcp/README.md`.
3. **`resources/products/{id}`'s `list` recorre hasta 5 páginas** (60
   productos) para enumerar instancias — acotado, no exhaustivo si el
   catálogo creciera mucho más. Documentado en `mcp/README.md`.
4. **La decisión de NO hacer el monorepo (npm workspaces/Turborepo) nunca
   se documentó en `docs/ARQUITECTURA.md`**, pese a que la propia spec
   (`MercadoTech_sesion5.md`, "Nota opcional: monorepo") lo pide
   explícitamente si se opta por no hacerlo ("decidir con el criterio del
   tech-lead y documentar la decisión"). Confirmado con
   `grep -n "monorepo\|workspace\|Turborepo" docs/ARQUITECTURA.md` →
   vacío. El código sí sigue el patrón simple (carpeta `mcp/` con su
   propio `package.json`, importando por alias `@/*`) — solo falta el
   registro escrito de por qué.
5. **Sin tests automatizados en `mcp/`** — `mcp/package.json` no tiene
   script `test` todavía; llega en la sesión 6 (el validator ya lo marca
   "N/A" hasta entonces).

## Pendientes para la sesión 6 y heredados

- **Heredado de la sesión 1 (no ejecutada):** sigue sin `docs/COSTOS.md`
  ni `docs/PROMPTS.md` — sin cambios desde el cierre de la sesión 3.
- **Vista `public_profiles`** (deuda técnica #1 de la sesión 3) — la
  sesión 5 tampoco la necesitó: `sellers/{sellerId}` resuelve el mismo
  problema con una consulta admin acotada a solo `display_name`, sin
  crear la vista.
- **Trigger de reposición de stock al cancelar** (deuda técnica #2 de la
  sesión 3) — sin dueño de sesión asignado todavía.
- **Estado de pedido por vendedor/ítem** (deuda técnica #3 de la
  sesión 3) — sin dueño de sesión asignado todavía.
- **La sugerencia de ticket en modo soporte no es 100% consistente**
  (deuda técnica #1 de la sesión 4) — sin dueño de sesión asignado.
- **Calibración de threshold con tráfico real** (deuda técnica #2 de la
  sesión 4) — sin dueño de sesión asignado.
- **`getProductsByIds` no distingue "no encontrado" de "proveedor
  caído"** (deuda técnica #1 de esta sesión, arriba) — propuesta:
  distinguir por código de error de Postgrest.
- **Documentar en `docs/ARQUITECTURA.md` la decisión de no hacer el
  monorepo** (deuda técnica #4 de esta sesión, arriba) — pendiente
  simple, sin dueño de sesión asignado.
- **Tests automatizados** — sesión 6, tanto del proyecto web como de
  `mcp/` (`npm run test` no existe todavía en ninguno de los dos).
- **Agente de voz** — sesión 8. `get_order_status` (tool #10 del MCP) ya
  está escrita pensando en que la reutilice: solo lectura, sin datos del
  comprador, documentado explícitamente en el propio archivo.

---

## Sesión 4 — RAG de compras y soporte (2026-08-28 a 2026-08-31, sin commits)

Construye retrieval-augmented generation sobre el catálogo y la FAQ de la
sesión 2: indexación vectorial de productos y artículos, dos asistentes
conversacionales (`/asistente` compras, `/soporte` soporte + "Mis
tickets") y una pestaña de búsqueda semántica en `/buscar`. Spec:
[`MercadoTech_sesion4.md`](../MercadoTech_sesion4.md). Fases ejecutadas:
4.1 a 4.8.

### Fase 4.1 — Infraestructura vectorial (2026-08-28)

**Construido:** migraciones `20260826140000_enable_pgvector.sql`
(extensión `vector` en el schema `extensions`, no `public`),
`..140100_create_knowledge_embeddings.sql` (tabla `knowledge_embeddings`:
`source_type` con `check` `producto`/`articulo_soporte`, `source_id` SIN
foreign key, `embedding vector(1024)`, índice HNSW
`vector_cosine_ops`), `..140200_create_match_knowledge.sql` (RPC
`security invoker`), `..140300_knowledge_embeddings_rls.sql` (SELECT solo
`authenticated`); `types/database.ts` regenerado.

**Decisión — `source_id` sin FK:** la columna apunta a dos tablas de
origen distintas según `source_type` (`products` o `support_articles`) —
ninguna foreign key única podría expresarlo. Las fichas huérfanas
(fuente borrada o renombrada) se manejan en código, no en el esquema:
`vector-search.service.ts` las descarta en silencio al hidratar.

**Decisión — una tabla discriminada, no dos:** permite agregar una
fuente nueva el día de mañana (ej. reseñas) reutilizando el mismo índice
HNSW y el mismo RPC, a costa de la FK de arriba.

**Problema:** `match_knowledge` fallaba con "operator does not exist:
vector <=> vector" al correr `supabase db reset`, aunque la tabla y el
índice se creaban bien. **Resuelto:** la función usaba
`set search_path = public` (el patrón de seguridad estándar de este
proyecto, ver `is_admin()` de la sesión 2) — pero la extensión `vector`
vive en `extensions`, no en `public`, así que ese `search_path` la
excluía dentro del cuerpo de la función aunque el `create extension`
funcionara bien a nivel de migración. Se cambió a
`set search_path = public, extensions`.

### Fase 4.2 — Capa de IA y servicio de embeddings (2026-08-28)

**Construido:** `lib/constants/ai.ts` (todos los tunables de IA);
`lib/ai/embeddings.ts` (`generateEmbedding`, Voyage por `fetch`),
`lib/ai/completion.ts` (`generateCompletion`, Claude por
`@anthropic-ai/sdk`), `lib/ai/prompts.ts` (instrucciones de sistema de
los dos modos); `services/embedding.service.ts` (`indexSource`).

**Decisión — dos proveedores de IA, no uno:** la API de Claude no genera
embeddings (Anthropic no tiene modelo propio, recomienda Voyage). Un RAG
necesita las dos mitades: `voyage-4-lite` (1024 dim) ficha y busca,
`claude-haiku-4-5` redacta. Por eso `lib/ai/embeddings.ts` usa `fetch`
crudo (el SDK de Voyage en TS está en v0.x y documenta mal `input_type`)
mientras `lib/ai/completion.ts` usa el SDK oficial de Anthropic — roles
de SDK/`fetch` invertidos respecto al proyecto de referencia (ReadHub).

**Decisión — modelo por variable de entorno:** `VOYAGE_EMBEDDING_MODEL`/
`ANTHROPIC_CHAT_MODEL` con fallback al literal en `lib/constants/ai.ts` —
palanca de upgrade explícita sin tocar código.

### Fase 4.3 — Indexación automática (2026-08-28)

**Construido:** `lib/api-response.ts` (`apiError`);
`app/api/v1/reindex/route.ts` (POST, cliente admin);
`services/indexing-trigger.service.ts` (`triggerReindex`,
fire-and-forget); `scripts/index-all.ts`; `lib/supabase/admin.ts`
tipado con `Database`; `hooks/useProductForm.ts`/`useSellerProducts.ts`
amplificados con `triggerReindex` tras publicar/editar/activar/
desactivar/borrar un producto.

**Decisión — reindex best-effort:** `triggerReindex` nunca lanza ni
bloquea la UI, solo `console.warn` si falla. Publicar un producto debe
funcionar igual con o sin `VOYAGE_API_KEY` disponible; `index-all.ts` es
el plan B manual si el trigger falló.

**Problema:** la cuenta de Voyage de este laboratorio no tiene método de
pago → límite duro de 3 peticiones/minuto (mensaje real del proveedor,
no un bug de la app). **Resuelto:** reintento con backoff de 21s (hasta
4 intentos) SOLO en `scripts/index-all.ts`, que indexa muchas fuentes
seguidas; el reindex interactivo de la UI y los endpoints NO reintentan
— bloquear 20+ segundos una request de usuario sería peor que fallar
rápido y dejar `index-all` como respaldo.

### Fase 4.4 — Búsqueda semántica en el catálogo (2026-08-28)

**Construido:** `services/vector-search.service.ts`
(`searchByEmbedding`, `searchProducts`);
`app/api/v1/search/semantic/route.ts`; `hooks/useSemanticSearch.ts`;
pestaña "Resultados con IA" en `/buscar` (`SearchTabs.tsx`,
`SemanticSearchPanel.tsx`) junto a "Coincidencia exacta" (sesión 3,
intacta); `ProductCard`/`ProductGrid` amplificados con una prop
`similarity` opcional.

**Decisión — corrección respecto a la spec original (la IA exige
sesión):** la RLS de `knowledge_embeddings` (SELECT solo
`authenticated`) ya obligaba a esto, y además protege el gasto real —
cada consulta a Voyage/Claude cuesta dinero. Un anónimo en `/buscar` ve
"Coincidencia exacta" intacta; la pestaña IA le pide iniciar sesión.

### Fase 4.5 — Constructor de contexto (2026-08-28)

**Construido:** `lib/ai/context-builder.ts` (`buildRagContext`), función
PURA (cero I/O — nada de `fetch`/Supabase/React): filtra por similitud y
longitud mínima, ordena estable por similitud descendente, recorta por
presupuesto de caracteres descartando entera (no truncando a medias) una
fuente si lo que le queda de presupuesto es menor a
`CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS`.

**Decisión — pureza total a propósito:** queda testeable con datos en
memoria en la sesión 6, sin mockear red ni Supabase.

### Fase 4.6 — Servicio conversacional y endpoint (2026-08-28)

**Construido:** `types/chat.ts`; `services/chat.service.ts` (`ask`,
encadena `vector-search` → `context-builder` → `completion` sin
reimplementar ninguno); `app/api/v1/chat/route.ts` (POST, sesión
obligatoria → 401, `mode` inválido → 422, body inválido → 400, log
estructurado por consulta); `searchKnowledge` agregado a
`vector-search.service.ts`.

**Decisión — sin atajos locales:** sin contexto relevante,
`generateCompletion` se llama IGUAL (con el mensaje de "sin fuentes" que
arma `context-builder`) — las instrucciones de cada modo ya cubren qué
decir cuando no hay fuentes; nunca hay una respuesta armada a mano que
reemplace la redacción del modelo.

### Fase 4.7 — Interfaz del asistente (2026-08-28)

**Construido:** `hooks/useChat.ts` (historial en memoria por modo,
hidrata cada fuente "producto" con `product.service.getProductById`
para la mini-card); `services/ticket.service.ts` (`listMine`, solo
lectura) + `hooks/useMyTickets.ts`;
`components/chat/{ChatWindow,ChatMessage,LoadingMessage,ChatInput,SourcesList}.tsx`
(puros, sin conocer el endpoint ni `lib/ai/`);
`components/support/{TicketCard,TicketStatusBadge}.tsx`; páginas
`/asistente` y `/soporte` (+ "Mis tickets"); `UserMenu`/`MobileNav`
amplificados con las entradas nuevas; `/asistente` y `/soporte` sumados
a `PROTECTED_ROUTE_PREFIXES` en `lib/supabase/middleware.ts`.

**Decisión:** los tipos `ChatSourceDisplay`/`ChatUIMessage` viven en
`types/chat.ts`, no en `hooks/useChat.ts` — mismo criterio que
`CartProductSnapshot` en `types/order.ts` (sesión 3): así
`components/chat/*.tsx` los importa sin que `components/` termine
importando de `hooks/`.

**Fuera de alcance (explícito de la spec):** streaming de la respuesta
(se espera la respuesta completa); crear tickets desde el chat (esta
sesión solo lista — llega con el agente de voz de la sesión 8); voz
(sesión 8 — el layout de `/soporte` deja el comentario del botón de
micrófono, sin implementarlo).

### Fase 4.8 — Calibración, observabilidad y casos de prueba (2026-08-31)

**Construido:** [`docs/RAG.md`](RAG.md) — los 6 casos de la spec
ejecutados con evidencia real (transcripciones y logs), tabla de
calibración de 10 consultas, tabla de síntomas y diagnóstico.

**Calibración — sí hubo ajuste:** el threshold de similitud
(`VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD`/
`CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY`, `lib/constants/ai.ts`) subió
de 0.3 (hipótesis heredada, nunca medida) a **0.4**, con evidencia de 10
consultas reales: ninguna consulta legítima devolvió 0 fuentes con 0.3
(no hacía falta bajar), pero la cola de resultados 3°–5° en las
consultas que llenaban el tope de 5 caía en similitud 0.32–0.45 — ruido
real y claro en al menos un caso (un SSD, unos audífonos gaming y un
procesador como "fuente" de una pregunta sobre laptops livianas).
Ninguna fuente citada por Claude en las 10 consultas bajó nunca de
0.452, así que 0.4 poda ese ruido con margen sin arriesgar falsos
negativos. Efecto medido tras aplicar el cambio: de 8 casos
re-ejecutados, solo 1 cambió de verdad (las demás colas de ruido
resultaron estar apenas por encima de 0.4, no por debajo — documentado
como resultado honesto en `docs/RAG.md`, no inflado).

**¿Rotó el modelo en el Prompt 0 o durante la sesión?** No —
`claude-haiku-4-5` y `voyage-4-lite` son los mismos ids desde la Fase
4.2 hasta el cierre de la sesión, confirmado en `metadata.model` de
todos los logs del endpoint de chat a lo largo de las Fases 4.6–4.8.

**Problema (documentado, no arreglado):** en el caso 5 de `docs/RAG.md`
("¿venden autos usados?" en modo soporte), la sugerencia explícita de
abrir un ticket que pide `SUPPORT_SYSTEM_INSTRUCTIONS`
(`lib/ai/prompts.ts`) no aparece en el 100% de las repeticiones de la
misma consulta — variabilidad normal de un modelo de lenguaje sobre la
misma instrucción, no un bug de código ni de threshold
(`retrievedCount: 0` fue correcto en todas las repeticiones). Esta fase
solo permitía tocar constantes de `lib/constants/ai.ts`, no
`lib/ai/prompts.ts` — queda como pendiente (ver abajo).

**Corrección post-cierre, fuera de las 8 fases (2026-08-31, a pedido
explícito):** en uso real de `/asistente`, una pregunta genérica de
catálogo ("qué productos tienes?") hacía que el asistente respondiera
"no tengo información sobre el catálogo... compartime el listado" —
pidiéndole los datos AL USUARIO, que tampoco los tiene. Diagnóstico
antes de tocar nada (ver addendum completo,
[`docs/RAG.md`, sección 7](RAG.md)): no era un problema de conexión
(el endpoint respondía 200 sin errores) sino que ninguna de las dos
preguntas probadas superaba el threshold de 0.4 recién calibrado — mejor
similitud medida 0.367 y 0.399 respectivamente, correcto para una
consulta sin tema puntual. El problema real estaba en
`SHOPPING_SYSTEM_INSTRUCTIONS`: no le decía al modelo qué hacer ante
contexto vacío más allá de "decilo con claridad", y el modelo
interpretaba eso como "no tengo catálogo". **Resuelto** reescribiendo
`lib/ai/prompts.ts` (`SHOPPING_SYSTEM_INSTRUCTIONS`) para que, sin
contexto, el asistente pregunte por el tipo de producto/marca/precio en
vez de sonar como si no tuviera acceso a nada — `lib/constants/ai.ts`
NO se tocó, el threshold sigue en 0.4. Verificado en vivo con el mismo
escenario reportado (ver `docs/RAG.md`); lint y type-check limpios.

---

## Estado de los criterios de aceptación de la sesión

| Criterio | Estado | Evidencia |
|---|---|---|
| Los 6 casos de prueba pasan y quedan documentados en `docs/RAG.md` | ✅ | `docs/RAG.md`, sección 3 — transcripciones y logs estructurados reales de cada caso |
| Sin `ANTHROPIC_API_KEY`/`VOYAGE_API_KEY`, el resto de la app funciona y el chat/búsqueda IA devuelven un error controlado inline | ✅ | Fase 4.7: `fetch` de `/api/v1/chat` interceptado en el navegador para simular un 502 real (mismo shape que faltando la llave) sin tocar `.env.local` — burbuja "No pude procesar tu consulta, intenta de nuevo", resto de la app (catálogo, navbar, `/api/v1/search/semantic`) intacto |
| Anónimo: catálogo y búsqueda exacta intactos; pestaña IA, `/asistente` y `/soporte` piden sesión | ✅ | Fase 4.4 (pestaña IA) y 4.7 (`/asistente`/`/soporte` → `/login?redirectTo=`), verificado en vivo limpiando cookies y navegando directo |
| `grep -rln "@anthropic-ai\|api.voyageai.com" --include="*.ts" . \| grep -v node_modules \| grep -v lib/ai` → vacío | ✅ | Reverificado al cierre de la sesión — sin matches |
| `grep -rl "lib/supabase/admin" app components hooks services \| grep -v api/v1` → vacío | ⚠️ | Un match: `services/embedding.service.ts` — es un comentario del código que dice explícitamente que el archivo NO importa `admin.ts` ("archivo NO importa `lib/supabase/admin.ts` — se lo inyecta el caller"), no un `import` real. Falso positivo textual del grep (coincide con la cadena dentro de un comentario), no una violación de capas — confirmado leyendo el archivo. |
| `npm run lint`, `npm run type-check` y `npm run build` pasan | ✅ | Los tres limpios al cierre de la Fase 4.8, incluyendo `next build` (17 rutas, sin error) |

## Deuda técnica y limitaciones conocidas (nuevas de esta sesión)

1. **La sugerencia de ticket en modo soporte no es 100% consistente**
   (Fase 4.8, caso 5) — variabilidad del modelo sobre la misma
   instrucción de sistema, no un bug reproducible ni un problema de
   threshold. Sin dueño de sesión asignado.
2. **El threshold 0.4 se midió con 10 consultas de laboratorio, no con
   tráfico real** — sigue siendo una calibración acotada; si en el uso
   real entran consultas más variadas, podría necesitar otra vuelta de
   ajuste con el mismo mecanismo (log estructurado del endpoint +
   `docs/RAG.md`).
3. **Sin streaming.** La respuesta del chat se espera completa antes de
   mostrarse — alcance explícito de la spec, no una limitación técnica
   descubierta en el camino.
4. **La cuenta de Voyage de este laboratorio no tiene método de pago**
   (límite de 3 peticiones/minuto). Cualquier prueba interactiva que
   dispare varias búsquedas/consultas seguidas puede toparse con el
   límite; `scripts/index-all.ts` ya lo maneja solo, las pruebas
   manuales (`curl`, UI) a veces necesitan esperar ~20s y reintentar.

## Pendientes para la sesión 5 y heredados

- **Heredado de la sesión 1 (no ejecutada):** sigue sin `docs/COSTOS.md`
  ni `docs/PROMPTS.md` — sin cambios desde el cierre de la sesión 3.
- **Heredado de la sesión 2, Fases 2.6/2.7:** siguen completas
  (reconfirmado al cierre de esta sesión) — no son pendientes reales.
- **Vista `public_profiles`** (deuda técnica #1 de la sesión 3) — la
  sesión 4 no la necesitó: ni el chat ni "Mis tickets" muestran nombres
  de otros usuarios.
- **Trigger de reposición de stock al cancelar** (deuda técnica #2 de la
  sesión 3) — sin dueño de sesión asignado todavía.
- **Estado de pedido por vendedor/ítem** (deuda técnica #3 de la
  sesión 3) — sin dueño de sesión asignado todavía.
- **La sugerencia de ticket en modo soporte no es 100% consistente**
  (deuda técnica #1 de esta sesión, arriba).
- **Calibración de threshold con tráfico real, no solo de laboratorio**
  (deuda técnica #2 de esta sesión, arriba).
- **Agente de voz** — sesión 8, con `support_tickets`/`ticket_messages`
  (canal `voz` ya en el `check` constraint desde la sesión 2),
  `lib/voice/` reservado, y el botón de micrófono ya comentado en el
  layout de `/soporte`.
- **Crear tickets desde el chat** — explícitamente fuera de esta
  sesión, llega con el agente de voz de la sesión 8.

---

## Sesión 3 — Frontend (2026-08-22 a 2026-08-26, sin commits)

Construye toda la UI de comprador y vendedor sobre la infraestructura de
la sesión 2. Spec: [`MercadoTech_sesion3.md`](../MercadoTech_sesion3.md).
Fases ejecutadas: 3.1 a 3.8 (la spec no define una "Fase 3.0").

### Fase 3.1 — Tipos, tema visual y componentes base (2026-08-22)

**Construido:** `types/database.ts` (generado desde el esquema real) +
tipos de dominio (`types/{product,order,user,question,review}.ts`);
tokens de tema en `app/globals.css` (paleta clara/oscura, tipografía
Barlow/Barlow Condensed, radios) tomados de
`docs/design-reference/industry.css`; `lib/utils.ts` con
`formatPrice`/`getErrorMessage`; componentes base puros en
`components/shared/` (`Price`, `RatingStars`, `ConditionBadge`,
`ProductImage`, `EmptyState`, `ErrorState`, `LoadingState`, `Container`).

**Decisión:** `ProductImage` muestra un placeholder ante *cualquier*
fallo de carga (no solo `src === null`) porque el seed de la sesión 2 no
sube archivos reales a Storage — un 404 es el caso normal, no un error.

**Decisión:** `Price` acepta `number | string` porque PostgREST serializa
`numeric(12,2)` como `string` — la conversión ocurre en el service, nunca
en el componente (ver convención transversal en
[CLAUDE.md](../CLAUDE.md)).

**Fuera de alcance:** panel admin (solo existe el rol, para moderación
vía RLS — sin UI).

### Fase 3.2 — Layouts, navegación y mapa de rutas (2026-08-22)

**Construido:** los tres layouts (`app/(shop)/layout.tsx`,
`app/(seller)/layout.tsx`, `app/(auth)/layout.tsx`); `Navbar`,
`MobileNav`, `SellerSidebar` como componentes puros (sin fetching); el
mapa completo de 14 rutas, todas creadas como placeholder.

**Problema:** la spec original tenía `(shop)/pedidos` y `(seller)/pedidos`
resolviendo ambas a `/pedidos`, y `app/page.tsx` (el de `create-next-app`)
chocando con `app/(shop)/page.tsx` → error de build. **Resuelto:** panel
del vendedor bajo el prefijo `/vendedor/...` (`/vendedor/pedidos` en vez
de `/pedidos`), y se borró `app/page.tsx`.

**Decisión:** los componentes del navbar (`SearchBar`, `CategoriesMenu`,
`CartIndicator`, `UserMenu`) nacen puros, con valores estáticos
(`categories=[]`, `count=0`, `user=null`) — cada fase posterior los
conecta con su hook real, sin que el layout tenga que esperar a que todo
exista de una vez.

### Fase 3.3 — Autenticación (2026-08-24)

**Construido:** migración nueva `handle_new_user_metadata.sql`
(reemplaza el trigger de la sesión 2); `services/auth.service.ts`,
`hooks/useAuth.ts`; `/login`, `/register`; `middleware.ts` +
`lib/supabase/middleware.ts` (rutas protegidas); guard de rol en
`app/(seller)/layout.tsx`.

**Problema:** la spec original asumía que un usuario podía registrarse
como `seller`, pero el trigger de la sesión 2 fijaba `role='buyer'` a
todos, y otro trigger (`prevent_profile_role_self_change`) bloqueaba que
el propio usuario cambiara su rol después. **Resuelto:** migración nueva
que lee `role`/`display_name` desde `raw_user_meta_data` (lo que manda
`options.data` de `supabase.auth.signUp`) — es el único punto del ciclo
de vida donde el rol puede fijarse distinto de `buyer`.

**Problema:** el guard de rol en el panel del vendedor parpadeaba
(mostraba brevemente el sidebar de vendedor a un comprador) antes de que
`profile` terminara de cargar. **Resuelto:** se muestra `LoadingState`
mientras `initializing` es `true`, y recién después se decide redirigir o
mostrar el panel.

**Fuera de alcance:** confirmación de email (el Supabase local corre con
`enable_confirmations = false`); recuperación de contraseña.

### Fase 3.4 — Catálogo de productos (2026-08-24)

**Construido:** `services/product.service.ts`, `services/category.service.ts`,
`hooks/useProducts.ts`, `hooks/useCategories.ts`; `app/(shop)/_components/CatalogPage.tsx`
(compartido por `/`, `/buscar` y `/categoria/[slug]`); `FiltersPanel`,
`ProductGrid`, `Pagination`, `ProductCard`.

**Decisión:** filtros (condición, precio, orden) y paginación viven en la
URL (`useSearchParams`/`router.push`), no en estado de componente — hace
la búsqueda compartible/recargable y evita que cambiar de pestaña pierda
el filtro.

**Decisión:** búsqueda por texto (`ilike` sobre `title`/`brand`) es
"provisional hasta la búsqueda semántica de la sesión 4" — documentado
así en el propio código para que la sesión 4 sepa exactamente qué
reemplazar.

**Fuera de alcance:** búsqueda semántica, IA (sesión 4).

### Fase 3.5 — Detalle de producto, preguntas, reseñas y favoritos (2026-08-24)

**Construido:** `services/{question,review,favorite}.service.ts`,
`hooks/{useQuestions,useReviews,useFavorite,useFavorites,useProduct}.ts`;
`/producto/[id]` con `ProductGallery`, `ProductInfo`, `BuyBox`,
`QuestionsSection`, `ReviewsSection`; `/favoritos`.

**Decisión:** `/producto/[id]` es un Client Component completo (no un
Server Component `async`) — un Server Component que hace `await` antes de
devolver un árbol cliente deja cualquier `<Suspense>` trabado en este
proyecto (bug de streaming SSR de Turbopack, documentado a fondo en la
Fase 3.8 más abajo).

**Problema:** `profiles` solo es legible por su propio dueño o admin
(RLS de la sesión 2) — no hay forma de mostrar el nombre real de quien
pregunta o reseña. **Resuelto (documentado como limitación, no
arreglado):** se muestra "Usuario" / "Comprador verificado". Crear una
vista `public_profiles` estaba fuera de alcance de esta sesión.

**Fuera de alcance:** vista `public_profiles`.

### Fase 3.6 — Carrito, checkout simulado y mis pedidos (2026-08-26)

**Construido:** `services/{cart,order}.service.ts`, `hooks/{useCart,useOrders}.ts`;
`/carrito`, `/pedidos`, `/pedidos/[id]`; checkout llama al RPC
`create_order_from_cart` (función de la sesión 2) — el pago es
simulado, ningún dato de tarjeta se pide ni se guarda.

**Decisión:** cancelar un pedido (`cancelIfPending`) es un `update` plano
a `status='cancelado'` — no hay ningún trigger que reponga stock (decisión
explícita de la sesión 2: "NO crear trigger de reposición de stock").
Documentado en la UI del diálogo de cancelación ("El stock no se repone
automáticamente").

**Fuera de alcance:** pasarela de pagos real; reposición de stock al
cancelar.

### Fase 3.7 — Panel del vendedor con drag & drop (2026-08-26)

**Construido:** `services/seller.service.ts`, `hooks/{useSellerProducts,useSellerOrders,useProductForm}.ts`;
`/vendedor/productos`, `/vendedor/publicar`,
`/vendedor/productos/[id]/editar`, `/vendedor/pedidos`;
`SortableImageGallery` (reordenar imágenes) y `OrdersKanban` (mover
pedidos por estado) — ambos con `@dnd-kit`, `PointerSensor` +
`KeyboardSensor` y anuncios de accesibilidad en español.

**Decisión:** la validación de "un paso adelante" para el kanban vive en
`hooks/useSellerOrders.ts` (`move`), ANTES de llamar al service — una
transición inválida se rechaza con un toast, sin roundtrip a Supabase. La
RLS/trigger de la sesión 2 también la rechazaría, pero se valida primero
en el cliente para una respuesta inmediata.

**Problema:** el vendedor no puede poner un pedido en `cancelado` (RLS de
la sesión 2 solo permite que el vendedor avance a
`pagado`/`enviado`/`entregado`) — la columna "Cancelado" del kanban existe
mostrando pedidos cancelados por el comprador, pero es de solo lectura
(no acepta soltar tarjetas ahí).

**Problema:** borrar un producto con ventas falla
(`order_items.product_id` es `on delete restrict` en el esquema real,
no `set null` como podría sugerir la lectura superficial de la spec).
**Resuelto:** el diálogo de borrado muestra el error tal cual y sugiere
desactivar el producto en su lugar.

**Decisión:** el path de Storage exige `product_id`, así que no se puede
subir una imagen antes de que el producto exista — "Publicar" crea el
producto primero (sin imágenes) y el reordenamiento de imágenes es local
hasta el submit final.

**Fuera de alcance:** reposición de stock; cancelación por el vendedor.

### Fase 3.8 — Responsive, accesibilidad y estados (2026-08-26)

**Construido:** `docs/SESION3_CHECKLIST.md` (pasada completa de las 14
rutas × 7 criterios); `components/theme-provider.tsx` (wrapper de
`next-themes`, montado en `app/layout.tsx`).

**Problema (el más grave de la sesión):** las 3 rutas de catálogo
(`/`, `/buscar`, `/categoria/[slug]`) quedaban con la pantalla de carga
trabada para siempre en una carga dura (pestaña nueva o reload) —
intermitente, reproducido tanto en `next dev` como en el build de
producción (`next start`). Diagnosticado confirmando con un `console.log`
que el componente ni siquiera llegaba a ejecutarse del lado del cliente;
el HTML enviado por el servidor traía el contenido real, pero oculto
(`<template>`/`hidden` + un script `$RC(...)` que debía revelarlo y
nunca se aplicaba) — un bug real de streaming SSR de Turbopack disparado
por el `<Suspense>` que envolvía el componente cliente que usa
`useSearchParams()`. **Resuelto:** se quitó el `<Suspense>` (nunca hizo
falta — el componente ya maneja su propio estado de carga) y se marcaron
esas 3 páginas como `export const dynamic = "force-dynamic"`, porque sin
`<Suspense>` el propio `next build` falla duro con "useSearchParams()
should be wrapped in a suspense boundary" al intentar prerenderizarlas
como estáticas — cosa que de todos modos nunca podrían ser (dependen
100% de datos live). Verificado con múltiples cargas duras en `next dev`
y en `next start`.

**Problema:** `hooks/useAuth.ts` violaba la regla de capas (importaba
`@/lib/supabase/client` directo, para mantener una única instancia del
cliente y suscribirse a `onAuthStateChange`). **Resuelto:** la
suscripción se movió a `subscribeToAuthChange()` en
`services/auth.service.ts` (mismo patrón de cliente inyectable que el
resto del archivo); el hook ahora solo conoce `services/`.

**Problema:** el tema oscuro estaba completamente roto en las 14 rutas.
`next-themes` ya estaba instalado y `components/ui/sonner.tsx` ya llamaba
a `useTheme()` esperando un provider, y `globals.css` ya traía la paleta
`.dark` completa — pero nadie montaba `<ThemeProvider>`, así que la app
quedaba fija en claro sin importar el tema del sistema operativo.
**Resuelto:** se creó `components/theme-provider.tsx` y se montó en
`app/layout.tsx` con `attribute="class" defaultTheme="system"`.

**Decisión:** 3 `<Textarea>` (comentario de reseña, pregunta, respuesta
de vendedor) dependían solo del `placeholder` como nombre accesible —
válido pero frágil (desaparece al escribir). Se agregó `aria-label`
explícito a las tres, sin tocar el `placeholder` visible.

**Fuera de alcance:** re-verificación exhaustiva del drag & drop
(imágenes y kanban) con simulación real de teclado — se reutilizó la ya
hecha en la Fase 3.7 porque el código de esos dos componentes no cambió
en esta fase.

**Corrección adicional, fuera del alcance original de esta fase:**
`docs/ARQUITECTURA.md` (Fase 2.7, heredada pendiente de la sesión 2) se
completó al cierre de esta sesión, a pedido explícito — ver la sección de
la sesión 2 más abajo para qué cubre.

---

## Estado de los criterios de aceptación de la sesión

| Criterio | Estado | Evidencia |
|---|---|---|
| Flujo comprador completo (registro → explorar → filtrar → detalle → preguntar → carrito → checkout → ver pedido → cancelar) | ✅ | Cada tramo tiene su hook/service propio (Fases 3.3–3.6); recorrido en vivo en la Fase 3.8 (catálogo → detalle → carrito, mobile y desktop). |
| Flujo vendedor completo (registro → publicar con imágenes reordenadas → visible en catálogo → recibir pedido → mover por el kanban → comprador ve el nuevo estado al recargar) | ✅ | Fase 3.7 construye el flujo completo; recorrido en vivo en la Fase 3.8. |
| Reseña solo posible tras pedido `entregado` (UI y RLS) | ✅ | UI: `canReview.allowed` en `ReviewsSection`. RLS: policy `reviews_insert_verified_purchase` (sesión 2), sin cambios en la 3. |
| Transiciones inválidas del kanban rechazadas en el hook sin llegar al service | ✅ | `hooks/useSellerOrders.ts` (`move`) valida con `canMove()` antes de llamar a `updateOrderStatus`. |
| `npm run lint`, `npm run type-check` y `npm run build` pasan | ✅ | Evidencia completa en `docs/SESION3_CHECKLIST.md`. `next build` genera las 12 páginas sin error (exit 0). |
| `grep -rl "@/lib/supabase" components hooks` devuelve vacío | ✅ | Vacío desde la corrección de `useAuth.ts` en la Fase 3.8. |

## Deuda técnica y limitaciones conocidas

Todas vigentes en el código actual (no son ideas, son comportamiento real
verificado):

1. **Nombres de otros usuarios no legibles.** `profiles` solo es legible
   por su propio dueño o un admin (`profiles_select_own_or_admin`,
   sesión 2). Preguntas y reseñas muestran "Usuario"/"Comprador
   verificado" en vez del nombre real. Arreglo futuro: una vista
   `public_profiles` (expuesta solo `display_name`), explícitamente fuera
   de alcance de la sesión 2 y no revisitada en la 3.
2. **Cancelar un pedido no repone stock.** `cancelIfPending` es un
   `update` plano; no existe trigger de reposición (decisión de la
   sesión 2). Documentado en el diálogo de cancelación de
   `/pedidos/[id]`.
3. **Pedidos multi-vendedor comparten un único `status`.** Un pedido
   puede tener ítems de varios vendedores (`order_items.seller_id`
   varía dentro del mismo `order_id` — ver seed, pedido
   `c0000000-...-003`). Cada vendedor ve en su kanban solo sus propios
   ítems, pero `orders.status` es una sola columna: **cualquiera** de los
   vendedores involucrados puede avanzar el estado del pedido completo, lo
   que afecta lo que ven el comprador y los demás vendedores. No hay un
   estado por vendedor/ítem — detectado durante la Fase 3.8, no estaba
   documentado explícitamente antes.
4. **Sin Supabase Realtime.** Decisión explícita de las sesiones 2 y 3
   ("Sin realtime" en Restricciones). El kanban y el catálogo se
   actualizan por recarga/refetch manual, nunca por suscripción — un
   vendedor no ve un pedido nuevo hasta que recarga `/vendedor/pedidos`.
5. **Un admin no puede moderar productos ajenos.** Sin policy de
   `update`/`delete` de admin sobre `products` (gap señalado en el propio
   `supabase/policies.sql`, sesión 2 — nunca hubo UI de moderación en la
   sesión 3 de todos modos).
6. **Checkout y pagos son 100% simulados.** `create_order_from_cart` no
   integra ninguna pasarela real; `CartSummary` lo deja explícito en la
   UI ("Pago simulado para el laboratorio — no se realiza ningún cobro").
7. **Búsqueda por texto es `ilike` simple**, sin normalización de
   términos ni ranking — documentado en el propio código como
   "provisional hasta la búsqueda semántica de la sesión 4".

## Pendientes para la sesión 4 y heredados

- **Heredado de la sesión 1 (no ejecutada):** no existen `docs/COSTOS.md`
  ni `docs/PROMPTS.md`. Si la sesión 1 es prerrequisito formal del curso,
  sigue sin completarse — no se reconstruye acá porque no dejó ningún
  artefacto en el repo del que partir.
- **Heredado de la sesión 2, Fase 2.7 (`docs/ARQUITECTURA.md`):**
  **completado** al cierre de la sesión 3 (ver arriba) — ya no es un
  pendiente.
- **Heredado de la sesión 2, Fase 2.6 (`supabase/tests/`):** ya estaba
  completo antes de empezar la sesión 3 (`supabase/tests/rls-validation.sql`,
  9 escenarios mínimos de la spec + escenarios adicionales) — no era un
  pendiente real, solo faltaba confirmarlo.
- **Vista `public_profiles`** (deuda técnica #1) — la sesión 4 podría
  necesitarla si el soporte con IA muestra menciones de usuarios.
- **Trigger de reposición de stock al cancelar** (deuda técnica #2) — sin
  dueño de sesión asignado todavía.
- **Estado de pedido por vendedor/ítem** (deuda técnica #3) — sin dueño
  de sesión asignado; requeriría repensar el modelo de `orders.status`
  (¿mover a `order_items` o a una tabla de estados por vendedor?).
- **Búsqueda semántica / RAG de soporte** — es el objetivo central de la
  sesión 4, ya con `support_articles` listo (RLS de la sesión 2) y
  `lib/ai/` reservado (carpeta vacía desde la sesión 2/3).
- **Agente de voz** — sesión 8, con `support_tickets`/`ticket_messages`
  (canal `voz` ya en el `check` constraint) y `lib/voice/` reservado.

---

## Sesión 2 — Arquitectura escalable y backend con Supabase (reconstruida a partir de archivos, 2026-08-21 a 2026-08-22)

**Esta sección está reconstruida** a partir del estado actual del repo
(migraciones, `seed.sql`, `supabase/tests/`) — no hay commits ni ningún
otro registro de la sesión 2 en sí. Spec:
[`MercadoTech_sesion2.md`](../MercadoTech_sesion2.md).

**Fase 2.1 — Estructura del proyecto.** Proyecto Next.js 15 (App Router,
Turbopack) + TypeScript estricto + Tailwind v4 scaffolded; estructura de
carpetas completa (`app/`, `components/`, `hooks/`, `services/`, `lib/`,
`types/`) creada vacía con `.gitkeep`; los 4 clientes de Supabase en
`lib/supabase/`.

**Fase 2.2 — Esquema y migraciones.** 20 migraciones
(`supabase/migrations/20260821*.sql`) crean las 14 tablas de dominio +
`profiles` + la función `create_order_from_cart`. Ver
[`docs/ARQUITECTURA.md`](ARQUITECTURA.md) para el modelo relacional
completo y las decisiones de diseño (snapshots, `seller_id`
denormalizado, checkout transaccional).

**Fase 2.3 — Políticas RLS.** Una migración dedicada
(`20260821110000_create_rls_policies.sql`) con funciones helper
(`is_admin`, `is_seller`, `order_has_seller_item`, `order_buyer_is`),
triggers de validación de transición de estado
(`validate_order_status_transition`, `validate_support_ticket_update`,
`prevent_profile_role_self_change`) y las policies de las 14 tablas. Ver
la tabla completa en `docs/ARQUITECTURA.md`.

**Fase 2.4 — Storage.** Buckets `product-images` y `avatars` (públicos,
5 MB máx., solo JPEG/PNG/WEBP), con policies de lectura pública y
escritura restringida a la carpeta `{auth.uid()}/...` del propio usuario.

**Fase 2.5 — Seed.** `supabase/seed.sql` con usuarios de prueba
(compradores, vendedores, admin — contraseña `MercadoTech123!` para
todos), categorías, productos, y al menos un pedido multi-vendedor
(`c0000000-...-003`, relevante para la deuda técnica #3 de la sesión 3).

**Fase 2.6 — Validación de RLS.** `supabase/tests/rls-validation.sql`
(532 líneas): los 9 escenarios mínimos de la spec (anónimo, comprador,
vendedor, admin, checkout con carrito vacío/stock insuficiente) más
escenarios adicionales derivados de leer las policies reales.

**Fase 2.7 — Documentación técnica.** Pendiente al cierre original de la
sesión 2 (no existía `docs/ARQUITECTURA.md`). **Completada recién al
cierre de la sesión 3** — ver la entrada correspondiente arriba y el
propio [`docs/ARQUITECTURA.md`](ARQUITECTURA.md).

---

## Sesión 1 — No ejecutada

No hay evidencia en el repo de que la sesión 1 se haya ejecutado: no
existen `docs/COSTOS.md` ni `docs/PROMPTS.md`, y no hay ningún otro
artefacto identificable como suyo. No se reconstruye una sección más
detallada porque no hay nada del repo de lo que partir — a diferencia de
la sesión 2, cuyo trabajo sí quedó en migraciones y seed aunque nunca se
haya commiteado.
