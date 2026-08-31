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
