-- supabase/schema.sql
--
-- COPIA DE REFERENCIA, NO ES LA FUENTE DE VERDAD.
-- La fuente de verdad son las migraciones en supabase/migrations/, aplicadas
-- en orden por `supabase db reset`. Este archivo es solo para lectura rápida
-- del esquema completo sin tener que abrir 18 archivos; se regenera a mano
-- (concatenando las migraciones) cada vez que se agrega una migración de
-- esquema. Si este archivo y las migraciones alguna vez difieren, ganan
-- las migraciones.
--
-- Generado a partir de (en este orden):
--   20260821100000_enable_extensions.sql
--   20260821100100_create_set_updated_at_function.sql
--   20260821100200_create_profiles.sql
--   20260821100300_create_handle_new_user_trigger.sql
--     (función reemplazada por 20260821130000_handle_new_user_metadata.sql
--      — Fase 3.3 — se muestra abajo ya con el reemplazo aplicado)
--   20260821100400_create_categories.sql
--   20260821100500_create_products.sql
--   20260821100600_create_product_images.sql
--   20260821100700_create_cart_items.sql
--   20260821100800_create_orders.sql
--   20260821100900_create_order_items.sql
--   20260821101000_create_questions.sql
--   20260821101100_create_reviews.sql
--   20260821101200_create_favorites.sql
--   20260821101300_create_product_views.sql
--   20260821101400_create_support_articles.sql
--   20260821101500_create_support_tickets.sql
--   20260821101600_create_ticket_messages.sql
--   20260821101700_create_checkout_function.sql
--   20260821130000_handle_new_user_metadata.sql (Fase 3.3, ya aplicado arriba)
--   20260826140000_enable_pgvector.sql (Fase 4.1)
--   20260826140100_create_knowledge_embeddings.sql (Fase 4.1)
--   20260826140200_create_match_knowledge.sql (Fase 4.1)
--
-- NO incluye 20260821110000_create_rls_policies.sql, 20260821120000_create_storage_buckets.sql
-- ni 20260826140300_knowledge_embeddings_rls.sql (ver supabase/policies.sql,
-- que sí es su copia de referencia) — este archivo cubre solo el DDL de
-- tablas/funciones "de esquema", RLS y Storage se documentan aparte.


-- ============================================================
-- 20260821100000_enable_extensions.sql
-- ============================================================
-- Extensiones requeridas por el esquema.
--
-- SUPUESTO: usamos gen_random_uuid() (pgcrypto) para las PK, en vez de
-- uuid-ossp/uuid_generate_v4(). Se instala en el esquema "extensions"
-- (convención de Supabase) en lugar de "public", para mantener el
-- catálogo de public limpio de objetos de extensión.
create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- 20260821100100_create_set_updated_at_function.sql
-- ============================================================
-- Función trigger compartida para mantener `updated_at` al día.
--
-- Solo dos tablas de este esquema tienen columna updated_at (products,
-- support_articles); en vez de repetir la lógica dos veces, o depender de
-- la extensión moddatetime (no pedida por la spec), se define una función
-- reutilizable aquí, antes de las tablas que la usan.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 20260821100200_create_profiles.sql
-- ============================================================
-- PROFILES — 1:1 con auth.users. Mismo UUID como PK y FK: no hay un id
-- propio autogenerado porque la identidad la posee auth.users; profiles solo
-- extiende esa fila con datos de dominio (rol, nombre visible, etc.).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone        text,
  -- El propio usuario no debe poder cambiar su rol: eso se hace cumplir con
  -- una política/trigger de RLS en la Fase 2.3, no aquí (esto es solo el
  -- check de valores válidos).
  role         text not null default 'buyer'
                 check (role in ('buyer', 'seller', 'admin')),
  avatar_path  text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821100300_create_handle_new_user_trigger.sql
-- (función reemplazada por 20260821130000_handle_new_user_metadata.sql, Fase 3.3)
-- ============================================================
-- Trigger que crea automáticamente el profile al registrarse un usuario en
-- auth.users. SECURITY DEFINER + search_path fijo porque el trigger corre
-- con los privilegios de quien lo definió (no del usuario que se registra,
-- que aún no tiene permisos sobre public.profiles) y para blindarlo contra
-- "search_path hijacking".
--
-- Es también el ÚNICO lugar del ciclo de vida donde `role` puede fijarse
-- distinto de 'buyer': el trigger `prevent_profile_role_self_change`
-- (20260821110000_create_rls_policies.sql, ver supabase/policies.sql) solo
-- corre en UPDATE y bloquea que el propio usuario cambie su rol después de
-- creado — así que `register()` nunca hace un UPDATE separado a
-- profiles.role, quedaría rechazado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- display_name: metadata de registro si vino (raw_user_meta_data->>'display_name',
  -- lo que manda `options.data` en supabase.auth.signUp) y si no, local-part del email.
  -- role: solo 'buyer'/'seller' desde metadata; cualquier otro valor —
  -- incluido 'admin' manipulado a mano, o ausente — cae a 'buyer'. Nunca se
  -- puede crear un admin desde el registro.
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data ->> 'role' in ('buyer', 'seller')
        then new.raw_user_meta_data ->> 'role'
      else 'buyer'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- 20260821100400_create_categories.sql
-- ============================================================
-- CATEGORIES — árbol simple de categorías tecnológicas (self-referencing).
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  -- SUPUESTO: ON DELETE SET NULL — borrar una categoría padre no debe
  -- arrastrar en cascada a sus hijas; quedan como categorías "huérfanas"
  -- (sin padre) hasta que un admin las reasigne.
  parent_id  uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821100500_create_products.sql
-- ============================================================
-- PRODUCTS
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  -- SUPUESTO: ON DELETE RESTRICT en seller_id/category_id — un vendedor o
  -- una categoría con productos existentes no se puede borrar sin antes
  -- reasignar/eliminar esos productos explícitamente. Evita perder
  -- inventario/historial por un borrado en cascada accidental.
  seller_id   uuid not null references public.profiles (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  title       text not null,
  description text,
  brand       text,
  condition   text not null default 'nuevo'
                check (condition in ('nuevo', 'usado', 'reacondicionado')),
  price       numeric(12, 2) not null check (price > 0),
  stock       integer not null default 0 check (stock >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger set_products_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- Filtros más frecuentes del catálogo: productos de un vendedor, de una
-- categoría, y el filtro is_active que aplica en (casi) todas las queries
-- públicas del marketplace.
create index products_seller_id_idx on public.products (seller_id);
create index products_category_id_idx on public.products (category_id);
create index products_is_active_idx on public.products (is_active);

alter table public.products enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821100600_create_product_images.sql
-- ============================================================
-- PRODUCT_IMAGES — galería ordenable. El orden lo define `position`; el
-- drag & drop de la sesión 3 actualiza este campo (no hay lógica de
-- reordenamiento en la BD, es responsabilidad del cliente).
create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_path text not null,
  position   integer not null default 0
);

create index product_images_product_id_idx on public.product_images (product_id);

alter table public.product_images enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821100700_create_cart_items.sql
-- ============================================================
-- CART_ITEMS — carrito persistente por usuario.
create table public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  -- Un producto aparece una sola vez por carrito: agregar el mismo
  -- producto de nuevo debe sumar cantidad (UPSERT en el service), no crear
  -- una fila duplicada.
  unique (user_id, product_id)
);

create index cart_items_user_id_idx on public.cart_items (user_id);

alter table public.cart_items enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821100800_create_orders.sql
-- ============================================================
-- ORDERS
create table public.orders (
  id         uuid primary key default gen_random_uuid(),
  -- SUPUESTO: ON DELETE RESTRICT — un pedido es un registro de negocio;
  -- borrar el profile del comprador no debe hacer desaparecer su historial
  -- de compras. La spec tampoco define una política DELETE para orders
  -- (solo cancelación vía UPDATE de status), así que en la práctica nunca
  -- se ejecuta este RESTRICT desde la app.
  buyer_id   uuid not null references public.profiles (id) on delete restrict,
  status     text not null default 'pendiente'
               check (status in ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado')),
  -- SUPUESTO: la spec no pide explícitamente un check aquí (solo lo exige
  -- para price/stock/rating), pero total negativo no tiene sentido de
  -- negocio; se agrega como guardrail de integridad.
  total      numeric(12, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create index orders_buyer_id_idx on public.orders (buyer_id);

alter table public.orders enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821100900_create_order_items.sql
-- ============================================================
-- ORDER_ITEMS — snapshot de título y precio: si el vendedor luego edita el
-- producto (o lo borra), el pedido histórico no cambia.
create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  -- SUPUESTO: la spec no dice explícitamente que sea nullable, pero el
  -- propósito declarado del snapshot es que el historial sobreviva a
  -- cambios del producto — incluido su borrado. Por eso product_id es
  -- nullable con ON DELETE SET NULL: se pierde el enlace de navegación al
  -- producto, pero title_snapshot/price_snapshot preservan el registro.
  product_id     uuid references public.products (id) on delete set null,
  -- Denormalizado a propósito (duplica products.seller_id) para que la
  -- política RLS del vendedor pueda filtrar sus order_items sin tener que
  -- hacer JOIN contra products en cada chequeo de fila.
  -- SUPUESTO: ON DELETE RESTRICT — mismo criterio que orders.buyer_id.
  seller_id      uuid not null references public.profiles (id) on delete restrict,
  title_snapshot text not null,
  price_snapshot numeric(12, 2) not null check (price_snapshot > 0),
  quantity       integer not null check (quantity > 0)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_seller_id_idx on public.order_items (seller_id);

alter table public.order_items enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821101000_create_questions.sql
-- ============================================================
-- QUESTIONS — preguntas y respuestas estilo Mercado Libre.
create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  -- SUPUESTO: ON DELETE CASCADE — es contenido propio del usuario (como
  -- favorites/cart_items); si borra su cuenta, sus preguntas se van con él.
  user_id     uuid not null references public.profiles (id) on delete cascade,
  question    text not null,
  answer      text,
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);

create index questions_product_id_idx on public.questions (product_id);

alter table public.questions enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821101100_create_reviews.sql
-- ============================================================
-- REVIEWS — reseñas verificadas: solo de quien compró (la verificación en
-- sí, "el pedido de order_id contiene product_id y está entregado", se
-- aplica en la política RLS de INSERT, Fase 2.3 — aquí solo la integridad
-- referencial y el rango de rating).
create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- SUPUESTO: ON DELETE CASCADE — contenido propio del usuario.
  buyer_id   uuid not null references public.profiles (id) on delete cascade,
  -- SUPUESTO: ON DELETE RESTRICT — la spec no define una política DELETE
  -- para orders, así que en la práctica esto nunca se dispara desde la app.
  order_id   uuid not null references public.orders (id) on delete restrict,
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  -- Una reseña por comprador y producto.
  unique (product_id, buyer_id)
);

create index reviews_product_id_idx on public.reviews (product_id);

alter table public.reviews enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821101200_create_favorites.sql
-- ============================================================
-- FAVORITES
create table public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Un like/favorito único por (usuario, producto): evita duplicados por
  -- doble clic y simplifica el toggle en el frontend.
  unique (user_id, product_id)
);

create index favorites_user_id_idx on public.favorites (user_id);

alter table public.favorites enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821101300_create_product_views.sql
-- ============================================================
-- PRODUCT_VIEWS — cada apertura de un producto es un evento (sin contador
-- agregado: los conteos/estadísticas se derivan con COUNT() sobre esta
-- tabla, no se mantiene una columna de contador desnormalizada).
create table public.product_views (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- SUPUESTO: ON DELETE CASCADE — contenido propio del usuario. No hay
  -- vistas anónimas: la política RLS de INSERT (Fase 2.3) solo permite
  -- `authenticated`, así que user_id siempre existe.
  user_id    uuid not null references public.profiles (id) on delete cascade,
  viewed_at  timestamptz not null default now()
);

create index product_views_product_id_idx on public.product_views (product_id);

alter table public.product_views enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821101400_create_support_articles.sql
-- ============================================================
-- SUPPORT_ARTICLES — base de conocimiento (FAQ) para el RAG de soporte
-- (sesión 4).
create table public.support_articles (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text not null,
  -- SUPUESTO: la spec da 'envíos'/'pagos'/'devoluciones'/'cuenta' como
  -- EJEMPLO ("ej. ..."), no como enum cerrado (a diferencia de
  -- condition/status, donde sí pide "check" explícitamente) — se deja como
  -- texto libre para no inventar una restricción no pedida.
  category     text,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger set_support_articles_updated_at
  before update on public.support_articles
  for each row
  execute function public.set_updated_at();

alter table public.support_articles enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821101500_create_support_tickets.sql
-- ============================================================
-- SUPPORT_TICKETS — soporte (los usa el agente de voz en la sesión 8).
create table public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  -- SUPUESTO: ON DELETE RESTRICT — es un registro de negocio/soporte, no
  -- contenido descartable; mismo criterio que orders.buyer_id.
  user_id    uuid not null references public.profiles (id) on delete restrict,
  subject    text not null,
  status     text not null default 'abierto'
               check (status in ('abierto', 'en_proceso', 'resuelto', 'cerrado')),
  channel    text not null default 'chat'
               check (channel in ('chat', 'voz')),
  created_at timestamptz not null default now()
);

create index support_tickets_user_id_idx on public.support_tickets (user_id);

alter table public.support_tickets enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821101600_create_ticket_messages.sql
-- ============================================================
-- TICKET_MESSAGES
create table public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets (id) on delete cascade,
  sender_role text not null check (sender_role in ('usuario', 'agente', 'humano')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index ticket_messages_ticket_id_idx on public.ticket_messages (ticket_id);

alter table public.ticket_messages enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.

-- ============================================================
-- 20260821101700_create_checkout_function.sql
-- ============================================================
-- create_order_from_cart: convierte el carrito de un comprador en un pedido,
-- en UNA transacción. Una llamada a una función plpgsql es, por defecto,
-- atómica dentro de la transacción que la invoca: cualquier `raise
-- exception` sin capturar aborta toda la transacción (incluyendo el INSERT
-- en orders hecho antes del error), así que no hace falta un rollback
-- manual.
create or replace function public.create_order_from_cart(p_buyer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id    uuid;
  v_total       numeric(12, 2) := 0;
  v_item        record;
  v_cart_count  integer;
begin
  -- La función es SECURITY DEFINER (corre con privilegios del dueño, no del
  -- caller) precisamente para poder leer/escribir cart_items, products y
  -- orders sin depender de las políticas RLS del caller. Por eso esta
  -- validación es la única barrera real: nadie puede generar un pedido a
  -- nombre de otro usuario.
  if p_buyer_id is distinct from auth.uid() then
    raise exception 'p_buyer_id (%) no coincide con el usuario autenticado', p_buyer_id;
  end if;

  select count(*) into v_cart_count
  from public.cart_items
  where user_id = p_buyer_id;

  if v_cart_count = 0 then
    raise exception 'El carrito está vacío';
  end if;

  insert into public.orders (buyer_id, status, total)
  values (p_buyer_id, 'pendiente', 0)
  returning id into v_order_id;

  -- `for update of p` bloquea cada fila de products mientras dura la
  -- transacción: si dos checkouts concurrentes compiten por el mismo
  -- producto, el segundo espera a que el primero termine (commit o
  -- rollback) antes de leer el stock, evitando vender más unidades de las
  -- que hay (race condition clásica de "leer stock, decidir, escribir stock").
  for v_item in
    select
      ci.product_id,
      ci.quantity,
      p.title,
      p.price,
      p.stock,
      p.is_active,
      p.seller_id
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.user_id = p_buyer_id
    for update of p
  loop
    if not v_item.is_active then
      raise exception 'El producto "%" ya no está disponible', v_item.title;
    end if;

    if v_item.stock < v_item.quantity then
      raise exception
        'Stock insuficiente para "%": disponible %, solicitado %',
        v_item.title, v_item.stock, v_item.quantity;
    end if;

    insert into public.order_items (
      order_id, product_id, seller_id, title_snapshot, price_snapshot, quantity
    )
    values (
      v_order_id, v_item.product_id, v_item.seller_id, v_item.title, v_item.price, v_item.quantity
    );

    update public.products
    set stock = stock - v_item.quantity
    where id = v_item.product_id;

    v_total := v_total + (v_item.price * v_item.quantity);
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  delete from public.cart_items where user_id = p_buyer_id;

  return v_order_id;
end;
$$;

-- Por defecto Postgres otorga EXECUTE a PUBLIC en toda función nueva.
-- Se revoca explícitamente y se re-otorga solo a authenticated: un usuario
-- anónimo no tiene carrito ni sesión, así que nunca debería poder llamarla.
revoke execute on function public.create_order_from_cart(uuid) from public;
revoke execute on function public.create_order_from_cart(uuid) from anon;
grant execute on function public.create_order_from_cart(uuid) to authenticated;

-- ============================================================
-- 20260826140000_enable_pgvector.sql
-- ============================================================
-- pgvector agrega el tipo `vector` y los operadores de distancia (<->, <=>,
-- <#>) que usa knowledge_embeddings y su índice HNSW. Igual que pgcrypto,
-- se instala en "extensions", no en "public".
create extension if not exists vector with schema extensions;

-- ============================================================
-- 20260826140100_create_knowledge_embeddings.sql
-- ============================================================
-- FASE 4.1 — knowledge_embeddings: el "fichero" del bibliotecario (ver
-- MercadoTech_sesion4.md). UNA tabla para las dos fuentes que esta sesión
-- indexa (products y support_articles), discriminada por source_type — no
-- dos tablas gemelas: el patrón de búsqueda es idéntico para ambas.
create table public.knowledge_embeddings (
  id           uuid primary key default gen_random_uuid(),
  source_type  text not null
                 check (source_type in ('producto', 'articulo_soporte')),
  -- SUPUESTO: SIN foreign key — source_id apunta a products.id o a
  -- support_articles.id según source_type, dos tablas origen distintas.
  -- Consecuencia: puede quedar huérfana si se borra la fuente; el service
  -- de búsqueda la descarta al hidratar, y el reindexado la borra explícito.
  source_id    uuid not null,
  chunk_index  integer not null default 0,
  content      text not null,
  -- Dimensión 1024 porque el proveedor de embeddings es Voyage AI
  -- (voyage-4-lite). Cambiar de modelo a otra dimensión exige
  -- `alter column embedding type vector(N)` + recrear índice y función.
  embedding    vector(1024) not null,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  unique (source_type, source_id, chunk_index)
);

create index knowledge_embeddings_embedding_idx
  on public.knowledge_embeddings
  using hnsw (embedding vector_cosine_ops);

alter table public.knowledge_embeddings enable row level security;
-- Las políticas de RLS se agregan en la Fase 4.1 (ver policies.sql).

-- ============================================================
-- 20260826140200_create_match_knowledge.sql
-- ============================================================
-- FASE 4.1 — match_knowledge: dado el embedding de una pregunta, devuelve
-- las fichas más parecidas por significado. SECURITY INVOKER (a diferencia
-- de create_order_from_cart): solo LEE knowledge_embeddings, una tabla
-- donde authenticated ya tiene SELECT — debe respetar la visibilidad del
-- caller, no saltársela.
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
-- `extensions` además de `public`: ahí vive el operador `<=>` de pgvector
-- — sin esto, `<=>` no resuelve dentro del cuerpo de la función aunque la
-- tabla se haya creado bien (el search_path de la sesión de migración sí
-- incluye extensions; el de esta función, fijado, no lo incluía por
-- defecto).
set search_path = public, extensions
as $$
  select
    ke.source_type,
    ke.source_id,
    ke.content,
    ke.metadata,
    1 - (ke.embedding <=> query_embedding) as similarity
  from public.knowledge_embeddings ke
  where (p_source_type is null or ke.source_type = p_source_type)
    and 1 - (ke.embedding <=> query_embedding) >= similarity_threshold
  order by ke.embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_knowledge(vector, text, int, float) from public;
revoke execute on function public.match_knowledge(vector, text, int, float) from anon;
grant execute on function public.match_knowledge(vector, text, int, float) to authenticated;
