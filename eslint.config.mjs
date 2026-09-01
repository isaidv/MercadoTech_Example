import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Copia de referencia del canvas de diseño (bundle de terceros
      // generado, no es código de la app — ver docs/design-reference/README.md).
      "docs/design-reference/**",
      // Carpeta de trabajo interna del Supabase CLI (archivos efímeros que
      // regenera en cada `supabase start`, no forman parte del repo lógico).
      "supabase/.temp/**",
      // `mcp/node_modules` ya cae bajo `node_modules/**` de arriba (el
      // patrón matchea en cualquier profundidad), pero `mcp/dist` NO:
      // sin este ignore, `npm run build` en `mcp/` deja un bundle de
      // terceros (el SDK de MCP vendorizado por tsup, minificado) que
      // ESLint intenta lintear como si fuera código propio — 174
      // problemas falsos, todos del SDK, ninguno de este repo.
      "mcp/dist/**",
      // Reporte HTML de cobertura (Fase 6.1, `npm run test:coverage`) — es
      // JS de terceros vendorizado por el reporter de Istanbul/v8, no
      // código propio, y se regenera en cada corrida (ya está en
      // `.gitignore`). Mismo motivo que `mcp/dist/**` arriba.
      "coverage/**",
      // Reporte HTML de Playwright (Fase 6.5, `npm run test:e2e`) — cuando
      // un test falla, el reporte empaqueta su propio visor de trazas
      // (CodeMirror, minificado por Playwright) dentro de
      // `e2e/playwright-report/trace/assets/`. Mismo motivo que
      // `mcp/dist/**`/`coverage/**` arriba: JS de terceros, no código
      // propio, y ya está en `.gitignore`. `e2e/test-results/` (screenshots/
      // videos/traces de fallos) igual, por las dudas.
      "e2e/playwright-report/**",
      "e2e/test-results/**",
    ],
  },
  {
    // Fase 6.4 — `e2e/fixtures/test.ts` extiende `test` de Playwright con
    // `base.extend({ buyerPage: async ({page}, use) => ... })`: ese
    // segundo parámetro se llama literalmente `use`, por convención del
    // propio Playwright (ver su documentación de fixtures), nada que ver
    // con el `use()` de React. `react-hooks/rules-of-hooks` (heredada de
    // `next/core-web-vitals`) no distingue el nombre del contexto y lo
    // marca como un Hook de React mal llamado — falso positivo conocido
    // al mezclar Playwright con este plugin. `e2e/` no es código React
    // (es Node/Playwright puro), así que la regla no aplica ahí.
    files: ["e2e/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default eslintConfig;
