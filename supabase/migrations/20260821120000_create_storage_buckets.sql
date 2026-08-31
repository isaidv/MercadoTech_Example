-- Fase 2.4 — Storage: buckets y políticas.
--
-- NOTA: a diferencia del esquema `public` (Fase 2.3), storage.objects y
-- storage.buckets ya traen RLS habilitado y GRANTs completos para `anon` y
-- `authenticated` desde el bootstrap de la plataforma Supabase — se
-- verificó contra la instancia local antes de escribir esta migración. Acá
-- solo hacen falta las policies; no se agregan GRANTs redundantes.
--
-- Convención de paths (spec, obligatoria):
--   product-images/{seller_id}/{product_id}/{n}.{ext}
--   avatars/{user_id}/...
-- storage.foldername(name) descompone el path en segmentos (sin el bucket
-- ni el nombre de archivo); el primer segmento es siempre el uuid del
-- dueño, así que basta compararlo contra (select auth.uid())::text.


-- ============================================================
-- 1. Buckets
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
-- 5242880 bytes = 5 MiB. file_size_limit y allowed_mime_types los aplica el
-- propio Storage API en el upload (antes de que la policy de INSERT
-- siquiera se evalúe) — no hace falta duplicarlos en la policy.


-- ============================================================
-- 2. product-images — lectura pública, escritura del vendedor dueño
-- ============================================================

create policy "product_images_bucket_public_read" on storage.objects
  for select
  using (bucket_id = 'product-images');

create policy "product_images_bucket_insert_own_folder" on storage.objects
  for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "product_images_bucket_delete_own_folder" on storage.objects
  for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Sin policy de UPDATE a propósito: el flujo del vendedor es subir/borrar
-- (la sesión 3 reemplaza una imagen borrando la vieja y subiendo una
-- nueva, o reordena solo la columna product_images.position en `public`,
-- que no toca storage.objects) — no hay caso de uso para sobrescribir el
-- contenido de un objeto ya subido.


-- ============================================================
-- 3. avatars — lectura pública, escritura del dueño
-- ============================================================

create policy "avatars_bucket_public_read" on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "avatars_bucket_insert_own_folder" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_bucket_delete_own_folder" on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Mismo criterio: sin UPDATE. Cambiar de avatar es borrar el objeto viejo y
-- subir uno nuevo (más simple de razonar en RLS que permitir sobrescribir
-- el mismo path, y evita servir contenido cacheado desactualizado bajo la
-- misma URL).
