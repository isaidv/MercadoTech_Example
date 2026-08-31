import type { Database } from "@/types/database";
import type { ProductCondition } from "@/lib/constants/roles";
import type { SortOption } from "@/lib/constants/catalog";

/**
 * Producto de catálogo, con los campos calculados que arma
 * `services/product.service.ts` (Fase 3.4) — no vienen tal cual de la fila.
 *
 * TRAMPA: `supabase gen types` tipa `products.Row.price` como `number`
 * (infiere el tipo lógico de Postgres para `numeric(12,2)`), pero PostgREST
 * en runtime lo serializa como STRING para no perder precisión — ver "Datos
 * que llegan raros desde PostgREST" en MercadoTech_sesion3.md. TypeScript NO
 * va a marcar error si un service reenvía el valor crudo sin `Number()`: el
 * tipo generado miente. `price: number` acá documenta la garantía real
 * (post-parseo en el service), no la del tipo generado.
 * El resto son agregados: portada resuelta, promedio y conteo de reseñas.
 */
export type Product = Omit<
  Database["public"]["Tables"]["products"]["Row"],
  "condition"
> & {
  condition: ProductCondition;
  price: number;
  image_url: string | null;
  average_rating: number | null;
  review_count: number;
};

export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];

/**
 * Imagen de la galería con la URL pública YA resuelta (Fase 3.5).
 * `hooks/useProduct.ts` la arma llamando a `storage.service.getPublicUrl`
 * sobre cada `ProductImage` — `components/product/ProductGallery.tsx` nunca
 * ve un `image_path` crudo ni importa `services/` (regla de la sesión 3).
 */
export type ProductGalleryImage = {
  id: string;
  url: string;
  position: number;
};

export type Category = Database["public"]["Tables"]["categories"]["Row"];

/**
 * Estado de filtros del catálogo (Fase 3.4). Vive acá — no en
 * `hooks/useProducts.ts` ni en `components/catalog/FiltersPanel.tsx` — para
 * que ambos lo importen sin que `components/` termine importando de
 * `hooks/` (prohibido por las convenciones transversales de la sesión 3).
 */
export type ProductCatalogFilters = {
  condition: ProductCondition[];
  minPrice?: number;
  maxPrice?: number;
  sort: SortOption;
};

/**
 * Miniatura reordenable de `SortableImageGallery` (Fase 3.7) — la primera
 * es la portada. `id` es real (fila de `product_images`) en modo edit, o un
 * id temporal (`crypto.randomUUID()`) en modo create mientras la imagen es
 * solo un `File` local; `url` es la pública ya resuelta o un
 * `URL.createObjectURL` de preview. Vive acá para que
 * `components/seller/SortableImageGallery.tsx` la use sin importar de
 * `hooks/useProductForm.ts`.
 */
export type GalleryImageItem = {
  id: string;
  url: string;
};
