import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para el navegador.
 *
 * Usa la clave pública `anon`: todas las operaciones respetan Row Level
 * Security (RLS) según el usuario autenticado (o `anon` si no hay sesión).
 * Tipado con `Database` (generado en la Fase 3.1) desde la Fase 3.3, cuando
 * empieza a haber `services/` reales que se benefician de `.from(...)` tipado.
 *
 * Uso: llamar `createClient()` dentro de un Client Component o en un
 * `service` que reciba el cliente por inyección (ver `services/`).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
