-- ============================================================================
-- MercadoTech — supabase/seed.sql
-- Fase 2.5 — Datos de prueba.
--
-- Se ejecuta automáticamente después de las migraciones en cada
-- `supabase db reset` (supabase/config.toml -> [db.seed] sql_paths).
--
-- Convenciones de este archivo:
--  * Todo corre como `postgres` (rol de la migración), que bypasea RLS —
--    por eso los INSERT no necesitan simular auth.uid()/JWT.
--  * UUIDs fijos y legibles por prefijo, para poder referenciarlos en tests
--    (sesión 6) sin tener que hacer un SELECT primero:
--      a0000000-... usuarios (profiles)      d0000000-... categorías
--      b0000000-... productos                e0000000-... (no usado; ver product_images abajo)
--      c0000000-... pedidos (orders)         f0000000-... preguntas
--      c1000000-... ítems de pedido          f1000000-... reseñas
--      90000000-... artículos de soporte     f2000000-... favoritos
--      91000000-... tickets de soporte       f3000000-... product_views
--      92000000-... mensajes de ticket
--  * Contraseña común de laboratorio para los 6 usuarios: MercadoTech123!
--    (hasheada con crypt()/pgcrypto, igual que hace GoTrue internamente).
--
-- GAP CONOCIDO (documentado a propósito, no es un olvido): los paths de
-- product_images siguen la convención del bucket
-- (product-images/{seller_id}/{product_id}/{n}.jpg) pero los ARCHIVOS no
-- existen todavía en Storage — recién se suben de verdad cuando la UI de la
-- sesión 3 implemente el upload. Hasta entonces, cualquier <img src> que
-- apunte a estos paths va a dar 404. Es un placeholder de datos, no de
-- archivos.
-- ============================================================================


-- ============================================================================
-- 1. USUARIOS (auth.users + auth.identities -> dispara handle_new_user -> profiles)
-- ============================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'buyer1@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"display_name":"María Fernanda Quispe"}',
   now() - interval '40 days', now() - interval '40 days', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'buyer2@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Jorge Alonso Ramírez"}',
   now() - interval '35 days', now() - interval '35 days', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003',
   'authenticated', 'authenticated', 'buyer3@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Lucía Andrea Torres"}',
   now() - interval '30 days', now() - interval '30 days', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004',
   'authenticated', 'authenticated', 'seller1@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"display_name":"TecnoImports Perú"}',
   now() - interval '60 days', now() - interval '60 days', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000005',
   'authenticated', 'authenticated', 'seller2@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Andes Digital Store"}',
   now() - interval '55 days', now() - interval '55 days', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000006',
   'authenticated', 'authenticated', 'admin@mercadotech.test', crypt('MercadoTech123!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Soporte MercadoTech"}',
   now() - interval '90 days', now() - interval '90 days', '', '', '', '');

-- Fila en auth.identities por usuario (provider 'email'): sin esto, algunos
-- flujos de GoTrue (y el listado de usuarios en Studio) no reconocen la
-- identidad aunque el login por password funcione igual. provider_id = id
-- del usuario es la convención de GoTrue para el provider 'email'.
insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
       jsonb_build_object('sub', id::text, 'email', email),
       created_at, created_at
from auth.users
where id in (
  'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006'
);

-- handle_new_user ya creó los 6 profiles con role='buyer' por defecto;
-- ajustamos rol y datos de contacto (ejecutado como postgres: el trigger
-- prevent_profile_role_self_change no bloquea esto — auth.role() es NULL
-- fuera de un contexto de JWT, no 'authenticated', así que la condición de
-- bloqueo no se cumple).
update public.profiles set role = 'seller', phone = '+51 987 654 321' where id = 'a0000000-0000-0000-0000-000000000004';
update public.profiles set role = 'seller', phone = '+51 976 543 210' where id = 'a0000000-0000-0000-0000-000000000005';
update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000006';
update public.profiles set phone = '+51 912 345 678' where id = 'a0000000-0000-0000-0000-000000000001';
update public.profiles set phone = '+51 923 456 789' where id = 'a0000000-0000-0000-0000-000000000002';


-- ============================================================================
-- 2. CATEGORÍAS (8)
-- ============================================================================

insert into public.categories (id, name, slug) values
  ('d0000000-0000-0000-0000-000000000001', 'Laptops', 'laptops'),
  ('d0000000-0000-0000-0000-000000000002', 'Smartphones', 'smartphones'),
  ('d0000000-0000-0000-0000-000000000003', 'Componentes de PC', 'componentes-de-pc'),
  ('d0000000-0000-0000-0000-000000000004', 'Audio', 'audio'),
  ('d0000000-0000-0000-0000-000000000005', 'Gaming', 'gaming'),
  ('d0000000-0000-0000-0000-000000000006', 'Monitores', 'monitores'),
  ('d0000000-0000-0000-0000-000000000007', 'Accesorios', 'accesorios'),
  ('d0000000-0000-0000-0000-000000000008', 'Redes', 'redes');


-- ============================================================================
-- 3. PRODUCTOS (16: 8 de seller1 "TecnoImports Perú", 8 de seller2 "Andes
--    Digital Store". 2 inactivos (015, 016), 1 con stock 0 (007) — precios
--    en soles, coherentes con el mercado peruano.
-- ============================================================================

insert into public.products (id, seller_id, category_id, title, description, brand, condition, price, stock, is_active) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001',
   'Laptop Lenovo IdeaPad Slim 3 15.6" Ryzen 5 16GB 512GB SSD',
   'Ideal para estudios y teletrabajo: procesador AMD Ryzen 5, 16GB de RAM y SSD de 512GB para que todo cargue rápido. Pantalla Full HD de 15.6" y batería para todo el día.',
   'Lenovo', 'nuevo', 2199.00, 8, true),

  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001',
   'Laptop HP Pavilion 14" Intel Core i5 8GB 512GB SSD',
   'Compacta y liviana, perfecta para llevarla a la universidad o la oficina. Intel Core i5 de última generación con 8GB de RAM, suficiente para uso diario y multitarea.',
   'HP', 'nuevo', 2499.00, 5, true),

  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002',
   'Smartphone Samsung Galaxy A55 5G 128GB',
   'Pantalla AMOLED de 6.6", cámara triple de 50MP y batería de 5000mAh. Compatible con las bandas 5G de los principales operadores en Perú.',
   'Samsung', 'nuevo', 1399.00, 12, true),

  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002',
   'Smartphone Xiaomi Redmi Note 13 Pro 256GB',
   'Cámara principal de 200MP, carga rápida de 67W y 256GB de almacenamiento para no quedarte sin espacio. Buena relación precio-calidad dentro de la gama media.',
   'Xiaomi', 'nuevo', 999.00, 15, true),

  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000003',
   'Procesador AMD Ryzen 5 5600G AM4',
   'Procesador con gráficos integrados Radeon, ideal para armar una PC de oficina o gaming básico sin depender de una tarjeta de video dedicada.',
   'AMD', 'nuevo', 549.00, 10, true),

  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000003',
   'Memoria RAM Kingston Fury Beast 16GB DDR4 3200MHz',
   'Módulo de 16GB DDR4 a 3200MHz, compatible con la mayoría de placas madre AM4/LGA1200. Mejora notable en tareas multitarea y juegos.',
   'Kingston', 'nuevo', 219.00, 20, true),

  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000003',
   'SSD NVMe Western Digital Blue SN580 1TB',
   'Velocidades de lectura de hasta 4150MB/s. Ideal para actualizar una PC o laptop que todavía use disco duro mecánico. Por su alta demanda, se agotó el stock — vuelve pronto.',
   'Western Digital', 'nuevo', 289.00, 0, true),

  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000008',
   'Router TP-Link Archer AX55 WiFi 6',
   'WiFi 6 de doble banda, hasta 3000Mbps combinados. Recomendado para hogares con varios dispositivos conectados a la vez (streaming, gaming, trabajo remoto).',
   'TP-Link', 'nuevo', 349.00, 14, true),

  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000004',
   'Audífonos Sony WH-1000XM5 Bluetooth Noise Cancelling',
   'La cancelación de ruido líder de la industria, ahora con mejor comodidad y hasta 30 horas de batería. Perfectos para el trabajo remoto o los viajes largos.',
   'Sony', 'nuevo', 1599.00, 6, true),

  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000004',
   'Parlante JBL Flip 6 Bluetooth resistente al agua',
   'Sonido potente en un formato portátil, certificación IP67 (resistente al agua y al polvo) e hasta 12 horas de batería. Ideal para la playa o la piscina.',
   'JBL', 'nuevo', 449.00, 18, true),

  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005',
   'Consola PlayStation 5 Slim 1TB',
   'La versión más compacta de PS5, con 1TB de almacenamiento interno. Incluye un mando DualSense inalámbrico. Stock limitado por temporada.',
   'Sony', 'nuevo', 2599.00, 4, true),

  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005',
   'Mouse Logitech G Pro X Superlight 2',
   'Mouse gamer inalámbrico de menos de 60 gramos, sensor HERO de alta precisión y hasta 95 horas de batería. Usado por jugadores profesionales de esports.',
   'Logitech', 'nuevo', 549.00, 25, true),

  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000006',
   'Monitor LG UltraGear 27" 165Hz QHD',
   'Panel IPS QHD (2560x1440) con 165Hz de refresco y 1ms de respuesta. Compatible con NVIDIA G-SYNC y AMD FreeSync para juego fluido sin tearing.',
   'LG', 'nuevo', 999.00, 9, true),

  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000006',
   'Monitor Samsung Odyssey G5 32" Curvo 165Hz',
   'Pantalla curva de 1000R que envuelve tu campo de visión, resolución QHD y 165Hz de refresco. Muy recomendado para juegos de mundo abierto y simuladores.',
   'Samsung', 'nuevo', 1299.00, 7, true),

  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000007',
   'Teclado mecánico Redragon Kumara K552 (reacondicionado)',
   'Switches mecánicos azules, retroiluminación LED roja e interruptores anti-ghosting. Unidad reacondicionada y probada, con pequeñas marcas de uso estéticas. Publicación pausada por bajo stock.',
   'Redragon', 'reacondicionado', 129.00, 6, false),

  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000007',
   'Webcam Logitech C920 HD Pro (modelo descontinuado)',
   'Grabación Full HD 1080p con enfoque automático y micrófonos estéreo integrados. Modelo descontinuado por el fabricante, quedan unidades limitadas en almacén.',
   'Logitech', 'nuevo', 199.00, 3, false);


-- ============================================================================
-- 4. PRODUCT_IMAGES (2-3 por producto, generadas en base a la convención del
--    bucket: product-images/{seller_id}/{product_id}/{n}.jpg — los 4
--    productos "estrella" llevan 3 fotos, el resto 2).
-- ============================================================================

insert into public.product_images (product_id, image_path, position)
select
  p.id,
  'product-images/' || p.seller_id || '/' || p.id || '/' || gs.n || '.jpg',
  gs.n - 1
from public.products p
cross join lateral generate_series(
  1,
  case when p.id in (
    'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000009',
    'b0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000013'
  ) then 3 else 2 end
) as gs(n);


-- ============================================================================
-- 5. PEDIDOS + ORDER_ITEMS — 1 por cada estado (pendiente/pagado/enviado/
--    entregado/cancelado), 2 de ellos multi-vendedor (para probar que
--    order_items.seller_id realmente filtra por vendedor dentro de un mismo
--    pedido compartido). Insertados directamente con su total ya calculado
--    (no pasan por create_order_from_cart: eso valida el checkout en vivo,
--    esto es historial ya cerrado) — por eso el stock de products arriba NO
--    se descuenta por estos pedidos, es una simplificación deliberada del
--    seed, no un bug.
-- ============================================================================

insert into public.orders (id, buyer_id, status, total, created_at) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'pendiente', 2199.00, now() - interval '1 day'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'pagado', 898.00, now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'enviado', 1948.00, now() - interval '5 days'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'entregado', 2199.00, now() - interval '10 days'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'entregado', 1818.00, now() - interval '15 days'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'cancelado', 999.00, now() - interval '7 days');

insert into public.order_items (id, order_id, product_id, seller_id, title_snapshot, price_snapshot, quantity) values
  -- Orden 001 (pendiente) — buyer1 compra la laptop Lenovo
  ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Laptop Lenovo IdeaPad Slim 3 15.6" Ryzen 5 16GB 512GB SSD', 2199.00, 1),
  -- Orden 002 (pagado) — buyer1 compra 2 parlantes JBL Flip 6
  ('c1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000005', 'Parlante JBL Flip 6 Bluetooth resistente al agua', 449.00, 2),
  -- Orden 003 (enviado) — buyer2 compra a AMBOS vendedores en el mismo pedido
  ('c1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'Smartphone Samsung Galaxy A55 5G 128GB', 1399.00, 1),
  ('c1000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000005', 'Mouse Logitech G Pro X Superlight 2', 549.00, 1),
  -- Orden 004 (entregado) — buyer2 compra la laptop Lenovo (habilita su reseña)
  ('c1000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Laptop Lenovo IdeaPad Slim 3 15.6" Ryzen 5 16GB 512GB SSD', 2199.00, 1),
  -- Orden 005 (entregado) — buyer3 compra a AMBOS vendedores (habilita 2 reseñas)
  ('c1000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005', 'Audífonos Sony WH-1000XM5 Bluetooth Noise Cancelling', 1599.00, 1),
  ('c1000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', 'Memoria RAM Kingston Fury Beast 16GB DDR4 3200MHz', 219.00, 1),
  -- Orden 006 (cancelado) — buyer3 canceló su compra del Redmi Note 13 Pro
  ('c1000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'Smartphone Xiaomi Redmi Note 13 Pro 256GB', 999.00, 1);


-- ============================================================================
-- 6. PREGUNTAS (7 — 4 respondidas, 3 sin responder)
-- ============================================================================

insert into public.questions (id, product_id, user_id, question, answer, answered_at, created_at) values
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
   '¿La laptop viene con Windows instalado o hay que comprarlo aparte?',
   'Viene con Windows 11 Home preinstalado y activado, sin costo adicional.', now() - interval '9 days', now() - interval '10 days'),

  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003',
   '¿Es liberado para cualquier operador?',
   'Sí, viene liberado de fábrica, funciona con cualquier operador en Perú.', now() - interval '6 days', now() - interval '7 days'),

  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
   '¿Incluye estuche de transporte?',
   'Sí, incluye el estuche rígido original y cable USB-C.', now() - interval '4 days', now() - interval '5 days'),

  ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002',
   '¿Es la versión con lector de discos o solo la digital?',
   null, null, now() - interval '2 days'),

  ('f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000003',
   '¿Tiene soporte VESA para montar en brazo de monitor?',
   null, null, now() - interval '1 day'),

  ('f0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
   '¿Es compatible con placas AMD B550?',
   'Sí, es compatible con la mayoría de placas AM4 que soporten DDR4 a 3200MHz, incluyendo la línea B550.', now() - interval '11 days', now() - interval '12 days'),

  ('f0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
   '¿Cuánto pesa aproximadamente?',
   null, null, now() - interval '3 hours');


-- ============================================================================
-- 7. RESEÑAS — solo sobre pedidos 'entregado' que contienen el producto
--    (órdenes 004 y 005), respetando unique(product_id, buyer_id).
-- ============================================================================

insert into public.reviews (id, product_id, buyer_id, order_id, rating, comment, created_at) values
  ('f1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004',
   5, 'Excelente laptop, cumple perfecto para trabajo remoto y estudios. Llegó bien empacada y en el tiempo indicado.', now() - interval '8 days'),

  ('f1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005',
   5, 'La cancelación de ruido es impresionante, ideal para la combi o el bus. Muy cómodos para uso prolongado.', now() - interval '13 days'),

  ('f1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005',
   4, 'Buena memoria RAM, funciona estable. Le bajo un punto porque no traía disipador como se veía en la foto.', now() - interval '13 days');


-- ============================================================================
-- 8. FAVORITOS (muestra)
-- ============================================================================

insert into public.favorites (id, user_id, product_id, created_at) values
  ('f2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000009', now() - interval '6 days'),
  ('f2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', now() - interval '4 days'),
  ('f2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', now() - interval '9 days'),
  ('f2000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000013', now() - interval '2 days'),
  ('f2000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', now() - interval '5 days'),
  ('f2000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000010', now() - interval '1 day');


-- ============================================================================
-- 9. PRODUCT_VIEWS (eventos de muestra, sin contador — cada fila es una
--    apertura de producto)
-- ============================================================================

insert into public.product_views (id, product_id, user_id, viewed_at) values
  ('f3000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', now() - interval '9 days'),
  ('f3000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', now() - interval '9 days 2 hours'),
  ('f3000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', now() - interval '6 days'),
  ('f3000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', now() - interval '7 days'),
  ('f3000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', now() - interval '6 days'),
  ('f3000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', now() - interval '14 days'),
  ('f3000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', now() - interval '13 days'),
  ('f3000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', now() - interval '2 days'),
  ('f3000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000003', now() - interval '1 day'),
  ('f3000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', now() - interval '3 hours');


-- ============================================================================
-- 10. SUPPORT_ARTICLES — 10 artículos de FAQ REALES (sin lorem ipsum),
--     2-4 párrafos cada uno, en las 4 categorías pedidas. Estos son los que
--     se vectorizan tal cual en la sesión 4 (RAG) — el contenido tiene que
--     ser útil de verdad, no solo "llenar la tabla".
-- ============================================================================

insert into public.support_articles (id, title, content, category, is_published, created_at, updated_at) values

('90000000-0000-0000-0000-000000000001', '¿Cuánto demora el envío de mi pedido?',
'El tiempo de entrega depende de tu ubicación. Para Lima Metropolitana y Callao, el pedido llega en un plazo de 2 a 4 días hábiles desde que el vendedor confirma el pago. Para provincias, el rango habitual es de 4 a 8 días hábiles, dependiendo de la zona y del servicio de courier que use cada vendedor (Olva Courier, Shalom o Serpost, según disponibilidad).

Ten en cuenta que estos plazos empiezan a correr una vez que tu pedido pasa de "pendiente" a "pagado" — mientras el vendedor no confirme la recepción del pago, el pedido no entra a preparación de envío.

Si tu pedido lleva más tiempo del indicado sin actualizarse, te recomendamos primero revisar el estado en "Mis pedidos" y, si sigue sin novedades, escribirle directamente al vendedor desde la sección de preguntas del producto, o abrir un ticket de soporte para que lo revisemos por ti.',
'envíos', true, now() - interval '80 days', now() - interval '80 days'),

('90000000-0000-0000-0000-000000000002', '¿Qué hago si mi pedido llega dañado o incompleto?',
'Si tu pedido llega con el empaque visiblemente dañado, te recomendamos no recibirlo y reportarlo de inmediato al courier. Si ya lo recibiste y notas que el producto está dañado o falta algún accesorio, tienes hasta 48 horas desde la entrega para reportarlo a través de un ticket de soporte, adjuntando fotos claras del producto y del empaque.

Con esa información, nuestro equipo se contacta con el vendedor para coordinar una solución: reposición del producto, envío de la pieza faltante, o reembolso, según corresponda al caso. No es necesario que devuelvas el producto dañado hasta que el vendedor o soporte te lo indiquen explícitamente.

Guardar el empaque original y las fotos del estado en que llegó el paquete acelera bastante el proceso, así que te sugerimos tomarlas apenas abras la caja, antes de manipular el producto.',
'envíos', true, now() - interval '78 days', now() - interval '78 days'),

('90000000-0000-0000-0000-000000000003', '¿Puedo hacer seguimiento de mi pedido en tiempo real?',
'Sí. Desde la sección "Mis pedidos" puedes ver el estado actual de cada compra: pendiente, pagado, enviado, entregado o cancelado. Este estado lo va actualizando el vendedor a medida que avanza la preparación y el envío de tu pedido.

Por ahora no integramos el rastreo en vivo del courier (número de guía con mapa) dentro de la plataforma — cuando el vendedor marca tu pedido como "enviado", generalmente te compartirá el número de seguimiento de Olva, Shalom o el courier que haya usado, para que lo consultes directamente en su página.

Estamos evaluando integrar el rastreo automático en una futura actualización.',
'envíos', true, now() - interval '75 days', now() - interval '75 days'),

('90000000-0000-0000-0000-000000000004', '¿Qué métodos de pago acepta MercadoTech?',
'En esta etapa del proyecto, MercadoTech simula el proceso de pago dentro de la plataforma: al confirmar tu compra, el pedido queda en estado "pendiente" y el vendedor lo marca como "pagado" una vez que verifica la recepción del pago por el medio acordado (transferencia bancaria, Yape, Plin, o tarjeta mediante un enlace de pago externo que te comparte el propio vendedor).

No se procesan pagos con tarjeta directamente dentro del sitio — no te pediremos el número completo de tu tarjeta en ningún formulario de MercadoTech. Cualquier cobro con tarjeta pasa por una pasarela externa (como Culqi o Niubiz) gestionada por el vendedor, nunca por nosotros directamente.

Si un vendedor te pide datos de tu tarjeta por chat o fuera de un enlace de pago oficial, repórtalo de inmediato con soporte — no es una práctica que permitamos en la plataforma.',
'pagos', true, now() - interval '70 days', now() - interval '70 days'),

('90000000-0000-0000-0000-000000000005', '¿Es seguro pagar con tarjeta en MercadoTech?',
'Sí, siempre que el pago se realice a través del enlace de una pasarela de pago reconocida (Culqi, Niubiz, Mercado Pago, etc.) que el propio vendedor te comparta para completar la compra. Estas pasarelas están certificadas bajo el estándar PCI-DSS, el mismo que usan bancos y tiendas grandes, y MercadoTech nunca almacena ni tiene acceso a tu número de tarjeta completo.

Como regla general: desconfía de cualquier pedido de pago que te pida enviar el número de tarjeta, la fecha de vencimiento y el CVV directamente por chat, WhatsApp o correo. Ninguna transacción legítima en MercadoTech funciona así.

Si tienes dudas sobre si un enlace de pago es legítimo, puedes preguntarle a nuestro equipo de soporte antes de completar el pago.',
'pagos', true, now() - interval '68 days', now() - interval '68 days'),

('90000000-0000-0000-0000-000000000006', '¿Puedo pagar contra entrega?',
'El pago contra entrega no es un método soportado directamente por la plataforma — el flujo estándar de MercadoTech es confirmar el pago con el vendedor antes de que el pedido se marque como "pagado" y se prepare el envío.

Dicho esto, algunos vendedores ofrecen esta modalidad de forma particular para pedidos dentro de Lima, coordinándola directamente contigo por chat después de hacer el pedido. Si te interesa esta opción, te recomendamos preguntarle al vendedor desde la sección de preguntas del producto antes de comprar, para confirmar si la tiene disponible en tu zona.

Ten presente que, en ese caso, la coordinación de la entrega queda a cargo del vendedor y no de MercadoTech.',
'pagos', true, now() - interval '65 days', now() - interval '65 days'),

('90000000-0000-0000-0000-000000000007', '¿Cuál es la política de devoluciones y cambios?',
'Tienes hasta 7 días calendario desde que recibes tu pedido para solicitar una devolución o un cambio, siempre que el producto esté en las mismas condiciones en que lo recibiste: sin uso, con su empaque original y todos sus accesorios.

Para solicitar una devolución, abre un ticket de soporte indicando el número de pedido y el motivo. Nuestro equipo coordina con el vendedor la logística de retorno del producto. Una vez que el vendedor confirma que recibió el producto en buen estado, se procesa el reembolso o el cambio, según lo que hayas solicitado.

Los productos personalizados, o los que el vendedor haya marcado explícitamente como "sin devolución" en su descripción, quedan excluidos de esta política — revisa siempre la descripción completa del producto antes de comprar si tienes dudas.

El costo del envío de devolución lo asume el comprador, salvo que el motivo sea un error del vendedor (producto equivocado, dañado de fábrica, etc.), en cuyo caso lo cubre el vendedor.',
'devoluciones', true, now() - interval '60 days', now() - interval '60 days'),

('90000000-0000-0000-0000-000000000008', 'Mi producto llegó con una falla, ¿tiene garantía?',
'Todos los productos nuevos vendidos en MercadoTech mantienen la garantía del fabricante, que en la mayoría de los casos es de 12 meses para electrónica de consumo (laptops, smartphones, monitores, componentes de PC). El plazo exacto depende de la marca y el modelo — revisa la ficha del producto o la caja para confirmarlo.

Si detectas una falla dentro de los primeros 7 días, puedes tramitarlo como una devolución por producto defectuoso (ver el artículo de política de devoluciones). Pasado ese plazo, pero dentro del período de garantía, deberás coordinar directamente con el vendedor o con el centro de servicio autorizado de la marca en Perú, según corresponda.

Los productos marcados como "usado" o "reacondicionado" pueden tener una garantía distinta (normalmente de 30 a 90 días otorgada por el propio vendedor) — siempre está indicada en la descripción del producto.',
'devoluciones', true, now() - interval '58 days', now() - interval '58 days'),

('90000000-0000-0000-0000-000000000009', '¿Cómo actualizo los datos de mi cuenta?',
'Puedes actualizar tu nombre visible, teléfono y foto de perfil desde la sección de tu cuenta. Los cambios se guardan de inmediato y se reflejan en tus próximas preguntas, reseñas y pedidos.

Por motivos de seguridad, el correo electrónico asociado a tu cuenta y tu rol (comprador, vendedor o administrador) no se pueden cambiar desde tu propio perfil. Si necesitas actualizar tu correo, o si eres comprador y quieres empezar a vender en la plataforma, debes solicitarlo a través de un ticket de soporte para que el equipo lo valide y lo actualice.

Tu contraseña se puede restablecer en cualquier momento desde la pantalla de inicio de sesión, con el enlace "¿Olvidaste tu contraseña?".',
'cuenta', true, now() - interval '55 days', now() - interval '55 days'),

('90000000-0000-0000-0000-000000000010', '¿Cómo me convierto en vendedor dentro de MercadoTech?',
'Para empezar a vender, primero crea una cuenta normal de comprador y luego solicita la conversión a vendedor mediante un ticket de soporte, indicando el nombre con el que quieres publicar tus productos (puede ser tu nombre o el de tu tienda/negocio).

Nuestro equipo revisa la solicitud y, una vez aprobada, tu cuenta pasa a tener el rol de vendedor: vas a poder publicar productos, subir fotos, responder preguntas de compradores y gestionar el estado de los pedidos que te lleguen.

Como vendedor, sos responsable de mantener actualizado el stock de tus publicaciones, responder las preguntas de los compradores en un plazo razonable, y cumplir con los tiempos de envío indicados. El incumplimiento reiterado de estas responsabilidades puede llevar a una suspensión de la cuenta, evaluada caso por caso por el equipo de MercadoTech.',
'cuenta', true, now() - interval '50 days', now() - interval '50 days');


-- ============================================================================
-- 11. SUPPORT_TICKETS + TICKET_MESSAGES (2 tickets)
-- ============================================================================

insert into public.support_tickets (id, user_id, subject, status, channel, created_at) values
  ('91000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'No puedo ver mi pedido en el historial', 'resuelto', 'chat', now() - interval '8 days'),
  ('91000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '¿Puedo cambiar el monitor por otro modelo?', 'abierto', 'chat', now() - interval '1 day');

insert into public.ticket_messages (id, ticket_id, sender_role, content, created_at) values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'usuario',
   'Hola, hice un pedido ayer pero no lo veo en mi historial de compras, ¿pueden ayudarme?', now() - interval '8 days'),
  ('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', 'agente',
   'Hola María, gracias por escribirnos. ¿Podrías confirmarme el correo con el que compraste? Reviso tu cuenta al toque.', now() - interval '8 days' + interval '5 minutes'),
  ('92000000-0000-0000-0000-000000000003', '91000000-0000-0000-0000-000000000001', 'usuario',
   'Sí, es buyer1@mercadotech.test', now() - interval '8 days' + interval '10 minutes'),
  ('92000000-0000-0000-0000-000000000004', '91000000-0000-0000-0000-000000000001', 'humano',
   'Ya ubicamos tu pedido, había quedado registrado correctamente. Puede que se deba a un problema de caché en tu navegador — intenta refrescar la página o cerrar sesión y volver a ingresar. Quedamos atentos por si el problema persiste.', now() - interval '8 days' + interval '40 minutes'),

  ('92000000-0000-0000-0000-000000000005', '91000000-0000-0000-0000-000000000002', 'usuario',
   'Compré un monitor pero me gustaría cambiarlo por uno más grande, ¿es posible?', now() - interval '1 day'),
  ('92000000-0000-0000-0000-000000000006', '91000000-0000-0000-0000-000000000002', 'agente',
   'Claro que sí, tienes hasta 7 días calendario desde la entrega para solicitar un cambio, siempre que el producto esté en su empaque original. Te ayudo a coordinar el cambio, ¿me confirmas el número de tu pedido?', now() - interval '1 day' + interval '15 minutes');


-- ============================================================================
-- RESUMEN — conteos y credenciales
-- ============================================================================
--
-- Conteos esperados tras `supabase db reset`:
--   profiles           6   (3 buyer, 2 seller, 1 admin)
--   categories         8
--   products          16   (2 inactivos: ...015, ...016 · 1 con stock 0: ...007)
--   product_images    36   (12 productos x2 + 4 productos "estrella" x3)
--   orders             6   (1 pendiente, 1 pagado, 1 enviado, 2 entregado, 1 cancelado)
--   order_items        8
--   questions          7   (4 respondidas, 3 sin responder)
--   reviews            3   (todas sobre pedidos 'entregado')
--   favorites          6
--   product_views     10
--   support_articles  10   (3 envíos, 3 pagos, 2 devoluciones, 2 cuenta)
--   support_tickets    2   (1 resuelto, 1 abierto)
--   ticket_messages    6
--
-- Credenciales (contraseña común de laboratorio para los 6):
--   MercadoTech123!
--
--   buyer1@mercadotech.test   — María Fernanda Quispe   — role: buyer
--   buyer2@mercadotech.test   — Jorge Alonso Ramírez    — role: buyer
--   buyer3@mercadotech.test   — Lucía Andrea Torres     — role: buyer
--   seller1@mercadotech.test — TecnoImports Perú        — role: seller (8 productos)
--   seller2@mercadotech.test — Andes Digital Store      — role: seller (8 productos)
--   admin@mercadotech.test    — Soporte MercadoTech      — role: admin
-- ============================================================================
