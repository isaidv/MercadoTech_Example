# Bitácora — MercadoTech

Bitácora acumulativa del proyecto, una sección por sesión, **la más
reciente primero**. Está pensada para que alguien que no estuvo en la
sesión entienda qué se construyó, por qué, y qué quedó pendiente, sin
tener que leer el código entero.

**Nota sobre las fechas de este documento:** el repositorio no tiene
ningún commit (`git log --oneline --all` sigue vacío al cierre de la
sesión 4 — se reverificó con `git rev-list --all --count` → `0`). No hay
forma de tomar fechas u hashes de commit reales, en ninguna sesión. Las
fechas de las sesiones 3 y 4 están tomadas de la fecha de modificación de
archivos representativos de cada fase (no inventadas, pero sí
aproximadas — varias fases construidas en la misma sesión de trabajo
pueden compartir fecha). Las secciones de las sesiones 1 y 2 están
marcadas explícitamente como **reconstruidas** a partir del estado del
repo, no de un historial real.

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
