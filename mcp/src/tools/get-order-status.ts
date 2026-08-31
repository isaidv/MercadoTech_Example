import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOrderById } from "@/services/order.service";
import { defineTool } from "./define-tool.js";
import { createContext } from "../context.js";
import { toolSuccess } from "../lib/tool-result.js";
import { NotFoundError } from "../lib/errors.js";

/**
 * Tool #10 — `get_order_status`. Reutiliza `order.service.getOrderById`
 * tal cual. Cliente **admin**: `orders_select_buyer_seller_or_admin` y
 * `order_items_select_buyer_seller_or_admin` solo autorizan al comprador
 * dueño, un vendedor con ítems en el pedido, o un admin — el servidor MCP
 * no tiene sesión de comprador, así que necesita admin para leer
 * CUALQUIER pedido por id.
 *
 * SOLO lectura de solo-lo-necesario (restricción explícita de la Fase
 * 5.3): la respuesta expone ÚNICAMENTE estado, fecha, total, y los ítems
 * como snapshot (título/cantidad/precio ya congelados al momento de la
 * compra) — nunca `buyer_id` ni ningún otro dato de quien compró.
 * `getOrderById` sí trae `buyer_id` en el `Order` completo; se lo
 * descarta explícitamente acá, no se reenvía "porque ya estaba".
 *
 * En producción esta tool exigiría autenticar que quien pregunta es el
 * comprador (o un canal autorizado) — acá no hay ese control porque el
 * servidor entero es de solo lectura y sin sesión de usuario; queda
 * documentado, no resuelto, para cuando el agente de voz de la sesión 8
 * la reutilice.
 */
export function registerGetOrderStatusTool(server: McpServer): void {
  defineTool(server, {
    name: "get_order_status",
    description:
      "Consulta el estado de un pedido por id: pendiente, pagado, enviado, entregado o cancelado, con su fecha, " +
      "total y los ítems comprados (snapshot de precio/cantidad al momento de la compra). Nunca expone datos del comprador.",
    inputSchema: {
      orderId: z.string().describe("Id (UUID) del pedido."),
    },
    handler: async (input) => {
      const { admin } = createContext();

      let order;
      try {
        order = await getOrderById(input.orderId, admin);
      } catch {
        throw new NotFoundError(`pedido ${input.orderId}`);
      }

      const items = order.items.map((item) => ({
        title: item.title_snapshot,
        quantity: item.quantity,
        priceSnapshot: item.price_snapshot,
      }));

      return toolSuccess(`Pedido ${order.id}: ${order.status}, S/ ${order.total.toFixed(2)}.`, {
        orderId: order.id,
        status: order.status,
        total: order.total,
        createdAt: order.created_at,
        items,
      });
    },
  });
}
