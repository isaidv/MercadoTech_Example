"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { arrayMove } from "@dnd-kit/sortable";
import { createProduct, updateProduct } from "@/services/seller.service";
import { uploadProductImage, deleteProductImage, saveImageOrder, getPublicUrl, PRODUCT_IMAGES_BUCKET } from "@/services/storage.service";
import { triggerReindex } from "@/services/indexing-trigger.service";
import { validateProduct, validateImageFile, type ProductFormValues, type ProductFormErrors } from "@/lib/validators/product";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/constants/product";
import { getErrorMessage } from "@/lib/utils";
import type { Product, ProductImage, GalleryImageItem } from "@/types/product";

const EMPTY_VALUES: ProductFormValues = {
  title: "",
  description: "",
  brand: "",
  condition: "nuevo",
  price: "",
  stock: "",
  categoryId: "",
};

type LocalImage = { kind: "local"; id: string; file: File; url: string };
type PersistedImage = { kind: "persisted"; id: string; url: string; position: number; imagePath: string };
type GalleryImage = LocalImage | PersistedImage;

/** `n` (disambiguador de archivo) sale de parsear el nombre de cada imagen ya persistida y sumarle 1 — nunca se reutiliza uno viejo, aunque se hayan borrado imágenes en el medio. */
function nextFileNumber(images: GalleryImage[]): number {
  const numbers = images
    .filter((img): img is PersistedImage => img.kind === "persisted")
    .map((img) => Number.parseInt(img.imagePath.split("/").pop() ?? "", 10))
    .filter((n) => !Number.isNaN(n));
  return (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
}

type UseProductFormOptions = {
  mode: "create" | "edit";
  sellerId: string;
  /** Requerido en modo "edit". */
  productId?: string;
  initialProduct?: Product;
  initialImages?: ProductImage[];
};

/**
 * Estado del formulario, validación, imágenes (locales `File[]` en modo
 * create; ya persistidas en modo edit) y el submit en dos pasos que exige
 * la Fase 3.7 — ver el razonamiento sobre el ciclo de vida de una imagen en
 * el reporte de esta fase.
 */
export function useProductForm({ mode, sellerId, productId, initialProduct, initialImages }: UseProductFormOptions) {
  const router = useRouter();

  const [values, setValues] = useState<ProductFormValues>(() =>
    initialProduct
      ? {
          title: initialProduct.title,
          description: initialProduct.description ?? "",
          brand: initialProduct.brand ?? "",
          condition: initialProduct.condition,
          price: String(initialProduct.price),
          stock: String(initialProduct.stock),
          categoryId: initialProduct.category_id,
        }
      : EMPTY_VALUES,
  );

  const [images, setImages] = useState<GalleryImage[]>(() =>
    (initialImages ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((img) => ({
        kind: "persisted" as const,
        id: img.id,
        url: getPublicUrl(PRODUCT_IMAGES_BUCKET, img.image_path),
        position: img.position,
        imagePath: img.image_path,
      })),
  );

  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback(<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const availableSlots = MAX_IMAGES_PER_PRODUCT - images.length;
      if (availableSlots <= 0) {
        toast.error(`Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes por producto.`);
        return;
      }

      const accepted: File[] = [];
      for (const file of fileArray.slice(0, availableSlots)) {
        const problem = validateImageFile(file);
        if (problem === "type") {
          toast.error(`"${file.name}" no es un formato permitido (jpg, png o webp).`);
        } else if (problem === "size") {
          toast.error(`"${file.name}" supera los 5 MB.`);
        } else {
          accepted.push(file);
        }
      }
      if (accepted.length === 0) return;

      if (mode === "create") {
        // Puramente local hasta el submit — no hay product_id todavía, así
        // que subir a Storage es imposible en esta etapa.
        setImages((prev) => [
          ...prev,
          ...accepted.map((file) => ({ kind: "local" as const, id: crypto.randomUUID(), file, url: URL.createObjectURL(file) })),
        ]);
        return;
      }

      // Modo edit: sube YA, no espera al submit general del formulario.
      if (!productId) return;
      let runningImages = images;
      for (const file of accepted) {
        const n = nextFileNumber(runningImages);
        const position = runningImages.length;
        try {
          const created = await uploadProductImage(file, sellerId, productId, n, position);
          const newImage: PersistedImage = {
            kind: "persisted",
            id: created.id,
            url: getPublicUrl(PRODUCT_IMAGES_BUCKET, created.image_path),
            position: created.position,
            imagePath: created.image_path,
          };
          runningImages = [...runningImages, newImage];
          setImages(runningImages);
        } catch (err) {
          toast.error(getErrorMessage(err));
        }
      }
    },
    [images, mode, productId, sellerId],
  );

  const removeImage = useCallback(
    async (id: string) => {
      const target = images.find((img) => img.id === id);
      if (!target) return;

      if (target.kind === "local") {
        URL.revokeObjectURL(target.url);
        setImages((prev) => prev.filter((img) => img.id !== id));
        return;
      }

      const previous = images;
      setImages((prev) => prev.filter((img) => img.id !== id));
      try {
        await deleteProductImage(target.id, target.imagePath);
      } catch (err) {
        setImages(previous);
        toast.error(getErrorMessage(err));
      }
    },
    [images],
  );

  const reorder = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;
      const oldIndex = images.findIndex((img) => img.id === activeId);
      const newIndex = images.findIndex((img) => img.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const previous = images;
      const reordered = arrayMove(images, oldIndex, newIndex);
      setImages(reordered);

      if (mode !== "edit" || !productId) return; // En create, el reorden es local hasta el submit.

      const persisted = reordered.filter((img): img is PersistedImage => img.kind === "persisted");
      const payload = persisted.map((img, index) => ({
        id: img.id,
        product_id: productId,
        image_path: img.imagePath,
        position: index,
      }));

      saveImageOrder(payload).catch((err) => {
        setImages(previous);
        toast.error(getErrorMessage(err));
      });
    },
    [images, mode, productId],
  );

  const submit = useCallback(async () => {
    const priceNumber = Number(values.price);
    const stockNumber = Number(values.stock);
    const { valid, errors: validationErrors } = validateProduct({
      title: values.title,
      price: priceNumber,
      stock: stockNumber,
      categoryId: values.categoryId,
      imageCount: images.length,
    });
    setErrors(validationErrors);
    if (!valid) return;

    setSubmitting(true);
    try {
      const payload = {
        categoryId: values.categoryId,
        title: values.title.trim(),
        description: values.description.trim() || null,
        brand: values.brand.trim() || null,
        condition: values.condition,
        price: priceNumber,
        stock: stockNumber,
      };

      if (mode === "create") {
        const { id } = await createProduct({ sellerId, ...payload });
        // Fire-and-forget (Fase 4.3): la ficha de búsqueda se arma en el
        // servidor sin que publicar espere a Voyage/Claude ni pueda
        // fallar por ellos — ver services/indexing-trigger.service.ts.
        void triggerReindex("producto", id);

        // Recién con el id real se puede armar el path de Storage — sube
        // las imágenes locales en el orden actual del array.
        const localImages = images.filter((img): img is LocalImage => img.kind === "local");
        for (let index = 0; index < localImages.length; index += 1) {
          await uploadProductImage(localImages[index].file, sellerId, id, index + 1, index);
        }

        toast.success("Producto publicado");
        router.push(`/vendedor/productos/${id}/editar`);
      } else {
        if (!productId) return;
        await updateProduct(productId, payload);
        void triggerReindex("producto", productId);
        toast.success("Cambios guardados");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [values, images, mode, sellerId, productId, router]);

  const displayImages = useMemo<GalleryImageItem[]>(() => images.map((img) => ({ id: img.id, url: img.url })), [images]);

  return {
    values,
    setField,
    images: displayImages,
    errors,
    submitting,
    addFiles,
    removeImage,
    reorder,
    submit,
  };
}
