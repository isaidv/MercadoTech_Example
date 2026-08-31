-- PRODUCT_IMAGES — galería ordenable. El orden lo define `position`; el
-- drag & drop de la sesión 3 actualiza este campo (no hay lógica de
-- reordenamiento en la BD, es responsabilidad del cliente).
create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_path text not null,
  position   integer not null default 0
);

create index product_images_product_id_idx on public.product_images (product_id);

alter table public.product_images enable row level security;
-- Las políticas de RLS se agregan en la Fase 2.3.
