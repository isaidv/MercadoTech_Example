import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * ⚠️ ADVERTENCIA — CLIENTE DE SERVICE ROLE ⚠️
 *
 * Este cliente usa `SUPABASE_SERVICE_ROLE_KEY` y BYPASEA Row Level Security
 * por completo: cualquier query hecha con él ve y modifica TODAS las filas
 * de TODAS las tablas, sin importar el usuario.
 *
 * Reglas de uso:
 * 1. SOLO puede importarse desde código que corre en el servidor (Route
 *    Handlers, Server Actions, scripts de administración). JAMÁS desde
 *    `components/`, `hooks/` ni ningún archivo marcado `"use client"`.
 * 2. La UI nunca debe importar este archivo directa ni indirectamente
 *    (ver regla de capas en `CLAUDE.md`).
 * 3. Úsalo solo para operaciones que explícitamente requieren saltarse RLS
 *    (ej. tareas administrativas, webhooks, trabajos internos verificados
 *    por otro medio) — no como atajo para evitar escribir la política RLS
 *    correcta.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` no lleva prefijo `NEXT_PUBLIC_`: Next.js no la
 * expone al bundle del navegador. Si alguna vez ves este archivo importado
 * desde un componente cliente, es un bug de seguridad — corrígelo.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
