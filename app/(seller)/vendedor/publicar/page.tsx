"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useProductForm } from "@/hooks/useProductForm";
import { ProductForm } from "@/components/seller/ProductForm";

export default function VendedorPublicarPage() {
  const { profile } = useAuth();
  const { categories } = useCategories();
  const form = useProductForm({ mode: "create", sellerId: profile?.id ?? "" });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">Publicar producto</h1>
      <ProductForm
        mode="create"
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
    </div>
  );
}
