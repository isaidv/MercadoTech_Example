import type { Database } from "@/types/database";
import type { OrderStatus } from "@/lib/constants/roles";

/**
 * Mismo aviso que en `types/product.ts`: `orders.Row.total` y
 * `order_items.Row.price_snapshot` vienen tipados `number` por el
 * generador, pero PostgREST los sirve como STRING en runtime (`numeric`).
 * `total`/`price_snapshot` acá documentan el valor YA parseado por el
 * service, no lo que promete el tipo generado.
 */
export type Order = Omit<
  Database["public"]["Tables"]["orders"]["Row"],
  "status"
> & {
  status: OrderStatus;
  total: number;
};

export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"] & {
  price_snapshot: number;
};

export type CartItem = Database["public"]["Tables"]["cart_items"]["Row"];

/**
 * Snapshot del producto para mostrar en el carrito (Fase 3.6) — precio y
 * stock ACTUALES, no el snapshot del pedido (ese recién existe después del
 * checkout, dentro de `OrderItem`). Vive acá, no en `services/cart.service.ts`,
 * para que `components/cart/CartItemRow.tsx` lo importe sin que
 * `components/` termine importando de `services/` (regla de la sesión 3) —
 * mismo criterio que `ProductCatalogFilters` en `types/product.ts`.
 */
export type CartProductSnapshot = {
  id: string;
  title: string;
  price: number;
  stock: number;
  image_url: string | null;
};

/** `product` es `null` cuando `products_select_active_or_own` lo oculta (el vendedor lo desactivó) — `CartItemRow` lo muestra como "ya no disponible". */
export type CartItemWithProduct = CartItem & {
  product: CartProductSnapshot | null;
};

/**
 * Pedido del vendedor (Fase 3.7) — `items` trae SOLO los ítems de ESE
 * vendedor dentro del pedido, nunca el pedido completo: un pedido
 * multi-vendedor mezcla ítems de otros vendedores que este ni siquiera
 * puede ver (RLS de `order_items` los filtra). `OrderKanbanCard` calcula su
 * propio total a partir de `items`, nunca de `orders.total`. Vive acá, no en
 * `services/seller.service.ts`, para que `components/seller/` lo importe
 * sin que `components/` termine importando de `services/`.
 */
export type SellerOrder = Order & { items: OrderItem[] };
