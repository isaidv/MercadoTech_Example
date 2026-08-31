-- REEMPLAZA la función `handle_new_user` de
-- 20260821100300_create_handle_new_user_trigger.sql. No se edita ese
-- archivo (las migraciones ya aplicadas no se tocan): esta migración nueva
-- redefine la función con `create or replace function` — el trigger
-- `on_auth_user_created` ya existe y sigue apuntando a ella por nombre, no
-- hace falta recrearlo.
--
-- Fase 3.3, decisión 1: el registro ahora deja elegir "comprador" o
-- "vendedor" (`RegisterForm`), y ese valor viaja en
-- `raw_user_meta_data.role` vía `options.data` de `supabase.auth.signUp`.
--
-- Por qué ESTE es el único lugar posible donde `role` puede fijarse a
-- 'seller': el trigger `prevent_profile_role_self_change`
-- (20260821110000_create_rls_policies.sql) bloquea en un BEFORE UPDATE
-- cualquier cambio de `profiles.role` salvo que quien ejecute la query sea
-- `service_role` o ya sea `is_admin()` — un usuario recién registrado no es
-- ninguno de los dos, así que un `update profiles set role = 'seller' ...`
-- hecho por el propio cliente después del signUp quedaría rechazado con
-- "No puedes cambiar tu propio rol". Ese trigger solo corre en UPDATE, no
-- en INSERT: el INSERT de `handle_new_user()` (SECURITY DEFINER, privilegios
-- elevados, corre antes de que exista ninguna fila que "cambiar") es la
-- única ventana del ciclo de vida donde `role` puede escribirse distinto
-- del default 'buyer' sin pasar por esa protección. De ahí también la
-- restricción explícita de la Fase 3.3: `register()` NUNCA debe hacer un
-- UPDATE separado a `profiles.role` después del INSERT — además de que el
-- trigger lo bloquearía, sería la puerta que la RLS entera existe para cerrar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    -- Blindaje contra un `role` manipulado a mano (ej. desde DevTools antes
    -- de enviar el signUp): solo 'buyer'/'seller' pasan tal cual; cualquier
    -- otro valor — incluido 'admin', o ausente — cae al default más seguro.
    -- Nunca se puede crear un admin desde el registro.
    case
      when new.raw_user_meta_data ->> 'role' in ('buyer', 'seller')
        then new.raw_user_meta_data ->> 'role'
      else 'buyer'
    end
  );
  return new;
end;
$$;
