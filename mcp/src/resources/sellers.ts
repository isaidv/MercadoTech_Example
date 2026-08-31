import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSellerProfile, listSellerIds } from "../shared/sellers.js";
import { defineResourceTemplate } from "./define-resource.js";
import { createContext } from "../context.js";

/**
 * Resource #5 — `mercadotech://sellers/{sellerId}` (template). SOLO
 * `display_name` + productos ACTIVOS del vendedor. `profiles` no tiene
 * SELECT público (`profiles_select_own_or_admin`, sesión 2, decisión 5
 * de la Fase 5.4) — ni con sesión de otro usuario se puede leer el
 * perfil de un tercero, así que el cliente es **admin**. La consulta en
 * `shared/sellers.ts` ni siquiera pide `phone` o `avatar_path` — no es
 * "se ocultan al responder", no se traen de la base en absoluto.
 */
export function registerSellersResource(server: McpServer): void {
  defineResourceTemplate(server, {
    name: "seller-profile",
    uriTemplate: "mercadotech://sellers/{sellerId}",
    title: "Perfil público de un vendedor",
    description: "Nombre público de un vendedor y sus productos activos — nunca teléfono, email ni otro dato de contacto.",
    list: async () => {
      const { admin } = createContext();
      const sellers = await listSellerIds(admin);
      return {
        resources: sellers.map((seller) => ({
          uri: `mercadotech://sellers/${seller.id}`,
          name: seller.displayName,
          mimeType: "application/json",
        })),
      };
    },
    read: async (variables) => {
      const { admin } = createContext();
      const sellerId = String(variables.sellerId);
      const profile = await getSellerProfile(admin, sellerId);
      if (!profile) {
        return {
          contents: [
            {
              uri: `mercadotech://sellers/${sellerId}`,
              mimeType: "text/plain",
              text: `No se encontró un vendedor con id ${sellerId}.`,
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: `mercadotech://sellers/${sellerId}`,
            mimeType: "application/json",
            text: JSON.stringify({ displayName: profile.displayName, products: profile.products }, null, 2),
          },
        ],
      };
    },
  });
}
