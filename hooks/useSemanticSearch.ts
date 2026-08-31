"use client";

import { useCallback, useState } from "react";
import { getErrorMessage } from "@/lib/utils";
import type { Product } from "@/types/product";

export type SemanticSearchResult = Product & { similarity: number };

/**
 * Búsqueda semántica para la pestaña "Resultados con IA" de `/buscar`
 * (Fase 4.4). Cadena de capas: este hook → `fetch` a
 * `/api/v1/search/semantic` → `services/vector-search.service.ts` →
 * `lib/ai/`. El hook nunca importa `lib/ai/` ni Supabase directo — solo
 * conoce el endpoint, igual que cualquier otro hook de la sesión 3.
 */
export function useSemanticSearch() {
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
      }
      setResults(body?.results ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}
