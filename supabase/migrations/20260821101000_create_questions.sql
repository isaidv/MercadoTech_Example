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
