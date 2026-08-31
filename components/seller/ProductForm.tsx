"use client";

import type { FormEvent } from "react";
import { SortableImageGallery } from "@/components/seller/SortableImageGallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_CONDITIONS, type ProductCondition } from "@/lib/constants/roles";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/constants/product";
import type { ProductFormValues, ProductFormErrors } from "@/lib/validators/product";
import type { Category, GalleryImageItem } from "@/types/product";

const CONDITION_LABELS: Record<ProductCondition, string> = {
  nuevo: "Nuevo",
  usado: "Usado",
  reacondicionado: "Reacondicionado",
};

type ProductFormProps = {
  mode: "create" | "edit";
  values: ProductFormValues;
  errors: ProductFormErrors;
  images: GalleryImageItem[];
  categories: Category[];
  submitting: boolean;
  onChange: <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => void;
  onFilesSelected: (files: FileList) => void;
  onRemoveImage: (id: string) => void;
  onReorderImages: (activeId: string, overId: string) => void;
  onSubmit: () => void;
};

/** Campos + `SortableImageGallery`. Puro: `value`/`errors`/`onChange`/`onSubmit` — `useProductForm` es quien conoce Supabase. */
export function ProductForm({
  mode,
  values,
  errors,
  images,
  categories,
  submitting,
  onChange,
  onFilesSelected,
  onRemoveImage,
  onReorderImages,
  onSubmit,
}: ProductFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>Imágenes</Label>
        <SortableImageGallery
          images={images}
          maxImages={MAX_IMAGES_PER_PRODUCT}
          onFilesSelected={onFilesSelected}
          onRemove={onRemoveImage}
          onReorder={onReorderImages}
        />
        {errors.imageCount ? <p className="text-sm text-destructive">{errors.imageCount}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-title">Título</Label>
        <Input
          id="product-title"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          aria-invalid={!!errors.title}
        />
        {errors.title ? <p className="text-sm text-destructive">{errors.title}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-description">Descripción</Label>
        <Textarea
          id="product-description"
          rows={4}
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-brand">Marca</Label>
          <Input id="product-brand" value={values.brand} onChange={(event) => onChange("brand", event.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-condition">Condición</Label>
          <Select value={values.condition} onValueChange={(value) => onChange("condition", value as ProductCondition)}>
            <SelectTrigger id="product-condition" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_CONDITIONS.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {CONDITION_LABELS[condition]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-price">Precio (S/)</Label>
          <Input
            id="product-price"
            type="number"
            min={0}
            step="0.01"
            value={values.price}
            onChange={(event) => onChange("price", event.target.value)}
            aria-invalid={!!errors.price}
          />
          {errors.price ? <p className="text-sm text-destructive">{errors.price}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-stock">Stock</Label>
          <Input
            id="product-stock"
            type="number"
            min={0}
            step="1"
            value={values.stock}
            onChange={(event) => onChange("stock", event.target.value)}
            aria-invalid={!!errors.stock}
          />
          {errors.stock ? <p className="text-sm text-destructive">{errors.stock}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="product-category">Categoría</Label>
        <Select value={values.categoryId} onValueChange={(value) => onChange("categoryId", value ?? "")}>
          <SelectTrigger id="product-category" className="w-full">
            <SelectValue placeholder="Elegí una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId ? <p className="text-sm text-destructive">{errors.categoryId}</p> : null}
      </div>

      <Button type="submit" disabled={submitting} className="self-end">
        {submitting ? "Guardando..." : mode === "create" ? "Publicar producto" : "Guardar cambios"}
      </Button>
    </form>
  );
}
