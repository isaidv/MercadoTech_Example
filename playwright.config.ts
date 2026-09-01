import { defineConfig, devices } from "@playwright/test";

/**
 * Configuración de Playwright (Fase 6.4, MercadoTech_sesion6.md) — el
 * patrón viene del CI real de ReadHub, con sus lecciones ya incorporadas
 * (decisiones 8, 11, 12).
 *
 * Los E2E corren SIEMPRE contra Supabase LOCAL (`supabase start` +
 * `supabase db reset` antes de cada corrida completa) — nunca contra el
 * proyecto cloud. Este archivo no lo fuerza (no puede: no controla qué
 * `NEXT_PUBLIC_SUPABASE_URL` tiene `.env.local`), así que queda como
 * requisito documentado, verificado por quien corre la suite.
 */
const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Un `test.only` olvidado nunca debe colarse a CI en verde con el resto de la suite sin correr.
  forbidOnly: isCI,
  // Local: 0 reintentos — un fallo real debe verse a la primera. CI: 2 —
  // absorbe flakiness de infraestructura compartida (decisión 12/CI de ReadHub).
  retries: isCI ? 2 : 0,
  // 1 worker en CI: el stack de Supabase efímero (Fase 6.7) es compartido
  // por todo el job, correr specs en paralelo ahí pisaría datos entre sí.
  workers: isCI ? 1 : undefined,
  // Reporte y artefactos DENTRO de e2e/ (ver .gitignore: e2e/playwright-report, e2e/test-results) — por default Playwright los pone en la raíz del repo.
  reporter: isCI
    ? [["github"], ["html", { outputFolder: "e2e/playwright-report", open: "never" }]]
    : [["html", { outputFolder: "e2e/playwright-report", open: "never" }], ["list"]],
  outputDir: "./e2e/test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  /**
   * Decisión 12: en CI no hay nada corriendo — `build && start` (paridad
   * con producción, la única forma real de probar lo que se va a
   * desplegar). En local, si ya tenés `npm run dev` levantado,
   * `reuseExistingServer` lo reutiliza tal cual en vez de levantar un
   * segundo servidor en el mismo puerto.
   */
  webServer: {
    command: isCI ? "npm run build && npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
