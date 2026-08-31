import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type McpContext = {
  /** Respeta RLS — es lo que usan la mayoría de las tools/resources (catálogo público, FAQ, etc.). */
  anon: SupabaseClient<Database>;
  /** BYPASEA RLS por completo — SOLO para las tools/resources que la tabla de la Fase 5.3/5.4 marca explícitamente como admin, con el porqué comentado ahí. */
  admin: SupabaseClient<Database>;
};

/**
 * Fábrica de contexto POR LLAMADA (lección 5 de la Guía) — se invoca
 * DENTRO de cada handler de tool/resource/prompt (Fase 5.3+), nunca una
 * sola vez al arrancar el proceso. El servidor MCP vive horas como
 * proceso de larga duración; un cliente creado una única vez al inicio
 * quedaría con su estado de conexión y credenciales congelado durante
 * toda esa vida. Fabricar `{anon, admin}` en cada llamada mantiene cada
 * invocación aislada, sin estado compartido entre tools no relacionadas.
 *
 * NO importa `lib/supabase/admin.ts` — decisión cerrada de la Fase 5.2
 * (`MercadoTech_sesion5.md`, "Decisiones tomadas al validar la spec",
 * fila 1). *Corrección sobre el porqué que da la spec:* dice que
 * `admin.ts` importa el paquete `server-only`, neutralizado solo por el
 * bundler de Next, y que por eso "revienta bajo Node puro" — verificado
 * línea por línea contra `lib/supabase/admin.ts` real de este repo y ESO
 * NO ES CIERTO: el archivo no importa `server-only` en absoluto. La
 * prueba de que funciona bajo Node/tsx sin ese problema ya está en el
 * propio repo: `scripts/index-all.ts` importa y usa
 * `createAdminClient()` de ese mismo archivo, corriendo con `tsx`, sin
 * ningún workaround para `server-only` — solo necesita que `.env.local`
 * esté cargado primero (`loadEnvLocal()`, arriba en `env.ts`).
 *
 * La razón real para que `mcp/` construya sus PROPIOS clientes en vez de
 * importar `admin.ts` es otra, y sigue siendo válida: `admin.ts` mismo
 * documenta en su cabecera que solo debe importarse desde Route
 * Handlers, Server Actions o `scripts/` — la lista cerrada de "código
 * server de Next" del proyecto. Agregar `mcp/` a esa lista acoplaría el
 * servidor MCP a una convención pensada para la app web; construir el
 * cliente acá con `@supabase/supabase-js` directo (mismas opciones que
 * `admin.ts`: sin autorefresh, sin persistencia de sesión) logra
 * exactamente el mismo resultado sin esa dependencia cruzada.
 */
export function createContext(): McpContext {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const clientOptions = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  } as const;

  return {
    anon: createClient<Database>(supabaseUrl, anonKey, clientOptions),
    admin: createClient<Database>(supabaseUrl, serviceRoleKey, clientOptions),
  };
}
