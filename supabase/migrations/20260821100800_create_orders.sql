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
