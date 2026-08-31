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
