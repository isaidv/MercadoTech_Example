"use client";

import { useEffect, useState } from "react";
import { listCategories } from "@/services/category.service";
import { getErrorMessage } from "@/lib/utils";
import type { Category } from "@/types/product";

/** Cache en memoria a nivel de módulo — las categorías casi no cambian, no vale la pena refetchear en cada navegación entre pantallas del catálogo. Se pierde en un refresh de página completo (comportamiento aceptado). */
let cache: Category[] | null = null;

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache) return;

    let cancelled = false;
    setLoading(true);

    listCategories()
      .then((data) => {
        if (cancelled) return;
        cache = data;
        setCategories(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "No se pudieron cargar las categorías."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
}
