"use client";

import { useCallback, useEffect, useState } from "react";
import { listMine } from "@/services/favorite.service";
import { getErrorMessage } from "@/lib/utils";
import type { Product } from "@/types/product";

/** Lista completa de favoritos para /favoritos. */
export function useFavorites(userId: string | null) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    listMine(userId)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "No se pudieron cargar tus favoritos."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, retryToken]);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);

  return { items, loading, error, retry };
}
