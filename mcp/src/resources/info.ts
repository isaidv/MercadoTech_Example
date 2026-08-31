import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineStaticResource } from "./define-resource.js";

const INFO_TEXT = `MercadoTech es un marketplace de productos tecnológicos (como Mercado Libre, pero solo tecnología). Este servidor MCP expone la plataforma en modo SOLO LECTURA: ninguna tool ni resource crea, edita ni borra nada.

Qué podés hacer acá:
- Buscar y comparar productos del catálogo, por texto exacto o por significado.
- Preguntarle al mismo asistente de compras/soporte que usa la web (con fuentes citadas).
- Consultar categorías, estadísticas generales de la tienda, y el estado de un pedido por id.
- Leer los artículos de ayuda (FAQ) publicados.
- Ver el perfil PÚBLICO de un vendedor: solo su nombre y sus productos activos.

Qué NO expone, a propósito: carritos, favoritos, tickets de soporte, ni ningún dato personal de compradores (nombre, email, teléfono). Crear, editar o publicar contenido no está disponible desde acá — para eso está la web.`;

/** Resource #1 — `mercadotech://info`. Estático, no toca la base de datos. */
export function registerInfoResource(server: McpServer): void {
  defineStaticResource(server, {
    name: "info",
    uri: "mercadotech://info",
    title: "Acerca de MercadoTech",
    description: "Descripción de la plataforma y de qué puede (y no puede) hacer este servidor MCP.",
    mimeType: "text/plain",
    read: async () => ({
      contents: [{ uri: "mercadotech://info", mimeType: "text/plain", text: INFO_TEXT }],
    }),
  });
}
