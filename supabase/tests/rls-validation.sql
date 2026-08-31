-- ============================================================================
-- MercadoTech — supabase/tests/rls-validation.sql
-- Fase 2.6 — Validación de políticas RLS.
--
-- Objetivo: ROMPER las políticas, no confirmarlas. Cada bloque simula un
-- actor con `set local role` + `set local request.jwt.claims` y declara su
-- RESULTADO ESPERADO en el comentario inmediatamente encima.
--
-- Cómo correrlo:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/rls-validation.sql
--
-- Convenciones:
--  * Todo dentro de begin/rollback: nada de esto debe alterar el seed.
--  * NO se usa service_role para "probar" nada — la única excepción es la
--    preparación de estado del ESCENARIO 3 (positivo), marcada explícitamente
--    como tal, y ni siquiera ahí se usa: se hace el flujo legítimo completo
--    (comprar + que el vendedor avance el pedido) en vez de forzar filas.
--  * IDs fijos del seed (Fase 2.5) — ver supabase/seed.sql para el detalle
--    completo de qué es cada uno.
--
-- Estructura:
--   SECCIÓN A — los 9 escenarios mínimos exigidos por la spec (Fase 2.6).
--   SECCIÓN B — escenarios adicionales derivados de leer las políticas
--               REALES de 20260821110000_create_rls_policies.sql, no de la
--               spec. Incluye un hallazgo real (ver B9).
-- ============================================================================

\set buyer1  'a0000000-0000-0000-0000-000000000001'
\set buyer2  'a0000000-0000-0000-0000-000000000002'
\set buyer3  'a0000000-0000-0000-0000-000000000003'
\set seller1 'a0000000-0000-0000-0000-000000000004'
\set seller2 'a0000000-0000-0000-0000-000000000005'
\set admin   'a0000000-0000-0000-0000-000000000006'


-- ============================================================================
-- SECCIÓN A — Los 9 escenarios de la spec (Fase 2.6)
-- ============================================================================

\echo '=== ESCENARIO 1a: anon ve solo productos activos (14 de 16) ==='
-- ESPERADO: count = 14 (16 productos - 2 inactivos del seed: ...015, ...016).
begin;
set local role anon;
select count(*) as productos_visibles_anon from public.products;
rollback;

\echo '=== ESCENARIO 1b: anon NO ve carritos ==='
-- ESPERADO: error "permission denied for table cart_items" (falta GRANT,
-- ni siquiera llega a evaluarse la policy).
begin;
set local role anon;
select count(*) from public.cart_items;
rollback;

\echo '=== ESCENARIO 1c: anon NO ve pedidos ==='
-- ESPERADO: error "permission denied for table orders".
begin;
set local role anon;
select count(*) from public.orders;
rollback;

\echo '=== ESCENARIO 1d: anon NO ve tickets de soporte ==='
-- ESPERADO: error "permission denied for table support_tickets".
begin;
set local role anon;
select count(*) from public.support_tickets;
rollback;


\echo '=== ESCENARIO 2a: buyer1 ve/edita SU carrito ==='
-- ESPERADO: insert 1 fila, select la ve, update la modifica (1 fila).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
insert into public.cart_items (user_id, product_id, quantity)
  values (:'buyer1', 'b0000000-0000-0000-0000-000000000002', 1);
select count(*) as items_de_buyer1 from public.cart_items where user_id = :'buyer1';
update public.cart_items set quantity = 2 where user_id = :'buyer1' and product_id = 'b0000000-0000-0000-0000-000000000002';
rollback;

\echo '=== ESCENARIO 2b: buyer2 NO puede ver ni tocar el carrito de buyer1 ==='
-- ESPERADO: buyer1 inserta 1 fila; buyer2, en la MISMA transacción,
-- selecciona 0 filas de ese carrito e intenta un UPDATE que afecta 0 filas
-- (no un error — la fila simplemente no es visible para su policy).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
insert into public.cart_items (user_id, product_id, quantity)
  values (:'buyer1', 'b0000000-0000-0000-0000-000000000003', 1);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer2' || '","role":"authenticated"}', true);
select count(*) as buyer2_ve_del_carrito_de_buyer1 from public.cart_items where user_id = :'buyer1';
update public.cart_items set quantity = 99 where user_id = :'buyer1';
rollback;


\echo '=== ESCENARIO 3a (negativo): buyer1 intenta reseñar un producto de un pedido NO entregado ==='
-- ESPERADO: error "new row violates row-level security policy for table reviews"
-- (order001 de buyer1 está 'pendiente', no 'entregado').
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
insert into public.reviews (product_id, buyer_id, order_id, rating, comment)
  values ('b0000000-0000-0000-0000-000000000001', :'buyer1', 'c0000000-0000-0000-0000-000000000001', 5, 'Intento sin entrega');
rollback;

\echo '=== ESCENARIO 3b (positivo): buyer1 compra, seller1 entrega, buyer1 reseña ==='
-- Preparación 100% legítima (SIN service_role): buyer1 agrega al carrito el
-- router TP-Link (producto de seller1, no reseñado aún en el seed), hace
-- checkout real, y seller1 avanza el pedido hasta 'entregado' con sus
-- propias policies — igual que en producción.
-- ESPERADO de la reseña final: 1 fila insertada.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
insert into public.cart_items (user_id, product_id, quantity)
  values (:'buyer1', 'b0000000-0000-0000-0000-000000000008', 1);
select public.create_order_from_cart(:'buyer1') as new_order_id \gset

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller1' || '","role":"authenticated"}', true);
update public.orders set status = 'pagado' where id = :'new_order_id';
update public.orders set status = 'enviado' where id = :'new_order_id';
update public.orders set status = 'entregado' where id = :'new_order_id';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
insert into public.reviews (product_id, buyer_id, order_id, rating, comment)
  values ('b0000000-0000-0000-0000-000000000008', :'buyer1', :'new_order_id', 5, 'Excelente router, se nota la mejora de velocidad.');
select count(*) as review_insertada from public.reviews where order_id = :'new_order_id';
rollback;


\echo '=== ESCENARIO 4a: seller1 hace CRUD completo de SU producto ==='
-- ESPERADO: insert 1 fila, update 1 fila, delete 1 fila.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller1' || '","role":"authenticated"}', true);
insert into public.products (id, seller_id, category_id, title, price, stock)
  values ('b0000000-0000-0000-0000-000000000099', :'seller1', 'd0000000-0000-0000-0000-000000000003', 'Producto de prueba CRUD', 100.00, 5);
update public.products set price = 120.00 where id = 'b0000000-0000-0000-0000-000000000099';
delete from public.products where id = 'b0000000-0000-0000-0000-000000000099';
rollback;

\echo '=== ESCENARIO 4b: seller1 NO puede editar un producto de seller2 ==='
-- ESPERADO: 0 filas afectadas (política products_update_own lo bloquea).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller1' || '","role":"authenticated"}', true);
update public.products set price = 1.00 where id = 'b0000000-0000-0000-0000-000000000009';
rollback;

\echo '=== ESCENARIO 4c: seller1 NO puede borrar un producto de seller2 ==='
-- ESPERADO: 0 filas afectadas.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller1' || '","role":"authenticated"}', true);
delete from public.products where id = 'b0000000-0000-0000-0000-000000000009';
rollback;


\echo '=== ESCENARIO 5a: seller1 ve exactamente los 5 pedidos con ítems suyos (001,003,004,005,006), NO el 002 ==='
-- ESPERADO: total = 5; contiene_002 = 0.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller1' || '","role":"authenticated"}', true);
select count(*) as total_pedidos_seller1,
       count(*) filter (where id = 'c0000000-0000-0000-0000-000000000002') as contiene_002_seller2_only
from public.orders;
rollback;

\echo '=== ESCENARIO 5b: seller2 ve exactamente los 3 pedidos con ítems suyos (002,003,005) ==='
-- ESPERADO: total = 3.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller2' || '","role":"authenticated"}', true);
select count(*) as total_pedidos_seller2 from public.orders;
rollback;


\echo '=== ESCENARIO 6a: seller1 responde una pregunta de SU producto ==='
-- ESPERADO: 1 fila actualizada.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller1' || '","role":"authenticated"}', true);
update public.questions
  set answer = 'Sí, viene liberado de fábrica, funciona con cualquier operador en Perú.', answered_at = now()
  where id = 'f0000000-0000-0000-0000-000000000002';  -- pregunta sobre Samsung Galaxy A55, producto de SELLER1
rollback;

\echo '=== ESCENARIO 6b: seller1 NO puede responder una pregunta de un producto de seller2 ==='
-- ESPERADO: 0 filas afectadas (la 6a de arriba en realidad prueba esto: la
-- pregunta f0...004 es sobre el PS5 de seller2, seller1 no debería poder
-- tocarla). Repetimos explícito para que quede como caso independiente.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller1' || '","role":"authenticated"}', true);
update public.questions
  set answer = 'Respuesta que no debería poder escribir', answered_at = now()
  where id = 'f0000000-0000-0000-0000-000000000003';  -- pregunta sobre Sony WH-1000XM5, producto de seller2
rollback;


\echo '=== ESCENARIO 7a: buyer1 NO puede auto-promoverse a admin ==='
-- ESPERADO: excepción "No puedes cambiar tu propio rol" (trigger).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
update public.profiles set role = 'admin' where id = :'buyer1';
rollback;

\echo '=== ESCENARIO 7b (control positivo): buyer1 SÍ puede editar su display_name ==='
-- ESPERADO: 1 fila actualizada, sin excepción (la columna role es la única protegida).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
update public.profiles set display_name = 'María F. Quispe (editado)' where id = :'buyer1';
select display_name from public.profiles where id = :'buyer1';
rollback;


\echo '=== ESCENARIO 8a: admin borra una pregunta ajena (moderación) ==='
-- ESPERADO: 1 fila borrada.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'admin' || '","role":"authenticated"}', true);
delete from public.questions where id = 'f0000000-0000-0000-0000-000000000002';
rollback;

\echo '=== ESCENARIO 8b: admin borra una reseña ajena (moderación) ==='
-- ESPERADO: 1 fila borrada.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'admin' || '","role":"authenticated"}', true);
delete from public.reviews where id = 'f1000000-0000-0000-0000-000000000003';
rollback;

\echo '=== ESCENARIO 8c: admin edita un artículo de soporte (despublica) ==='
-- ESPERADO: 1 fila actualizada.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'admin' || '","role":"authenticated"}', true);
update public.support_articles set is_published = false where id = '90000000-0000-0000-0000-000000000001';
rollback;

\echo '=== ESCENARIO 8d (control): buyer1 NO puede borrar la pregunta de otro usuario ==='
-- ESPERADO: 0 filas (contraste directo con 8a, mismo id, actor distinto).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
delete from public.questions where id = 'f0000000-0000-0000-0000-000000000002';
rollback;


\echo '=== ESCENARIO 9a: checkout con carrito VACÍO falla ==='
-- ESPERADO: excepción "El carrito está vacío" (buyer2 no tiene cart_items en el seed).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer2' || '","role":"authenticated"}', true);
select public.create_order_from_cart(:'buyer2');
rollback;

\echo '=== ESCENARIO 9b: checkout con STOCK INSUFICIENTE falla, nombrando el producto ==='
-- ESPERADO: excepción 'Stock insuficiente para "SSD NVMe Western Digital
-- Blue SN580 1TB": disponible 0, solicitado 1' (producto ...007, stock=0 en el seed).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer3' || '","role":"authenticated"}', true);
insert into public.cart_items (user_id, product_id, quantity)
  values (:'buyer3', 'b0000000-0000-0000-0000-000000000007', 1);
select public.create_order_from_cart(:'buyer3');
rollback;

\echo '=== ESCENARIO 9c: checkout EXITOSO descuenta stock y vacía el carrito ==='
-- ESPERADO: nuevo pedido 'pendiente', stock 5 -> 4, carrito en 0.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer2' || '","role":"authenticated"}', true);
insert into public.cart_items (user_id, product_id, quantity)
  values (:'buyer2', 'b0000000-0000-0000-0000-000000000002', 1);  -- HP Pavilion, stock 5
select public.create_order_from_cart(:'buyer2') as checkout_order_id \gset

select status, total from public.orders where id = :'checkout_order_id';
select stock as stock_tras_checkout from public.products where id = 'b0000000-0000-0000-0000-000000000002';
select count(*) as carrito_tras_checkout from public.cart_items where user_id = :'buyer2';
rollback;


-- ============================================================================
-- SECCIÓN B — Escenarios adicionales (derivados de leer la migración real,
-- no pedidos por la spec)
-- ============================================================================

\echo '=== B1a: anon intenta insertar categoría -> permission denied (falta GRANT) ==='
-- ESPERADO: error "permission denied for table categories".
begin;
set local role anon;
insert into public.categories (name, slug) values ('Hackeo', 'hackeo');
rollback;

\echo '=== B1b: buyer1 (authenticated, no admin) intenta insertar categoría -> bloqueado por RLS, no por GRANT ==='
-- ESPERADO: error "new row violates row-level security policy for table
-- categories" (buyer1 SÍ tiene el GRANT de INSERT — lo bloquea la policy,
-- no el permiso de tabla. Contraste deliberado con B1a: dos mecanismos
-- distintos de negación, dos mensajes de error distintos).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
insert into public.categories (name, slug) values ('Hackeo', 'hackeo');
rollback;


\echo '=== B2: seller2 intenta subir una imagen a un producto de seller1 ==='
-- ESPERADO: error de RLS (product_images_insert_own_product exige ser dueño
-- del producto referenciado).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller2' || '","role":"authenticated"}', true);
insert into public.product_images (product_id, image_path, position)
  values ('b0000000-0000-0000-0000-000000000001', 'product-images/hack/hack/1.jpg', 0);
rollback;


\echo '=== B3a: buyer1 intenta INSERT directo en orders (saltándose la función) ==='
-- ESPERADO: error "permission denied for table orders" (ni GRANT de INSERT existe).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
insert into public.orders (buyer_id, status, total) values (:'buyer1', 'pendiente', 1.00);
rollback;

\echo '=== B3b: seller1 intenta INSERT directo en order_items ==='
-- ESPERADO: error "permission denied for table order_items".
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller1' || '","role":"authenticated"}', true);
insert into public.order_items (order_id, product_id, seller_id, title_snapshot, price_snapshot, quantity)
  values ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', :'seller1', 'Falso', 1.00, 1);
rollback;

\echo '=== B3c: incluso ADMIN no puede UPDATE en order_items (inmutable para TODOS vía API) ==='
-- ESPERADO: error "permission denied for table order_items" (no hay GRANT
-- de UPDATE para nadie, ni siquiera con is_admin() = true — el diseño es
-- "inmutable para la Data API, punto", no "inmutable salvo admin").
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'admin' || '","role":"authenticated"}', true);
update public.order_items set quantity = 999 where id = 'c1000000-0000-0000-0000-000000000001';
rollback;


\echo '=== B4a: buyer1 intenta cancelar un pedido que YA NO está pendiente (order002, pagado) ==='
-- ESPERADO: excepción 'Solo se puede cancelar un pedido en estado "pendiente" (actual: pagado)'.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
update public.orders set status = 'cancelado' where id = 'c0000000-0000-0000-0000-000000000002';
rollback;

\echo '=== B4b: seller1 intenta retroceder un estado (order003 enviado -> pagado) ==='
-- ESPERADO: excepción "Transición de estado inválida: enviado -> pagado".
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller1' || '","role":"authenticated"}', true);
update public.orders set status = 'pagado' where id = 'c0000000-0000-0000-0000-000000000003';
rollback;

\echo '=== B4c: seller2 (SIN ítems en order001) intenta tocar su status ==='
-- ESPERADO: 0 filas afectadas (RLS lo filtra antes de que el trigger corra;
-- order001 solo tiene ítem de seller1).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller2' || '","role":"authenticated"}', true);
update public.orders set status = 'pagado' where id = 'c0000000-0000-0000-0000-000000000001';
rollback;


\echo '=== B5: favorites -- ni el propio dueño puede editar una fila existente ==='
-- ESPERADO: error "permission denied for table favorites". No hay policy de
-- UPDATE para esta tabla (es un toggle insert/delete) Y TAMPOCO se otorgó
-- el GRANT de UPDATE (ver migración 20260821110000, sección GRANTs) — el
-- candado es doble, así que el bloqueo ocurre a nivel de permiso de tabla,
-- ni siquiera llega a evaluarse RLS.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
update public.favorites set product_id = 'b0000000-0000-0000-0000-000000000001' where user_id = :'buyer1';
rollback;

\echo '=== B6a: product_views es append-only -- ni el propio dueño puede editar un evento ==='
-- ESPERADO: error "permission denied for table product_views" (mismo
-- motivo que B5: sin GRANT de UPDATE, no solo sin policy).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
update public.product_views set viewed_at = now() where user_id = :'buyer1';
rollback;

\echo '=== B6b: product_views -- ni el propio dueño puede borrar un evento ==='
-- ESPERADO: error "permission denied for table product_views" (sin GRANT
-- de DELETE). Bloque separado de B6a a propósito: en la misma transacción,
-- el primer error aborta el resto — un UPDATE fallido dejaría el DELETE
-- sin ejecutarse, ocultando si el DELETE también estaba bien bloqueado.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
delete from public.product_views where user_id = :'buyer1';
rollback;


\echo '=== B7a: buyer1 intenta REABRIR su propio ticket ya resuelto ==='
-- ESPERADO: excepción "El dueño del ticket solo puede cerrarlo, sin
-- modificar otros campos" (el trigger exige new.status = ''cerrado'' siempre
-- que el actor sea el dueño; 'abierto' lo viola).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
update public.support_tickets set status = 'abierto' where id = '91000000-0000-0000-0000-000000000001';
rollback;

\echo '=== B7b: buyer2 intenta cerrar SU ticket pero también cambiar el subject de paso ==='
-- ESPERADO: misma excepción — el trigger exige que subject/channel/user_id
-- no cambien cuando quien cierra es el dueño.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer2' || '","role":"authenticated"}', true);
update public.support_tickets set status = 'cerrado', subject = 'Asunto reescrito' where id = '91000000-0000-0000-0000-000000000002';
rollback;

\echo '=== B7c: buyer1 intenta tocar el ticket de buyer2 ==='
-- ESPERADO: 0 filas afectadas (RLS de ownership, ni siquiera llega al trigger).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
update public.support_tickets set status = 'cerrado' where id = '91000000-0000-0000-0000-000000000002';
rollback;

\echo '=== B7d: admin SÍ puede reabrir/reasignar cualquier ticket libremente ==='
-- ESPERADO: 1 fila actualizada, sin excepción (bypass de is_admin() en el trigger).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'admin' || '","role":"authenticated"}', true);
update public.support_tickets set status = 'en_proceso' where id = '91000000-0000-0000-0000-000000000002';
rollback;


\echo '=== B8a: buyer2 (dueño del ticket) intenta insertar un mensaje suplantando a soporte ==='
-- ESPERADO: error de RLS (sender_role debe ser ''usuario'' para el dueño no-admin).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer2' || '","role":"authenticated"}', true);
insert into public.ticket_messages (ticket_id, sender_role, content)
  values ('91000000-0000-0000-0000-000000000002', 'agente', 'Mensaje falso de soporte');
rollback;

\echo '=== B8b: buyer1 (NO dueño) intenta insertar mensaje en el ticket de buyer2, aunque use sender_role correcto ==='
-- ESPERADO: error de RLS (falla por ownership del ticket, no por sender_role
-- — se aísla la condición: sender_role='usuario' es correcto, el problema
-- es que el ticket no es suyo).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
insert into public.ticket_messages (ticket_id, sender_role, content)
  values ('91000000-0000-0000-0000-000000000002', 'usuario', 'Mensaje colado en ticket ajeno');
rollback;


\echo '=== B9: HALLAZGO — seller1 responde una pregunta pero TAMBIÉN reescribe el texto original ==='
-- La policy questions_update_answer_by_product_owner autoriza la FILA (por
-- ser dueño del producto) pero no restringe qué COLUMNAS cambian. No hay
-- trigger que lo impida (a diferencia de orders/support_tickets).
-- ESPERADO SEGÚN EL DISEÑO ACTUAL: la fila SÍ se actualiza (1 fila, sin
-- error) — incluyendo el cambio no autorizado a `question`. Esto es un
-- hallazgo real, no una prueba mal planteada: un vendedor podría alterar la
-- pregunta original de un comprador. Ver diagnóstico y propuesta de fix en
-- la respuesta, no en este archivo.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'seller1' || '","role":"authenticated"}', true);
update public.questions
  set answer = 'Respuesta legítima',
      answered_at = now(),
      question = '¿Pregunta reescrita por el vendedor?'  -- <- esto NO debería poder cambiarlo
  where id = 'f0000000-0000-0000-0000-000000000001';
select question, answer from public.questions where id = 'f0000000-0000-0000-0000-000000000001';
rollback;


\echo '=== B10a: buyer1 solo ve su propio profile (1 fila, no las otras 5) ==='
-- ESPERADO: count = 1.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
select count(*) as profiles_visibles_buyer1 from public.profiles;
rollback;

\echo '=== B10b: admin ve los 6 profiles ==='
-- ESPERADO: count = 6.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'admin' || '","role":"authenticated"}', true);
select count(*) as profiles_visibles_admin from public.profiles;
rollback;


\echo '=== B11a: buyer2 intenta editar la reseña de buyer3 ==='
-- ESPERADO: 0 filas afectadas.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer2' || '","role":"authenticated"}', true);
update public.reviews set rating = 1, comment = 'Sabotaje' where id = 'f1000000-0000-0000-0000-000000000002';
rollback;

\echo '=== B11b: buyer1 intenta reseñar un producto que nunca compró (sin ningún pedido que lo contenga) ==='
-- ESPERADO: error de RLS.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"' || :'buyer1' || '","role":"authenticated"}', true);
insert into public.reviews (product_id, buyer_id, order_id, rating, comment)
  values ('b0000000-0000-0000-0000-000000000011', :'buyer1', 'c0000000-0000-0000-0000-000000000001', 5, 'Nunca lo compré');
rollback;


\echo '=== B12: anon NO ve product_images de un producto INACTIVO, SÍ de uno activo ==='
-- ESPERADO: inactivo = 0 filas, activo > 0 filas.
begin;
set local role anon;
select
  (select count(*) from public.product_images where product_id = 'b0000000-0000-0000-0000-000000000015') as imagenes_producto_inactivo,
  (select count(*) from public.product_images where product_id = 'b0000000-0000-0000-0000-000000000001') as imagenes_producto_activo;
rollback;
