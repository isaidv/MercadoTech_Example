import type { Product } from "@/types/product";

export type ChatMode = "compras" | "soporte";

/**
 * Un turno de la conversación — historial en memoria del lado del
 * navegador (Fase 4.7, `useChat`). No se persiste en ninguna tabla
 * (MercadoTech_sesion4.md, tabla de origen/almacenamiento: "la
 * conversación del chat... en NINGUNA parte").
 */
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Fuente citada en la respuesta — la UI (Fase 4.7) la convierte en enlace a `/producto/[id]` o al artículo, según `source_type`. */
export type ChatSource = {
  /** 1-indexado — el mismo número que cita la respuesta entre corchetes. */
  index: number;
  source_type: string;
  source_id: string;
  title?: string;
  similarity: number;
};

export type ChatResult = {
  query: string;
  answer: string;
  /** false si ninguna fuente pasó la selección de `context-builder` — la respuesta igual existe (el modo ya sabe decir "no encontré..."), solo que sin nada citado. */
  hasRelevantContext: boolean;
  sources: ChatSource[];
  metadata: {
    model: string;
    /** Cuántas fichas devolvió `match_knowledge` antes de filtrar. */
    retrievedCount: number;
    /** Cuántas de esas realmente entraron al contexto (selección + presupuesto de `context-builder`). */
    usedSourceCount: number;
    contextTruncated: boolean;
  };
};

/**
 * Fuente ya lista para `components/chat/SourcesList.tsx` (Fase 4.7):
 * `hooks/useChat.ts` hidrata cada `ChatSource` de tipo "producto" con
 * `product.service.getProductById` (imagen/precio ya resueltos, regla de
 * la sesión 3) antes de mostrarla. `product` queda `undefined` si la
 * hidratación falla (producto borrado, red) — la fuente igual se muestra,
 * sin mini-card, nunca rompe el mensaje ya recibido.
 */
export type ChatSourceDisplay = ChatSource & { product?: Product };

/**
 * Un turno ya renderizable del historial de `useChat` — a diferencia de
 * `ChatMessage` (el tipo "de cable" del endpoint), este trae `id` (key de
 * lista), `sources` hidratadas y `isError` para la burbuja de error
 * inline. Vive acá, no en `hooks/useChat.ts`, para que
 * `components/chat/*.tsx` lo importe sin que `components/` termine
 * importando de `hooks/` (mismo criterio que `CartProductSnapshot` en
 * `types/order.ts`).
 */
export type ChatUIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSourceDisplay[];
  isError?: boolean;
};
