import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuración de Vitest (Fase 6.1, MercadoTech_sesion6.md) — el "taller"
 * donde `lib/` y `services/` se prueban sin red: sin Supabase real, sin
 * navegador, en milisegundos. Nada de esto testea todavía nada (Fase 6.2);
 * solo deja el taller andando.
 *
 * `environment: "node"` (decisión 6): esta sesión NO testea componentes
 * React — sin jsdom ni Testing Library, que ni siquiera se instalaron
 * (Prompt 0 las excluyó a propósito). Un test que necesitara el DOM está
 * fuera de alcance de las Fases 6.2/6.3.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Mismo alias que `tsconfig.json` de la raíz (`"@/*": ["./*"]`) — un
      // test importa `@/services/cart.service` exactamente igual que la app.
      "@": __dirname,
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // `mcp/` es un proyecto npm propio con su propio type-check (no se
    // testea desde acá, ver CLAUDE.md); `e2e/` es Playwright, no Vitest
    // (Fase 6.4); `.next/` es build output. `node_modules` ya cae en el
    // exclude por default de Vitest, pero se deja explícito por claridad.
    exclude: ["node_modules/**", "mcp/**", "e2e/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Solo lib/ y services/ (lo que esta sesión testea de verdad,
      // Fases 6.2-6.3) — medirle cobertura a app/, components/ o hooks/
      // no aporta nada mientras no haya tests de componentes (decisión 6).
      include: ["lib/**", "services/**"],
    },
  },
});
