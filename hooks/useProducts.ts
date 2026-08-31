"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { listActiveProducts } from "@/services/product.service";
import { getErrorMessage } from "@/lib/utils";
import type { Product, ProductCatalogFilters } from "@/types/product";
import { PRODUCT_CONDITIONS, type ProductCondition } from "@/lib/constants/roles";
import { DEFAULT_SORT, SORT_OPTIONS, type SortOption } from "@/lib/constants/catalog";

const SORT_VALUES: readonly string[] = SORT_OPTIONS.map((option) => option.value);

function isSortOption(value: string | null): value is SortOption {
  return !!value && SORT_VALUES.includes(value);
}

function parseConditions(raw: string | null): ProductCondition[] {
  if (!raw) return [];
  const requested = raw.split(",");
  return PRODUCT_CONDITIONS.filter((condition) => requested.includes(condition));
}

function parseFilters(searchParams: URLSearchParams): ProductCatalogFilters {
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = searchParams.get("sort");

  return {
    condition: parseConditions(searchParams.get("condition")),
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sort: isSortOption(sort) ? sort : DEFAULT_SORT,
  };
}

/**
 * Lee filtros de `useSearchParams`, llama a `listActiveProducts` y expone
 * `{items, total, page, loading, error, setFilter, setPage, retry}`
 * (contrato de la Fase 3.4) — más `filters`, el mismo estado ya parseado
 * que consume `FiltersPanel` (evita reparsear la URL en dos lugares).
 * Cambiar un filtro escribe la URL (estado compartible/recargable) y
 * vuelve a página 1.
 */
export function useProducts(categorySlug?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = parseFilters(searchParams);
  const search = searchParams.get("q") || undefined;
  const page = Number(searchParams.get("page")) || 1;

  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listActiveProducts({
      categorySlug,
      search,
      condition: filters.condition.length > 0 ? filters.condition : undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      sort: filters.sort,
      page,
    })
      .then(({ items: nextItems, total: nextTotal }) => {
        if (cancelled) return;
        setItems(nextItems);
        setTotal(nextTotal);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "No se pudieron cargar los productos."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // searchParams.toString() (no el objeto searchParams) es la dependencia
    // real: derivar `filters`/`search`/`page` crea objetos/valores nuevos
    // en cada render, así que listarlos acá reejecutaría el efecto siempre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), categorySlug, retryToken]);

  const setFilter = useCallback(
    (update: Partial<ProductCatalogFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      if ("condition" in update) {
        if (update.condition && update.condition.length > 0) {
          params.set("condition", update.condition.join(","));
        } else {
          params.delete("condition");
        }
      }
      if ("minPrice" in update) {
        if (update.minPrice !== undefined) params.set("minPrice", String(update.minPrice));
        else params.delete("minPrice");
      }
      if ("maxPrice" in update) {
        if (update.maxPrice !== undefined) params.set("maxPrice", String(update.maxPrice));
        else params.delete("maxPrice");
      }
      if ("sort" in update) {
        if (update.sort && update.sort !== DEFAULT_SORT) params.set("sort", update.sort);
        else params.delete("sort");
      }

      // Cambiar cualquier filtro vuelve a página 1 — la página vieja podría no existir con el nuevo total.
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) params.delete("page");
      else params.set("page", String(nextPage));
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);

  return { items, total, page, loading, error, filters, setFilter, setPage, retry };
}
