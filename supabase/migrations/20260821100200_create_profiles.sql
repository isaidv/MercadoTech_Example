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
