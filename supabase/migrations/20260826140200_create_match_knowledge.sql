-- FASE 4.1 — match_knowledge: dado el embedding de una pregunta, devuelve
-- las fichas más parecidas por significado (similitud coseno).
--
-- SECURITY INVOKER (el default de Postgres, declarado explícito para que
-- quede documentada la decisión) — a diferencia de `create_order_from_cart`
-- (20260821101700_create_checkout_function.sql, SECURITY DEFINER), que
-- necesita ESCRIBIR en cart_items/orders/products sin que el caller tenga
-- privilegio de INSERT en esas tablas, esta función solo LEE
-- knowledge_embeddings — una tabla donde `authenticated` ya tiene SELECT
-- vía policy (20260826140300_knowledge_embeddings_rls.sql). No hace falta
-- saltarse RLS acá: al contrario, DEBE respetar la visibilidad del caller
-- (si el día de mañana knowledge_embeddings tuviera filas visibles solo
-- para ciertos usuarios, SECURITY DEFINER se las expondría a todos por
-- igual, rompiendo esa regla en silencio).
create or replace function public.match_knowledge(
  query_embedding vector(1024),
  p_source_type text,
  match_count int,
  similarity_threshold float
)
returns table (
  source_type text,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
security invoker
-- `public` primero (donde vive knowledge_embeddings), `extensions` después
-- (donde pgvector instaló el tipo `vector` y sus operadores, `<=>`
-- incluido — 20260826140000_enable_pgvector.sql). Lista fija de dos
-- esquemas, no el search_path de la sesión del caller: mismo blindaje
-- contra "search_path hijacking" que usan is_admin()/create_order_from_cart
-- (policies.sql), extendido con extensions porque, a diferencia de esas
-- funciones, esta SÍ necesita resolver un operador que vive ahí — sin
-- extensions acá, `<=>` no resuelve dentro del cuerpo de la función aunque
-- la tabla se haya creado bien (el search_path por defecto de la sesión de
-- migración sí incluye extensions; el de esta función, fijado, no).
set search_path = public, extensions
as $$
  select
    ke.source_type,
    ke.source_id,
    ke.content,
    ke.metadata,
    -- Los vectores de Voyage vienen normalizados a longitud 1: `<=>` es
    -- distancia coseno (0 = idéntico), así que `1 - distancia` da la
    -- similitud coseno en el rango que describe el glosario de la spec
    -- (~-1 a 1, 1 = idéntico significado).
    1 - (ke.embedding <=> query_embedding) as similarity
  from public.knowledge_embeddings ke
  where (p_source_type is null or ke.source_type = p_source_type)
    and 1 - (ke.embedding <=> query_embedding) >= similarity_threshold
  order by ke.embedding <=> query_embedding
  limit match_count;
$$;

-- Mismo criterio que create_order_from_cart: Postgres otorga EXECUTE a
-- PUBLIC en toda función nueva por defecto. Se revoca explícito y se
-- re-otorga solo a authenticated — decisión 1 de la spec (la IA exige
-- sesión): un anon nunca debería poder invocar esta función, ni siquiera
-- para recibir 0 filas por RLS.
revoke execute on function public.match_knowledge(vector, text, int, float) from public;
revoke execute on function public.match_knowledge(vector, text, int, float) from anon;
grant execute on function public.match_knowledge(vector, text, int, float) to authenticated;
