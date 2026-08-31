"use client";

import { useCallback, useEffect, useState } from "react";
import { isFavorite, toggle as toggleService } from "@/services/favorite.service";
import { getErrorMessage } from "@/lib/utils";

/** Estado de favorito por producto + toggle optimista con rollback. */
export function useFavorite(productId: string, userId: string | null) {
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(!!userId);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setFavorite(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    isFavorite(productId, userId)
      .then((value) => {
        if (!cancelled) setFavorite(value);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "No se pudo cargar el favorito."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, userId]);

  const toggle = useCallback(async () => {
    if (!userId) return;

    setToggling(true);
    setError(null);
    const previous = favorite;
    setFavorite(!previous);

    try {
      const result = await toggleService(productId, userId);
      setFavorite(result);
    } catch (err) {
      setFavorite(previous);
      setError(getErrorMessage(err, "No se pudo actualizar el favorito."));
    } finally {
      setToggling(false);
    }
  }, [productId, userId, favorite]);

  return { favorite, loading, toggling, error, toggle };
}
