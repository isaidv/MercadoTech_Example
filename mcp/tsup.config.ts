import path from "node:path";
import { defineConfig } from "tsup";

/**
 * Build de producción del servidor MCP a `dist/` (Fase 5.2).
 *
 * `esbuildOptions.alias` resuelve `@/*` → la RAÍZ del repo (un nivel arriba
 * de `mcp/`), el mismo alias que usa el proyecto web (`tsconfig.json` raíz:
 * `"@/*": ["./*"]`) — así `services/`, `lib/ai/`, `lib/constants/` y
 * `types/` se importan igual en dev (`tsx`, que ya respeta `mcp/tsconfig.json`)
 * y en el build (`tsup`, que NO lee `tsconfig.json` para resolver imports en
 * tiempo de bundling, solo para type-checking — hay que decírselo también acá).
 */
export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  sourcemap: true,
  dts: false,
  esbuildOptions(options) {
    options.alias = {
      "@": path.resolve(import.meta.dirname, ".."),
    };
  },
});
