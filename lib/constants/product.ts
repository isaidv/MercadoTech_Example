/**
 * Tunables del formulario de producto (Fase 3.7). Ver "Convenciones
 * transversales > Tunables nuevos en lib/constants/" de MercadoTech_sesion3.md.
 */

/** Mínimo razonable para que un título diga algo ("iPhone" ya son 6). */
export const TITLE_MIN = 5;
/** Igual al límite típico de un `title` de catálogo — evita descripciones enteras metidas en el título. */
export const TITLE_MAX = 120;

/** Espacio de miniaturas que entra cómodo en `SortableImageGallery` sin scroll excesivo. */
export const MAX_IMAGES_PER_PRODUCT = 6;

/** = `file_size_limit` del bucket "product-images" (20260821120000_create_storage_buckets.sql) — validar en cliente evita un roundtrip fallido por algo que Storage iba a rechazar igual. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** = `allowed_mime_types` del mismo bucket. */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
