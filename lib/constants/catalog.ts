/**
 * Tunables del catálogo (Fase 3.4). Ver "Convenciones transversales >
 * Tunables nuevos en lib/constants/" de MercadoTech_sesion3.md — cada
 * valor lleva el comentario que justifica su elección.
 */

/**
 * Tamaño de página del grid de productos. `ProductGrid` usa 1/2/3/4
 * columnas según el breakpoint (móvil/tablet/desktop/wide) — 12 es
 * múltiplo de las tres cantidades relevantes (2, 3, 4), así que la última
 * fila queda completa en cualquiera de los tres layouts, sin huecos.
 */
export const PRODUCTS_PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

/** Orden cuando no hay `?sort=` en la URL — mismo criterio que "recién publicado primero" de cualquier marketplace. */
export const DEFAULT_SORT: SortOption = "recientes";

/**
 * Rango de precio por defecto de los inputs del `FiltersPanel` (placeholder,
 * no un límite duro). El seed real va de S/ 129 a S/ 2599 — 0–10000 deja
 * margen holgado para productos futuros sin quedar absurdamente alto.
 */
export const DEFAULT_MIN_PRICE = 0;
export const DEFAULT_MAX_PRICE = 10000;
