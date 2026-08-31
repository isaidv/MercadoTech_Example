-- Función trigger compartida para mantener `updated_at` al día.
--
-- Solo dos tablas de este esquema tienen columna updated_at (products,
-- support_articles); en vez de repetir la lógica dos veces, o depender de
-- la extensión moddatetime (no pedida por la spec), se define una función
-- reutilizable aquí, antes de las tablas que la usan.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
