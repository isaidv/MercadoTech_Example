"use client";

import { useEffect, useState } from "react";
import { getProductById, getProductImages, registerView } from "@/services/product.service";
import { getPublicUrl, PRODUCT_IMAGES_BUCKET } from "@/services/storage.service";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils";
import type { Product, ProductGalleryImage } from "@/types/product";

/**
 * Producto + imágenes de la galería (ya con `url` pública resuelta —
 * `getProductImages` solo trae `image_path`; este hook es quien conoce
 * `storage.service`, no `ProductGallery`). Dispara `registerView` al montar
 * SOLO si hay sesión (decisión 14: `product_views.user_id` es `not null` y
 * la policy de INSERT exige `authenticated`) — fire-and-forget con
 * `catch` silencioso: una vista que falla no debe romper ni bloquear la
 * ficha del producto.
 */
export function useProduct(productId: string) {
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductGalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getProductById(productId), getProductImages(productId)])
      .then(([productData, imagesData]) => {
        if (cancelled) return;
        setProduct(productData);
        setImages(
          imagesData.map((image) => ({
            id: image.id,
            url: getPublicUrl(PRODUCT_IMAGES_BUCKET, image.image_path),
            position: image.position,
          })),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "No se pudo cargar el producto."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, retryToken]);

  useEffect(() => {
    if (!user) return;
    registerView(productId, user.id).catch(() => {
      // Fire-and-forget a propósito: una vista es telemetría, no una
      // acción que el usuario esté esperando — nunca debe mostrar error.
    });
  }, [productId, user]);

  const retry = () => setRetryToken((n) => n + 1);

  return { product, images, loading, error, retry };
}
