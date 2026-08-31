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
