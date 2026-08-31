"use client";

import { useCallback, useState } from "react";
import { getProductById } from "@/services/product.service";
import type { ChatMode, ChatResult, ChatSource, ChatSourceDisplay, ChatUIMessage } from "@/types/chat";

const GENERIC_ERROR_MESSAGE = "No pude procesar tu consulta, intenta de nuevo.";

/**
 * `ChatSource` (Fase 4.6) solo trae `source_id`/título/similitud —
 * `SourcesList` necesita imagen/precio para la mini-card de producto, así
 * que este hook hidrata cada fuente "producto" con
 * `product.service.getProductById` antes de agregarla al historial.
 * Best-effort: si el producto fue borrado o la consulta falla, la fuente
 * se muestra igual sin mini-card (nunca vuelve a romper un mensaje que ya
 * llegó bien del endpoint).
 */
async function hydrateSources(sources: ChatSource[]): Promise<ChatSourceDisplay[]> {
  return Promise.all(
    sources.map(async (source) => {
      if (source.source_type !== "producto") return source;
      try {
        const product = await getProductById(source.source_id);
        return { ...source, product };
      } catch {
        return source;
      }
    }),
  );
}

/**
 * Historial de conversación en memoria (`types/chat.ts`: no se persiste en
 * ninguna tabla), parametrizado por `mode` — `/asistente` y `/soporte`
 * (Fase 4.7) usan el mismo hook con un modo distinto. Cualquier error del
 * servidor (401 sin sesión, 502 si falta una API key, un mode-timeout de
 * Voyage/Claude) se convierte en un mensaje más del asistente: la
 * conversación nunca se rompe ni tira la pantalla abajo.
 */
export function useChat(mode: ChatMode) {
  const [messages, setMessages] = useState<ChatUIMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || loading) return;

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
      setLoading(true);

      try {
        const response = await fetch("/api/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, mode }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
        }

        const result = body as ChatResult;
        const sources = await hydrateSources(result.sources);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: result.answer, sources },
        ]);
      } catch (err) {
        console.warn("[useChat] la consulta falló, se muestra el mensaje inline genérico:", err);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: GENERIC_ERROR_MESSAGE, isError: true },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [mode, loading],
  );

  return { messages, loading, sendMessage };
}
