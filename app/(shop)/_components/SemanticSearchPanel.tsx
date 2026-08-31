"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";

type SemanticSearchPanelProps = {
  query: string;
};

/**
 * Contenido de la pestaña "Resultados con IA" de `/buscar` (Fase 4.4,
 * decisión 1: exige sesión). Reutiliza `ProductGrid`/`ProductCard` tal
 * cual — el badge de similitud es la única diferencia visual, vía prop
 * opcional. Nunca importa `lib/ai/` ni Supabase: solo `useAuth` y
 * `useSemanticSearch`, que a su vez solo conoce el endpoint.
 */
export function SemanticSearchPanel({ query }: SemanticSearchPanelProps) {
  const { user, initializing } = useAuth();
  const { results, loading, error, search } = useSemanticSearch();
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!user || !trimmedQuery) return;
    search(trimmedQuery);
  }, [user, trimmedQuery, search]);

  if (initializing) {
    return <ProductGrid items={[]} loading />;
  }

  if (!user) {
    return (
      <EmptyState
        title="Inicia sesión para usar la búsqueda inteligente"
        description="Con tu cuenta podés describir lo que buscás con tus propias palabras, no solo el nombre exacto del producto."
        action={
          <Button render={<Link href={`/login?redirectTo=${encodeURIComponent(`/buscar?q=${trimmedQuery}`)}`} />}>
            Iniciar sesión
          </Button>
        }
      />
    );
  }

  if (error) {
    return <ErrorState description={error} onRetry={() => search(trimmedQuery)} />;
  }

  return (
    <ProductGrid
      items={results}
      loading={loading}
      emptyTitle="No encontramos productos"
      emptyDescription="Prueba describir para qué lo necesitas."
    />
  );
}
