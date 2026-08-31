-- Extensiones requeridas por el esquema.
--
-- SUPUESTO: usamos gen_random_uuid() (pgcrypto) para las PK, en vez de
-- uuid-ossp/uuid_generate_v4(). Se instala en el esquema "extensions"
-- (convención de Supabase) en lugar de "public", para mantener el
-- catálogo de public limpio de objetos de extensión.
create extension if not exists pgcrypto with schema extensions;
