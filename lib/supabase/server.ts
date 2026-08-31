import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers. Lee/escribe la sesión desde las cookies de la petición y
 * respeta RLS según el usuario autenticado.
 *
 * Debe crearse una instancia nueva por request (no se puede compartir a
 * nivel de módulo) porque depende del store de cookies de esa petición.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` fue llamado desde un Server Component. Se puede
            // ignorar si hay middleware refrescando la sesión de usuario
            // (ver `lib/supabase/middleware.ts`).
          }
        },
      },
    },
  );
}
