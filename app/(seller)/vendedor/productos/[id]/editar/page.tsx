"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useProductForm } from "@/hooks/useProductForm";
import { ProductForm } from "@/components/seller/ProductForm";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { getProductById, getProductImages } from "@/services/product.service";
import { getErrorMessage } from "@/lib/utils";
import type { Product, ProductImage, Category } from "@/types/product";

function EditProductForm({
  sellerId,
  productId,
  product,
  images,
  categories,
}: {
  sellerId: string;
  productId: string;
  product: Product;
  images: ProductImage[];
  categories: Category[];
}) {
  const form = useProductForm({ mode: "edit", sellerId, productId, initialProduct: product, initialImages: images });

  return (
    <ProductForm
      mode="edit"
      values={form.values}
      errors={form.errors}
      images={form.images}
      categories={categories}
      submitting={form.submitting}
      onChange={form.setField}
      onFilesSelected={form.addFiles}
      onRemoveImage={form.removeImage}
      onReorderImages={form.reorder}
      onSubmit={form.submit}
    />
  );
}

/**
 * Client Component a propósito — mismo motivo que las otras páginas
 * dinámicas del proyecto (ver /producto/[id]): un Server Component `async`
 * envolviendo un árbol cliente en Suspense deja el fallback trabado acá.
 * Carga el producto+imágenes con un efecto propio (no `useProduct` de la
 * Fase 3.5: ese hook resuelve las imágenes a solo `{id,url,position}` para
 * la galería pública, y acá hace falta también `image_path` crudo para
 * poder borrar/reordenar en Storage).
 */
export default function VendedorEditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { profile } = useAuth();
  const { categories } = useCategories();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getProductById(id), getProductImages(id)])
      .then(([productData, imagesData]) => {
        if (cancelled) return;
        setProduct(productData);
        setImages(imagesData);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !product || !profile) {
    return <ErrorState description={error ?? "No encontramos este producto."} />;
  }

  // `products_select_active_or_own` es pública para productos ACTIVOS — un
  // vendedor puede leer (GET) el producto de otro exactamente igual que
  // cualquier comprador vería su ficha. La escritura de todos modos está
  // bloqueada por `products_update_own`/`product_images_*_own_product`
  // (confirmado: un UPDATE forzado no cambia nada), pero mostrarle a
  // seller2 el formulario "editable" de un producto de seller1 es una mala
  // experiencia igual — se corta acá, antes de montar el formulario.
  if (product.seller_id !== profile.id) {
    return <ErrorState description="No encontramos este producto." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Editar producto</h1>
      <EditProductForm sellerId={profile.id} productId={id} product={product} images={images} categories={categories} />
    </div>
  );
}
