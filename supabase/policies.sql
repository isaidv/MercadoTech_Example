-- supabase/policies.sql
--
-- COPIA DE REFERENCIA, NO ES LA FUENTE DE VERDAD.
-- La fuente de verdad es supabase/migrations/20260821110000_create_rls_policies.sql.
-- Este archivo es una copia literal para lectura rápida de las políticas RLS
-- sin tener que abrir la migración completa. Si difieren, gana la migración.
--
-- Fase 2.3 — Políticas RLS.
--
-- Una única migración "dedicada" (así lo pide la spec) que cubre: funciones
-- helper, triggers de validación de reglas de negocio que RLS no puede
-- expresar por sí sola (transiciones de estado, columnas protegidas), las
-- policies de las 14 tablas, y los GRANTs de la Data API.
--
-- Convención en TODA esta migración: siempre `(select auth.uid())`, nunca
-- `auth.uid()` a secas — envolver la llamada en un `select` la vuelve un
-- InitPlan que Postgres evalúa una sola vez por query, no una vez por fila.


-- ============================================================
-- 1. Funciones helper (SECURITY DEFINER, search_path fijo)
-- ============================================================
--
-- SECURITY DEFINER es necesario aquí, y no un simple `stable` normal, porque
-- is_admin()/is_seller() se llaman DESDE políticas de otras tablas (y desde
-- la propia policy de SELECT de profiles). Si la subquery a profiles
-- corriera con los privilegios del caller, dispararía de nuevo la RLS de
-- profiles al evaluarse — con SECURITY DEFINER, la función corre con los
-- privilegios de quien la definió y lee profiles sin pasar por su RLS,
-- rompiendo cualquier recursión.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- SUPUESTO: no pedido explícitamente por la spec (solo pide is_admin()),
-- pero products.INSERT necesita verificar role = 'seller' y aplica la misma
-- razón ("nunca subconsultas repetidas a profiles en caliente") — mismo
-- patrón, por simetría y performance.
create or replace function public.is_seller()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'seller'
  );
$$;

-- Rompen el ciclo de recursión RLS entre orders <-> order_items (ver nota
-- extensa en la sección 7, ORDERS). Ambas son SECURITY DEFINER: al
-- consultar la tabla "del otro lado" bypasean su RLS, en vez de disparar de
-- nuevo sus políticas — el mismo mecanismo que ya usa is_admin() sobre
-- profiles, aplicado aquí para cortar una recursión de dos tablas en vez de
-- una tabla consultándose a sí misma.
create or replace function public.order_has_seller_item(p_order_id uuid, p_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.order_items oi
    where oi.order_id = p_order_id and oi.seller_id = p_seller_id
  );
$$;

create or replace function public.order_buyer_is(p_order_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.buyer_id = p_user_id
  );
$$;


-- ============================================================
-- 2. PROFILES
-- ============================================================

-- SUPUESTO/RESOLUCIÓN: la spec da UPDATE a "solo dueño" (sin admin). Tomado
-- literal, un cambio de rol (buyer -> seller, promoción a admin) no puede
-- pasar por la Data API en absoluto — ni el dueño (bloqueado abajo) ni un
-- admin (sin policy de UPDATE). Queda como operación de backend con
-- lib/supabase/admin.ts (service_role, bypasea RLS y este trigger),
-- consistente con la advertencia que ya lleva ese archivo. El trigger deja
-- una puerta a is_admin() por si en el futuro se agrega una policy de
-- UPDATE para admin — hoy no es alcanzable vía RLS, pero no está de más.
create or replace function public.prevent_profile_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.role() <> 'service_role'
     and not public.is_admin() then
    raise exception 'No puedes cambiar tu propio rol';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_self_change on public.profiles;
create trigger prevent_profile_role_self_change
  before update on public.profiles
  for each row
  execute function public.prevent_profile_role_self_change();

-- Cada quien ve su propio profile; un admin ve todos (moderación/soporte).
create policy "profiles_select_own_or_admin" on public.profiles
  for select
  using ((select auth.uid()) = id or public.is_admin());

-- Sin policy de INSERT: la fila la crea únicamente el trigger
-- handle_new_user (SECURITY DEFINER, bypasea RLS). Ningún cliente inserta
-- un profile directamente.

-- Cada quien edita su propio profile (el trigger de arriba impide tocar role).
create policy "profiles_update_own" on public.profiles
  for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sin policy de DELETE: un profile solo desaparece por el ON DELETE CASCADE
-- desde auth.users (borrar la cuenta), nunca por un DELETE directo a la tabla.


-- ============================================================
-- 3. CATEGORIES
-- ============================================================

-- Público total, incluido anon: el catálogo de categorías es parte de la
-- navegación anónima del marketplace.
create policy "categories_select_all" on public.categories
  for select
  using (true);

create policy "categories_insert_admin" on public.categories
  for insert
  with check (public.is_admin());

create policy "categories_update_admin" on public.categories
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_delete_admin" on public.categories
  for delete
  using (public.is_admin());


-- ============================================================
-- 4. PRODUCTS
-- ============================================================
--
-- SUPUESTO/RESOLUCIÓN: la spec no menciona admin en ninguna operación de
-- products (a diferencia de otras tablas). Se implementa literal: un admin
-- NO puede moderar productos ajenos en esta fase. Gap conocido, no resuelto
-- aquí porque no está pedido — señalado, no inventado.

-- Público ve productos activos; el vendedor ve también los suyos inactivos.
create policy "products_select_active_or_own" on public.products
  for select
  using (is_active or (select auth.uid()) = seller_id);

-- Solo un usuario con rol 'seller' puede crear productos, y únicamente a su
-- propio nombre (no se puede crear un producto para otro seller_id).
create policy "products_insert_own_if_seller" on public.products
  for insert
  with check ((select auth.uid()) = seller_id and public.is_seller());

create policy "products_update_own" on public.products
  for update
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

create policy "products_delete_own" on public.products
  for delete
  using ((select auth.uid()) = seller_id);


-- ============================================================
-- 5. PRODUCT_IMAGES
-- ============================================================

-- Mismas condiciones de visibilidad que el producto padre.
create policy "product_images_select_visible_product" on public.product_images
  for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.is_active or p.seller_id = (select auth.uid()))
    )
  );

create policy "product_images_insert_own_product" on public.product_images
  for insert
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.seller_id = (select auth.uid())
    )
  );

create policy "product_images_update_own_product" on public.product_images
  for update
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.seller_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.seller_id = (select auth.uid())
    )
  );

create policy "product_images_delete_own_product" on public.product_images
  for delete
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.seller_id = (select auth.uid())
    )
  );


-- ============================================================
-- 6. CART_ITEMS
-- ============================================================

create policy "cart_items_select_own" on public.cart_items
  for select
  using ((select auth.uid()) = user_id);

create policy "cart_items_insert_own" on public.cart_items
  for insert
  with check ((select auth.uid()) = user_id);

create policy "cart_items_update_own" on public.cart_items
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cart_items_delete_own" on public.cart_items
  for delete
  using ((select auth.uid()) = user_id);


-- ============================================================
-- 7. ORDERS
-- ============================================================
--
-- RESOLUCIÓN (ambigüedad #3): una policy de UPDATE en Postgres no puede
-- comparar el status viejo contra el nuevo en una sola expresión limpia
-- (USING ve la fila vieja, WITH CHECK ve la fila nueva, pero no hay forma
-- directa de correlacionar ambas dentro de la sintaxis de policy). Se
-- separa la responsabilidad: las policies de abajo solo autorizan QUIÉN
-- puede tocar la fila (dueño / vendedor con ítems); este trigger valida la
-- transición en sí (comprador: cancelar solo desde 'pendiente'; vendedor:
-- avanzar sin retroceder ni reabrir un pedido cerrado).
--
-- NOTA — recursión RLS orders <-> order_items: la policy de SELECT de
-- orders necesita saber "¿tengo ítems en este pedido?" (consultando
-- order_items), y la policy de SELECT de order_items necesita saber "¿soy
-- el comprador de este pedido?" (consultando orders). Escritas como EXISTS
-- directos contra la tabla del otro lado, cada una dispara la política de
-- la otra, que vuelve a disparar la primera: "infinite recursion detected
-- in policy for relation orders" (se reprodujo y confirmó en pruebas antes
-- de este fix). Por eso ambas usan order_has_seller_item()/order_buyer_is()
-- (SECURITY DEFINER) en vez de un EXISTS inline.
create or replace function public.validate_order_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_rank int;
  v_new_rank int;
  v_is_seller_of_order boolean;
begin
  -- Backend/administración vía service_role: sin restricciones de estado.
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  -- Cancelación (ruta del comprador): solo desde 'pendiente'.
  if new.status = 'cancelado' then
    if old.status <> 'pendiente' then
      raise exception 'Solo se puede cancelar un pedido en estado "pendiente" (actual: %)', old.status;
    end if;
    if (select auth.uid()) is distinct from old.buyer_id then
      raise exception 'Solo el comprador puede cancelar su propio pedido';
    end if;
    return new;
  end if;

  -- Avance (ruta del vendedor): pendiente -> pagado -> enviado -> entregado,
  -- estrictamente hacia adelante, nunca reabriendo un pedido cancelado.
  v_old_rank := case old.status
    when 'pendiente' then 0 when 'pagado' then 1 when 'enviado' then 2 when 'entregado' then 3
    else -1 end;
  v_new_rank := case new.status
    when 'pendiente' then 0 when 'pagado' then 1 when 'enviado' then 2 when 'entregado' then 3
    else -1 end;

  if v_old_rank = -1 or v_new_rank = -1 or v_new_rank <= v_old_rank then
    raise exception 'Transición de estado inválida: % -> %', old.status, new.status;
  end if;

  select exists (
    select 1 from public.order_items oi
    where oi.order_id = old.id and oi.seller_id = (select auth.uid())
  ) into v_is_seller_of_order;

  if not v_is_seller_of_order then
    raise exception 'Solo un vendedor con ítems en el pedido puede avanzar su estado';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_order_status_transition on public.orders;
create trigger validate_order_status_transition
  before update of status on public.orders
  for each row
  execute function public.validate_order_status_transition();

-- El comprador ve su pedido; el vendedor ve pedidos donde tiene ítems; admin ve todo.
create policy "orders_select_buyer_seller_or_admin" on public.orders
  for select
  using (
    (select auth.uid()) = buyer_id
    or public.order_has_seller_item(orders.id, (select auth.uid()))
    or public.is_admin()
  );

-- Sin policy de INSERT a propósito: la única vía es create_order_from_cart()
-- (SECURITY DEFINER, bypasea RLS). No se otorga INSERT ni siquiera a
-- authenticated (ver GRANTs) — doble candado: ni el permiso de tabla ni la
-- policy lo permiten.

-- Autorización de QUIÉN puede tocar la fila; el trigger de arriba valida el
-- QUÉ (la transición concreta).
create policy "orders_update_buyer" on public.orders
  for update
  using ((select auth.uid()) = buyer_id)
  with check ((select auth.uid()) = buyer_id);

create policy "orders_update_seller_with_items" on public.orders
  for update
  using (public.order_has_seller_item(orders.id, (select auth.uid())))
  with check (public.order_has_seller_item(orders.id, (select auth.uid())));

-- Sin policy de DELETE: la spec no define una (los pedidos no se borran,
-- solo se cancelan).


-- ============================================================
-- 8. ORDER_ITEMS
-- ============================================================

create policy "order_items_select_buyer_seller_or_admin" on public.order_items
  for select
  using (
    public.order_buyer_is(order_items.order_id, (select auth.uid()))
    or seller_id = (select auth.uid())
    or public.is_admin()
  );

-- Sin policies de INSERT/UPDATE/DELETE: order_items es un snapshot histórico
-- inmutable. Se crea únicamente dentro de create_order_from_cart() (mismo
-- SECURITY DEFINER que crea el order) y nunca se modifica ni se borra desde
-- la Data API.


-- ============================================================
-- 9. QUESTIONS
-- ============================================================

-- Público total: son parte de la ficha pública del producto.
create policy "questions_select_all" on public.questions
  for select
  using (true);

-- Cualquier usuario autenticado puede preguntar, a su propio nombre, y sin
-- venir pre-respondida (answer solo lo escribe el vendedor via UPDATE).
create policy "questions_insert_own" on public.questions
  for insert
  with check (
    (select auth.uid()) = user_id
    and answer is null
    and answered_at is null
  );

-- Solo el vendedor dueño del producto puede escribir la respuesta. (La
-- policy autoriza la fila; que el payload solo toque answer/answered_at es
-- disciplina de la capa services/, no se fuerza con un trigger adicional —
-- a diferencia de orders/support_tickets, la spec no lo describe como una
-- máquina de estados.)
create policy "questions_update_answer_by_product_owner" on public.questions
  for update
  using (
    exists (
      select 1 from public.products p
      where p.id = questions.product_id and p.seller_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = questions.product_id and p.seller_id = (select auth.uid())
    )
  );

create policy "questions_delete_author_or_admin" on public.questions
  for delete
  using ((select auth.uid()) = user_id or public.is_admin());


-- ============================================================
-- 10. REVIEWS
-- ============================================================

create policy "reviews_select_all" on public.reviews
  for select
  using (true);

-- Reseña verificada: exige un pedido 'entregado', del propio comprador, que
-- contenga el producto reseñado.
create policy "reviews_insert_verified_purchase" on public.reviews
  for insert
  with check (
    (select auth.uid()) = buyer_id
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.id = reviews.order_id
        and o.buyer_id = (select auth.uid())
        and o.status = 'entregado'
        and oi.product_id = reviews.product_id
    )
  );

-- El autor puede editar su reseña; se revalida la misma condición de compra
-- verificada por si el estado del pedido cambiara después de publicada.
create policy "reviews_update_own" on public.reviews
  for update
  using ((select auth.uid()) = buyer_id)
  with check (
    (select auth.uid()) = buyer_id
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.id = reviews.order_id
        and o.buyer_id = (select auth.uid())
        and o.status = 'entregado'
        and oi.product_id = reviews.product_id
    )
  );

create policy "reviews_delete_author_or_admin" on public.reviews
  for delete
  using ((select auth.uid()) = buyer_id or public.is_admin());


-- ============================================================
-- 11. FAVORITES
-- ============================================================

create policy "favorites_select_own" on public.favorites
  for select
  using ((select auth.uid()) = user_id);

create policy "favorites_insert_own" on public.favorites
  for insert
  with check ((select auth.uid()) = user_id);

-- Sin policy de UPDATE: favorites es un toggle (insert/delete), nunca se
-- edita una fila existente.

create policy "favorites_delete_own" on public.favorites
  for delete
  using ((select auth.uid()) = user_id);


-- ============================================================
-- 12. PRODUCT_VIEWS
-- ============================================================

create policy "product_views_select_owner_seller_or_admin" on public.product_views
  for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_views.product_id and p.seller_id = (select auth.uid())
    )
    or public.is_admin()
  );

create policy "product_views_insert_own" on public.product_views
  for insert
  with check ((select auth.uid()) = user_id);

-- Sin UPDATE/DELETE: cada vista es un evento inmutable, append-only.


-- ============================================================
-- 13. SUPPORT_ARTICLES
-- ============================================================
--
-- RESOLUCIÓN (ambigüedad #4): se agrega is_admin() a la condición de SELECT
-- (la spec solo dice "todos si is_published") porque, si no, un admin no
-- podría ni leer un borrador (is_published = false) para editarlo desde un
-- futuro panel — su propio permiso de UPDATE/DELETE quedaría inoperable.
create policy "support_articles_select_published_or_admin" on public.support_articles
  for select
  using (is_published or public.is_admin());

create policy "support_articles_insert_admin" on public.support_articles
  for insert
  with check (public.is_admin());

create policy "support_articles_update_admin" on public.support_articles
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "support_articles_delete_admin" on public.support_articles
  for delete
  using (public.is_admin());


-- ============================================================
-- 14. SUPPORT_TICKETS
-- ============================================================
--
-- Mismo patrón que orders: RLS autoriza quién, el trigger valida qué. El
-- dueño solo puede cerrar su ticket (status = 'cerrado'), sin tocar
-- subject/channel/user_id; admin (o service_role) edita libremente.
create or replace function public.validate_support_ticket_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if (select auth.uid()) = old.user_id then
    if new.status <> 'cerrado'
       or new.subject is distinct from old.subject
       or new.channel is distinct from old.channel
       or new.user_id is distinct from old.user_id then
      raise exception 'El dueño del ticket solo puede cerrarlo, sin modificar otros campos';
    end if;
    return new;
  end if;

  raise exception 'No autorizado para modificar este ticket';
end;
$$;

drop trigger if exists validate_support_ticket_update on public.support_tickets;
create trigger validate_support_ticket_update
  before update on public.support_tickets
  for each row
  execute function public.validate_support_ticket_update();

create policy "support_tickets_select_own_or_admin" on public.support_tickets
  for select
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "support_tickets_insert_own" on public.support_tickets
  for insert
  with check ((select auth.uid()) = user_id);

create policy "support_tickets_update_own" on public.support_tickets
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "support_tickets_update_admin" on public.support_tickets
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Sin policy de DELETE.


-- ============================================================
-- 15. TICKET_MESSAGES
-- ============================================================

create policy "ticket_messages_select_ticket_owner_or_admin" on public.ticket_messages
  for select
  using (
    exists (
      select 1 from public.support_tickets st
      where st.id = ticket_messages.ticket_id and st.user_id = (select auth.uid())
    )
    or public.is_admin()
  );

-- RESOLUCIÓN (ambigüedad #5): se agrega la restricción de sender_role para
-- que el dueño del ticket solo pueda insertar mensajes como 'usuario' — sin
-- esto, cualquier usuario podría insertar un mensaje con sender_role
-- 'agente'/'humano' y suplantar al soporte en su propio hilo.
create policy "ticket_messages_insert_ticket_owner_or_admin" on public.ticket_messages
  for insert
  with check (
    public.is_admin()
    or (
      exists (
        select 1 from public.support_tickets st
        where st.id = ticket_messages.ticket_id and st.user_id = (select auth.uid())
      )
      and sender_role = 'usuario'
    )
  );

-- Sin UPDATE/DELETE: los mensajes de un ticket son append-only.


-- ============================================================
-- 16. GRANTs de la Data API
-- ============================================================
--
-- RLS habilitado + sin GRANT = error opaco de permisos (la tabla nunca es
-- alcanzable, incluso con la policy correcta). Se otorga a nivel de tabla
-- solo lo que efectivamente tiene una policy para ese rol — reforzando a
-- nivel de permiso, no solo de policy, el "no INSERT directo" de
-- orders/order_items.

grant usage on schema public to anon, authenticated;

-- Lectura pública (incluye anon): catálogo navegable sin sesión.
grant select on public.categories, public.products, public.product_images,
  public.questions, public.reviews, public.support_articles
  to anon, authenticated;

-- Resto de tablas: solo authenticated tiene algún acceso (todo lo que
-- requiere estar logueado: perfil propio, carrito, pedidos, soporte...).
grant select, update on public.profiles to authenticated;

grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.product_images to authenticated;

grant select, insert, update, delete on public.cart_items to authenticated;

-- orders: SELECT y UPDATE sí; INSERT deliberadamente NO se otorga (única
-- vía: create_order_from_cart, que corre SECURITY DEFINER y no necesita
-- que el caller tenga privilegio de INSERT en la tabla). DELETE tampoco.
grant select, update on public.orders to authenticated;

-- order_items: solo SELECT. Mismo razonamiento que orders para el INSERT.
grant select on public.order_items to authenticated;

grant insert, update, delete on public.questions to authenticated;
grant insert, update, delete on public.reviews to authenticated;

grant select, insert, delete on public.favorites to authenticated;

grant select, insert on public.product_views to authenticated;

grant insert, update, delete on public.support_articles to authenticated;

grant select, insert, update on public.support_tickets to authenticated;

grant select, insert on public.ticket_messages to authenticated;

-- ============================================================
-- Fase 2.4 — Storage (supabase/migrations/20260821120000_create_storage_buckets.sql)
-- ============================================================
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

-- ============================================================
-- Fase 4.1 — KNOWLEDGE_EMBEDDINGS
-- (supabase/migrations/20260826140300_knowledge_embeddings_rls.sql)
-- ============================================================
--
-- Decisión 1 de MercadoTech_sesion4.md: la IA exige sesión iniciada — cada
-- consulta a Claude cuesta dinero real, así que ni siquiera SELECT es
-- público acá (a diferencia de products/questions/reviews, que sí son
-- legibles por anon desde la sesión 2).
create policy "knowledge_embeddings_select_authenticated" on public.knowledge_embeddings
  for select
  using (true);

-- Sin policies de INSERT/UPDATE/DELETE a propósito: ningún authenticated
-- escribe esta tabla directamente. Las fichas las escribe ÚNICAMENTE
-- lib/supabase/admin.ts (service role, bypasea RLS) desde
-- embedding.service.ts, invocado solo desde Route Handlers y
-- scripts/index-all.ts — nunca desde el navegador (Fases 4.2/4.3).

grant select on public.knowledge_embeddings to authenticated;
-- Sin GRANT de insert/update/delete a authenticated ni a anon: coherente
-- con "sin policy" de arriba — el service role bypasea GRANTs y RLS por
-- igual, así que no necesita ninguno explícito aquí.
