import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { Profile } from "@/types/user";
import type { Role } from "@/lib/constants/roles";

/**
 * Lógica de negocio de autenticación. Cada función acepta el cliente de
 * Supabase por inyección (default: cliente de navegador) para que
 * `hooks/useAuth.ts` y, si algún día hiciera falta, un Route Handler
 * compartan la misma lógica sin duplicarla.
 *
 * `register` NUNCA hace un UPDATE a `profiles.role` después del `signUp`:
 * el trigger `handle_new_user` (20260821130000_handle_new_user_metadata.sql)
 * ya fija el rol correcto dentro del INSERT, y un UPDATE posterior
 * quedaría bloqueado de todos modos por `prevent_profile_role_self_change`
 * (20260821110000_create_rls_policies.sql) — ver el comentario de esa
 * migración para el porqué completo.
 */

type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  role: Role;
};

type LoginInput = {
  email: string;
  password: string;
};

export async function register(
  { email, password, displayName, role }: RegisterInput,
  supabase: SupabaseClient<Database> = createBrowserClient(),
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Único lugar donde viaja el rol elegido: el trigger de la base de
      // datos lo lee de acá (raw_user_meta_data) al crear el profile.
      data: { display_name: displayName, role },
    },
  });

  if (error) throw error;
  return data;
}

export async function login(
  { email, password }: LoginInput,
  supabase: SupabaseClient<Database> = createBrowserClient(),
) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout(supabase: SupabaseClient<Database> = createBrowserClient()) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export type CurrentUser = {
  user: User | null;
  profile: Profile | null;
};

/**
 * Usuario de Auth + su fila de `profiles`. Devuelve `{user: null, profile:
 * null}` (nunca lanza) si no hay sesión — lo consume `useAuth` en cada
 * carga inicial y cada `onAuthStateChange`.
 */
export async function getCurrentUser(
  supabase: SupabaseClient<Database> = createBrowserClient(),
): Promise<CurrentUser> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // `profiles.role` llega tipado `string` desde `types/database.ts` (el
  // generador no conoce el check constraint) — se angosta acá a `Role`
  // igual que en el resto de `types/*.ts` (ver types/user.ts).
  return { user, profile: (profile as Profile) ?? null };
}

/**
 * Suscribe a cambios de sesión (login/logout, refresh de token) y devuelve
 * la función para cancelar la suscripción. Vive acá — no en
 * `hooks/useAuth.ts` — para que ese hook nunca importe
 * `@/lib/supabase/client` directamente (Fase 3.8, verificación de capas:
 * `grep -rl "@/lib/supabase" hooks` debe dar vacío). El hook solo conoce
 * `services/`, nunca el cliente de Supabase en sí — mismo criterio que ya
 * aplicaba a `components/`.
 */
export function subscribeToAuthChange(
  callback: () => void,
  supabase: SupabaseClient<Database> = createBrowserClient(),
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => callback());
  return () => subscription.unsubscribe();
}
