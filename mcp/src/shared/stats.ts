import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { listCategories } from "@/services/category.service";
import { listActiveProducts } from "@/services/product.service";

type Client = SupabaseClient<Database>;

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

/**
 * DERIVACIÓN (Fase 5.3, lección 6) — no existe un service que devuelva
 * categorías CON conteo de productos; `category.service.listCategories`
 * solo trae la lista. Se compone: una llamada a `listCategories` + una
 * llamada a `listActiveProducts({categorySlug}, ...)` POR categoría,
 * leyendo `.total` (el `count: "exact"` que ya calcula Postgres, no un
 * conteo hecho a mano sobre `.items`, que solo trae la página actual).
 * Es N+1 a propósito — son 8 categorías en este catálogo, y evita
 * escribir una query de agregación nueva que no vive en ningún service.
 * Usada por `list_categories` (tool #3) y `get_store_stats` (tool #9).
 */
export async function getCategoriesWithCounts(supabase: Client): Promise<CategoryWithCount[]> {
  const categories = await listCategories(supabase);
  return Promise.all(
    categories.map(async (category) => {
      const { total } = await listActiveProducts({ categorySlug: category.slug }, supabase);
      return { id: category.id, name: category.name, slug: category.slug, productCount: total };
    }),
  );
}

export type TopSellingProduct = {
  productId: string | null;
  title: string;
  unitsSold: number;
};

/**
 * DERIVACIÓN (Fase 5.3, lección 6) — "top vendidos" no existe como
 * service (ningún hook/página de la app web lo necesitó hasta ahora).
 * Consulta agregada DIRECTA sobre `order_items` — mismo patrón que cita
 * la propia Guía como precedente aceptado ("así lo resolvió ReadHub con
 * `authors`/`stats`"): cuando de verdad no hay service que componer, la
 * agregación vive acá, en `shared/`, nunca en `services/` ni repetida
 * dentro de la tool. Usa `admin` (RLS de `order_items` solo permite
 * comprador/vendedor-con-ítems/admin — ver tool #10 y `get_store_stats`
 * para el mismo motivo).
 *
 * Cuenta `quantity` por `product_id`, EXCLUYENDO pedidos `cancelado`
 * (un pedido cancelado no es una venta real). Usa `title_snapshot` (ya
 * guardado en cada `order_item`) para el título — evita otra ronda de
 * `getProductById` por cada producto vendido.
 */
export async function getTopSellingProducts(admin: Client, limit: number): Promise<TopSellingProduct[]> {
  const { data, error } = await admin
    .from("order_items")
    .select("product_id, title_snapshot, quantity, orders!inner(status)");
  if (error) throw error;

  const totals = new Map<string, TopSellingProduct>();
  for (const row of data ?? []) {
    const orderStatus = (row as unknown as { orders: { status: string } }).orders.status;
    if (orderStatus === "cancelado") continue;

    const key = row.product_id ?? row.title_snapshot;
    const existing = totals.get(key);
    if (existing) {
      existing.unitsSold += row.quantity;
    } else {
      totals.set(key, { productId: row.product_id, title: row.title_snapshot, unitsSold: row.quantity });
    }
  }

  return [...totals.values()].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, limit);
}

export type StoreStats = {
  activeProductCount: number;
  categories: CategoryWithCount[];
  topSelling: TopSellingProduct[];
};

const DEFAULT_TOP_SELLING_LIMIT = 5;

/**
 * DERIVACIÓN — compone las dos funciones de arriba + el total de
 * `listActiveProducts`. Se movió acá en la Fase 5.4 (antes vivía inline
 * en `tools/get-store-stats.ts`, Fase 5.3) porque el resource
 * `mercadotech://stats` necesita la MISMA composición ("misma derivación
 * que la tool #9", spec) — así la tool y el resource llaman a esta única
 * función en vez de repetir el `Promise.all` en dos archivos.
 */
export async function getStoreStats(
  anon: Client,
  admin: Client,
  topSellingLimit: number = DEFAULT_TOP_SELLING_LIMIT,
): Promise<StoreStats> {
  const [categories, { total: activeProductCount }, topSelling] = await Promise.all([
    getCategoriesWithCounts(anon),
    listActiveProducts({}, anon),
    getTopSellingProducts(admin, topSellingLimit),
  ]);
  return { activeProductCount, categories, topSelling };
}
