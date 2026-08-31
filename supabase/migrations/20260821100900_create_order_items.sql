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
