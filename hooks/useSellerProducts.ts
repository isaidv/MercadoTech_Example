"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { listMyProducts, toggleActive as toggleActiveService, deleteProduct as deleteProductService } from "@/services/seller.service";
import { triggerReindex } from "@/services/indexing-trigger.service";
import { getErrorMessage } from "@/lib/utils";
import type { Product } from "@/types/product";

/** Lista + toggleActive + remove, para /vendedor/productos. */
export function useSellerProducts(sellerId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sellerId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listMyProducts(sellerId)
      .then(setProducts)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = useCallback(
    async (productId: string, isActive: boolean) => {
      const previous = products;
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, is_active: isActive } : p)));
      try {
        await toggleActiveService(productId, isActive);
        // Fire-and-forget (Fase 4.3): refresca la ficha de búsqueda; no
        // bloquea ni puede fallar el toggle en sí.
        void triggerReindex("producto", productId);
      } catch (err) {
        setProducts(previous);
        toast.error(getErrorMessage(err));
      }
    },
    [products],
  );

  const remove = useCallback(
    async (productId: string) => {
      try {
        await deleteProductService(productId);
        // El producto ya no existe: el endpoint de reindex detecta la
        // fuente ausente y borra su ficha en vez de reindexar (decisión 6).
        void triggerReindex("producto", productId);
        toast.success("Producto eliminado");
        load();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [load],
  );

  return { products, loading, error, toggleActive, remove, retry: load };
}
