"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FiltersPanel } from "@/components/catalog/FiltersPanel";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Pagination } from "@/components/catalog/Pagination";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";
import { PRODUCTS_PAGE_SIZE, DEFAULT_SORT } from "@/lib/constants/catalog";

type CatalogPageProps = {
  /** Fijo para "/categoria/[slug]" (nombre de la categoría, no derivable de la URL sin una consulta).
   *  Si se omite, se deriva acá mismo de "?q=" ("/buscar") o cae a "Catálogo" ("/"). */
  title?: string;
  /** Fijado desde el segmento de ruta en /categoria/[slug]; ausente en "/" y "/buscar". */
  categorySlug?: string;
};

/**
 * Composición compartida por "/", "/categoria/[slug]" y "/buscar" — MISMO
 * grid y hook (Fase 3.4, decisión de reutilización). Vive en
 * app/(shop)/_components/ (carpeta privada: el prefijo "_" hace que Next.js
 * la excluya del ruteo) y NO en components/catalog/ porque conecta
 * `useProducts` — las convenciones transversales de la sesión 3 prohíben
 * que `components/` importe de `hooks/`; solo las páginas pueden.
 *
 * Las 3 páginas que la usan ("/", "/buscar", "/categoria/[slug]") NO
 * envuelven esto en `<Suspense>` (Fase 3.8, corrección — antes sí lo
 * hacían, "por si acaso" `useSearchParams`). Ese `<Suspense>` nunca hizo
 * falta: `CatalogPage` ya maneja su propio estado de carga (`ProductGrid`
 * recibe `loading` y dibuja su propio skeleton), y envolverlo disparaba un
 * bug real de streaming SSR de Turbopack en este proyecto — el boundary
 * queda como contenido oculto (`<template>`/`hidden` + script `$RC(...)`)
 * que a veces nunca se revela en una carga dura (confirmado con pestaña
 * nueva, con y sin caché, intermitente: a veces resuelve, la mayoría de
 * las veces no). Sin el `<Suspense>` explícito, Next igual permite
 * `useSearchParams()` acá — la única consecuencia es que la página no
 * puede pre-renderizarse estática, lo cual ya era cierto de todos modos
 * (todo el contenido depende de datos client-side de Supabase).
 */
export function CatalogPage({ title, categorySlug }: CatalogPageProps) {
  const searchParams = useSearchParams();
  const { items, total, page, loading, error, filters, setFilter, setPage, retry } =
    useProducts(categorySlug);

  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));
  const query = searchParams.get("q");
  const resolvedTitle = title ?? (query ? `Resultados para «${query}»` : "Catálogo");

  // Sin resultado no es un callejón sin salida: "Quitar filtros" reusa el
  // mismo `setFilter` que ya expone el hook (Fase 3.8 — no se agrega
  // ninguna función nueva a `useProducts`, solo se compone la existente).
  const hasActiveFilters =
    filters.condition.length > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.sort !== DEFAULT_SORT;

  function clearFilters() {
    setFilter({ condition: [], minPrice: undefined, maxPrice: undefined, sort: DEFAULT_SORT });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">{resolvedTitle}</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <FiltersPanel value={filters} onChange={setFilter} />

        <div className="flex flex-col gap-6">
          {error ? (
            <ErrorState description={error} onRetry={retry} />
          ) : (
            <>
              <ProductGrid
                items={items}
                loading={loading}
                emptyAction={
                  hasActiveFilters ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Quitar filtros
                    </Button>
                  ) : query ? (
                    <Button variant="secondary" render={<Link href="/" />}>
                      Ver catálogo completo
                    </Button>
                  ) : undefined
                }
              />
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
