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
