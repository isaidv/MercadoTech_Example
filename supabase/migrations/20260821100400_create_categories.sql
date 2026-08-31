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
