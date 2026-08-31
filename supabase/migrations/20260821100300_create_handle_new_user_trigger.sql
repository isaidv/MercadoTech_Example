-- Trigger que crea automáticamente el profile al registrarse un usuario en
-- auth.users. SECURITY DEFINER + search_path fijo porque el trigger corre
-- con los privilegios de quien lo definió (no del usuario que se registra,
-- que aún no tiene permisos sobre public.profiles) y para blindarlo contra
-- "search_path hijacking".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SUPUESTO: display_name usa el metadata de registro si vino
  -- (raw_user_meta_data->>'display_name', lo típico al mandar `options.data`
  -- en supabase.auth.signUp) y si no, cae al local-part del email. role y
  -- created_at quedan en sus defaults ('buyer' / now()) definidos en la tabla.
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
