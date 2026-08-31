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
