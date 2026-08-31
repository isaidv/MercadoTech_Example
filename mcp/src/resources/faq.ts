import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listPublishedArticles } from "../shared/faq.js";
import { defineStaticResource } from "./define-resource.js";
import { createContext } from "../context.js";

/**
 * Resource #6 — `mercadotech://faq`. Reutiliza la derivación
 * `listPublishedArticles` (`shared/faq.ts`). Cliente **anon**
 * (`support_articles_select_published_or_admin` deja ver los publicados
 * sin sesión de admin).
 */
export function registerFaqResource(server: McpServer): void {
  defineStaticResource(server, {
    name: "faq",
    uri: "mercadotech://faq",
    title: "Preguntas frecuentes",
    description: "Artículos de ayuda publicados (envíos, pagos, devoluciones, cuenta) — el mismo contenido que indexa el asistente de soporte.",
    read: async () => {
      const { anon } = createContext();
      const articles = await listPublishedArticles(anon);
      return {
        contents: [{ uri: "mercadotech://faq", mimeType: "application/json", text: JSON.stringify(articles, null, 2) }],
      };
    },
  });
}
