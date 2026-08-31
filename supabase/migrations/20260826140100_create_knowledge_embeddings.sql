-- ============================================================
-- FASE 4.1 — knowledge_embeddings: el "fichero" del bibliotecario (ver
-- MercadoTech_sesion4.md, analogía completa en "Qué vas a construir").
-- ============================================================
--
-- UNA tabla para las dos fuentes que esta sesión indexa (products y
-- support_articles), discriminada por source_type — no dos tablas
-- gemelas: el patrón de búsqueda es idéntico para ambas (un solo índice
-- HNSW, una sola función de matching), y si mañana se agrega una fuente
-- nueva (ej. reviews, mencionado en la propia spec) el patrón es otra fila
-- de source_type, no otra tabla+índice+función duplicados.
create table public.knowledge_embeddings (
  id           uuid primary key default gen_random_uuid(),
  source_type  text not null
                 check (source_type in ('producto', 'articulo_soporte')),
  -- SUPUESTO: source_id SIN foreign key. Apunta a `products.id` o a
  -- `support_articles.id` según source_type — dos tablas origen
  -- distintas, y Postgres no permite una FK condicional a "una de dos
  -- tablas". Consecuencia: borrar un producto o un artículo puede dejar
  -- una ficha huérfana (source_id que ya no existe del lado de origen).
  -- `services/vector-search.service.ts` (Fase 4.4) descarta huérfanos al
  -- hidratar contra `products`, y `app/api/v1/reindex` (Fase 4.3) borra
  -- la ficha explícitamente cuando la fuente ya no existe.
  source_id    uuid not null,
  -- Preparado para chunking futuro (dividir un texto largo en varios
  -- fragmentos fichados por separado). Esta sesión ficha cada fuente
  -- completa como un solo chunk: siempre 0.
  chunk_index  integer not null default 0,
  content      text not null,
  -- Dimensión 1024 porque el proveedor de embeddings es Voyage AI
  -- (voyage-4-lite — ver "Guía Claude + Voyage", lección 6, en
  -- MercadoTech_sesion4.md). Cambiar de modelo de embeddings a uno con
  -- otra dimensión exige `alter column embedding type vector(N)` +
  -- recrear el índice HNSW de abajo + recrear `match_knowledge` (su
  -- firma también fija vector(1024)) — no alcanza con cambiar una
  -- constante de la app (`EMBEDDING_DIMENSIONS` en lib/constants/ai.ts).
  embedding    vector(1024) not null,
  -- Título, categoría, precio, etc. — lo que la Fase 4.7 necesita para
  -- mostrar la fuente citada sin otra consulta a products/support_articles.
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  unique (source_type, source_id, chunk_index)
);

-- Índice HNSW con vector_cosine_ops: coincide con el operador `<=>`
-- (distancia coseno) que usa match_knowledge más abajo. Los vectores de
-- Voyage vienen normalizados a longitud 1, así que coseno y producto
-- punto son equivalentes — se elige coseno por ser el más explícito de
-- los dos para quien lea esta migración después.
create index knowledge_embeddings_embedding_idx
  on public.knowledge_embeddings
  using hnsw (embedding vector_cosine_ops);

-- Sin índice adicional para buscar por (source_type, source_id): el propio
-- `unique (source_type, source_id, chunk_index)` de arriba ya crea ese
-- índice btree como parte de su restricción — el reindexado/limpieza de
-- huérfanos (Fase 4.3) lo reutiliza gratis; duplicarlo sería redundante.

alter table public.knowledge_embeddings enable row level security;
-- Las políticas de RLS y los GRANTs se agregan en
-- 20260826140300_knowledge_embeddings_rls.sql — mismo patrón que la
-- sesión 2 (Fase 2.2/2.3): cada tabla habilita RLS en su propia
-- migración de creación; las policies llegan en una migración dedicada.
