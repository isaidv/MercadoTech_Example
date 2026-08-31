import { TITLE_MIN, TITLE_MAX, MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/constants/product";
import type { ProductCondition } from "@/lib/constants/roles";

/**
 * Validación pura del formulario de producto (Fase 3.7) — sin React, sin
 * Supabase. Vive acá (no en `services/`) para que tanto
 * `hooks/useProductForm.ts` como `components/seller/ProductForm.tsx` la
 * importen sin que `components/` termine importando de `hooks/` ni de
 * `services/` — mismo criterio que `lib/validators/auth.ts`.
 */

/** Estado del formulario tal como lo edita el usuario — precio/stock como STRING (lo que da un `<input type="number">`), no como number todavía. */
export type ProductFormValues = {
  title: string;
  description: string;
  brand: string;
  condition: ProductCondition;
  price: string;
  stock: string;
  categoryId: string;
};

export type ProductFormErrors = Partial<Record<keyof ProductFormValues | "imageCount", string>>;

export type ProductFormInput = {
  title: string;
  price: number;
  stock: number;
  categoryId: string;
  imageCount: number;
};

export function validateProduct(input: ProductFormInput): { valid: boolean; errors: ProductFormErrors } {
  const errors: ProductFormErrors = {};

  const trimmedTitle = input.title.trim();
  if (trimmedTitle.length < TITLE_MIN || trimmedTitle.length > TITLE_MAX) {
    errors.title = `El título debe tener entre ${TITLE_MIN} y ${TITLE_MAX} caracteres.`;
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    errors.price = "El precio debe ser mayor a 0.";
  }
  if (!Number.isFinite(input.stock) || !Number.isInteger(input.stock) || input.stock < 0) {
    errors.stock = "El stock debe ser 0 o más.";
  }
  if (!input.categoryId) {
    errors.categoryId = "Elige una categoría.";
  }
  if (input.imageCount < 1) {
    errors.imageCount = "Agrega al menos una imagen.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export type ImageValidationError = "type" | "size";

/** Mismos límites que el bucket "product-images" — da un mensaje legible en el cliente antes de que Storage lo rechace igual. */
export function validateImageFile(file: File): ImageValidationError | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return "type";
  if (file.size > MAX_IMAGE_BYTES) return "size";
  return null;
}
