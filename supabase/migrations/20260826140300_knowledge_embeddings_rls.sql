-- FASE 4.1 — Políticas RLS y GRANTs de knowledge_embeddings.
--
-- Decisión 1 de MercadoTech_sesion4.md: la IA exige sesión iniciada — cada
-- consulta a Claude cuesta dinero real, así que ni siquiera SELECT es
-- público acá (a diferencia de products/questions/reviews, sesión 2, que
-- sí son legibles por anon).
create policy "knowledge_embeddings_select_authenticated" on public.knowledge_embeddings
  for select
  using (true);
-- `using (true)`: cualquier fila es visible para cualquier `authenticated`
-- — no hay dueño por usuario acá (es contenido del catálogo/FAQ, no datos
-- personales). El filtrado real que sí importa (productos inactivos,
-- fichas huérfanas) lo hace `vector-search.service.ts` al hidratar contra
-- `products` (Fase 4.4), no esta policy.

-- Sin policies de INSERT/UPDATE/DELETE a propósito: ningún `authenticated`
-- escribe esta tabla directamente. Las fichas las escribe ÚNICAMENTE
-- `lib/supabase/admin.ts` (service role, bypasea RLS) desde
-- `embedding.service.ts`, invocado solo desde Route Handlers (ej.
-- `app/api/v1/reindex`) y `scripts/index-all.ts` — nunca desde el
-- navegador (Fases 4.2/4.3).

-- RLS habilitado + sin GRANT = error opaco (mismo criterio que
-- supabase/policies.sql, sección "GRANTs de la Data API" de la sesión 2):
-- se otorga explícito solo lo que tiene policy para ese rol.
grant select on public.knowledge_embeddings to authenticated;
-- Sin GRANT de insert/update/delete a authenticated ni a anon: coherente
-- con "sin policy" de arriba — refuerza a nivel de permiso, no solo de
-- policy, que la única vía de escritura es el service role (que de
-- cualquier forma bypasea GRANTs y RLS por igual al usar la clave
-- completa, así que no necesita ningún GRANT explícito aquí).
