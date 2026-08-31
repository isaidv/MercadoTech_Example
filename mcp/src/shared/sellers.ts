import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { listMyProducts } from "@/services/seller.service";
import type { Product } from "@/types/product";

type Client = SupabaseClient<Database>;

export type SellerProfile = {
  id: string;
  displayName: string;
  products: Product[];
};

/**
 * DERIVACIÓN (Fase 5.4, decisión 5) — no hay service para leer el perfil
 * de OTRO usuario por id. `services/auth.service.ts` solo expone
 * `getCurrentUser()` (el usuario YA logueado); `profiles` no tiene SELECT
 * público (`profiles_select_own_or_admin`, sesión 2) — ni con sesión de
 * otro comprador se puede leer el perfil de un tercero. Por eso esto es
 * una consulta directa con el cliente **admin**, documentada acá — NO un
 * service nuevo del proyecto web (ese cliente jamás debería llegar a
 * `services/`, que también usa la app; ver la advertencia de
 * `lib/supabase/admin.ts`).
 *
 * La consulta a `profiles` pide ÚNICAMENTE `id, display_name, role` —
 * NUNCA `phone` ni `avatar_path`, aunque la fila completa los tenga. No
 * es "no los devuelve": ni siquiera se piden. `listMyProducts` (Fase 3.7)
 * incluye los inactivos a propósito, para el panel del propio vendedor;
 * acá se filtran a solo ACTIVOS, porque este resource es de cara a
 * cualquiera que lo lea vía MCP, no al dueño.
 */
export async function getSellerProfile(admin: Client, sellerId: string): Promise<SellerProfile | null> {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", sellerId)
    .eq("role", "seller")
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  const allProducts = await listMyProducts(sellerId, admin);
  return {
    id: profile.id,
    displayName: profile.display_name ?? "Vendedor",
    products: allProducts.filter((product) => product.is_active),
  };
}

export type SellerListing = { id: string; displayName: string };

/** Para el callback `list` del template `sellers/{sellerId}` — enumera los vendedores reales del catálogo, mismos campos mínimos que `getSellerProfile`. */
export async function listSellerIds(admin: Client): Promise<SellerListing[]> {
  const { data, error } = await admin.from("profiles").select("id, display_name").eq("role", "seller");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, displayName: row.display_name ?? "Vendedor" }));
}
