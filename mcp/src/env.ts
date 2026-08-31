import path from "node:path";

/**
 * Variables de la `.env.local` de la RAÍZ del repo (NO una `.env.local`
 * propia de `mcp/` — una sola fuente de credenciales, decisión 2 de
 * `MercadoTech_sesion5.md`) que `context.ts` necesita para construir sus
 * clientes de Supabase.
 */
const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/**
 * Carga `.env.local` de la raíz del repo a `process.env` — mismo patrón
 * EXACTO que `scripts/index-all.ts` (Fase 4.3, ya probado en este repo):
 * Next.js carga `.env.local` solo al arrancar, pero un proceso Node/tsx
 * standalone no (lección 9 de la Guía de `MercadoTech_sesion5.md`). Tiene
 * que correr ANTES de crear cualquier cliente de Supabase.
 *
 * Asume que el proceso arranca desde la RAÍZ del repo (`npx tsx
 * mcp/src/index.ts`, o `.mcp.json` en la Fase 5.5) — mismo requisito que
 * el alias `@/*` (decisión 7): `process.cwd()` tiene que ser la raíz, no
 * `mcp/`.
 *
 * A diferencia de `index-all.ts` (que deja que `process.loadEnvFile` tire
 * su propio error si el archivo no existe), acá se envuelve el fallo con
 * un mensaje que dice EXACTAMENTE qué hacer — y además se valida que las
 * variables realmente necesarias hayan quedado seteadas, no solo que el
 * archivo se haya podido leer (podría existir e igual faltarle una línea).
 */
export function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");

  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      `No se pudo cargar "${envPath}". El servidor MCP debe arrancar desde la RAÍZ del repo ` +
        `(ej. "npx tsx mcp/src/index.ts" desde ahí, nunca desde dentro de mcp/). Causa original: ${cause}`,
    );
  }

  const missing = REQUIRED_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables en .env.local: ${missing.join(", ")}. Copiá .env.example a .env.local ` +
        `en la raíz del repo y completá los valores (ver CLAUDE.md, "Variables de entorno").`,
    );
  }
}
