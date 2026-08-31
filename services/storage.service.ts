import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ProductImage } from "@/types/product";

type Client = SupabaseClient<Database>;

// Único lugar que conoce el nombre del bucket — product.service.ts y
// cart.service.ts lo importan de acá (antes vivía en product.service.ts,
// que no es su lugar natural: es un detalle de Storage, no del dominio "producto").
export const PRODUCT_IMAGES_BUCKET = "product-images";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * `bucket` queda como parámetro (no fijo a `PRODUCT_IMAGES_BUCKET`) porque
 * el mismo patrón sirve para el bucket "avatars" más adelante.
 *
 * Única excepción al patrón "cliente inyectable async" del resto de los
 * services: `storage.from(...).getPublicUrl(...)` de supabase-js no hace
 * red — solo concatena strings a partir de la URL del proyecto y el path
 * (los buckets son públicos) — así que no hay nada que await.
 */
export function getPublicUrl(bucket: string, path: string, supabase: Client = createClient()): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Sube una imagen de producto y crea su fila en `product_images` en un solo
 * paso. `n` es el disambiguador de archivo dentro del path
 * (`{seller_id}/{product_id}/{n}.{ext}`, convención de la migración de
 * Storage) — NO es lo mismo que `position` (el orden de display, 0-indexed,
 * que se reordena con el drag & drop): `n` solo crece, nunca se reutiliza,
 * para no pisar un archivo anterior si se reordena o se borra alguno.
 *
 * `ext` sale del MIME real del archivo, nunca del nombre que trae el
 * `File` — un usuario podría subir algo sin extensión o con una mentirosa.
 */
export async function uploadProductImage(
  file: File,
  sellerId: string,
  productId: string,
  n: number,
  position: number,
  supabase: Client = createClient(),
): Promise<ProductImage> {
  const ext = MIME_TO_EXT[file.type] ?? "jpg";
  const path = `${sellerId}/${productId}/${n}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, image_path: path, position })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Borra el objeto en Storage Y su fila en `product_images` — van siempre
 * juntos (una fila sin archivo real serviría un ícono roto vía
 * `ProductImage`; un archivo sin fila sería basura huérfana en Storage).
 */
export async function deleteProductImage(
  imageId: string,
  imagePath: string,
  supabase: Client = createClient(),
): Promise<void> {
  const { error: storageError } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([imagePath]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) throw error;
}

export type ImageOrderItem = {
  id: string;
  product_id: string;
  image_path: string;
  position: number;
};

/**
 * Upsert con filas COMPLETAS (`id`, `product_id`, `image_path`, `position`)
 * — un upsert parcial (solo `id`+`position`) violaría los `not null` de
 * `product_id`/`image_path` en `product_images`, que no tienen default.
 * No toca Storage: reordenar es solo la columna `position`.
 */
export async function saveImageOrder(
  items: ImageOrderItem[],
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase.from("product_images").upsert(items);
  if (error) throw error;
}
