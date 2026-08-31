/**
 * Prefijos de ruta que exigen sesión (Fase 3.3, "Reglas de navegación" de
 * MercadoTech_sesion3.md). `lib/supabase/middleware.ts` redirige a
 * `/login?redirectTo=<ruta>` si no hay usuario y la ruta empieza por
 * alguno de estos prefijos.
 *
 * Deliberadamente NO incluye `/producto`: el detalle de producto es
 * público (RLS ya permite `select` anónimo sobre productos activos —
 * `products_select_active_or_own`). Solo las ACCIONES dentro de esa
 * página (preguntar, marcar favorito, agregar al carrito) requieren
 * sesión, y esas se resuelven con un botón que redirige al hacer clic,
 * no bloqueando la ruta completa en el middleware.
 */
export const PROTECTED_ROUTE_PREFIXES = [
  "/carrito",
  "/pedidos",
  "/favoritos",
  "/vendedor",
  // Fase 4.7 (decisión 1, sesión 4): la IA exige sesión — protege el gasto
  // real de cada consulta a Claude/Voyage, no solo la UX de "inicia sesión".
  "/asistente",
  "/soporte",
] as const;
