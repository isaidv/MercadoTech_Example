"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listByProduct,
  getAverage,
  canReview as canReviewService,
  create,
  type CanReviewResult,
} from "@/services/review.service";
import { getErrorMessage } from "@/lib/utils";
import type { Review } from "@/types/review";

const NOT_REVIEWABLE: CanReviewResult = { allowed: false, orderId: null };

/** Lista + promedio + canReview + submit. `canReview` recarga junto con la lista — cambia si el pedido pasa a 'entregado' en el backend. */
export function useReviews(productId: string, userId: string | null) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [canReview, setCanReview] = useState<CanReviewResult>(NOT_REVIEWABLE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      listByProduct(productId),
      getAverage(productId),
      userId ? canReviewService(productId, userId) : Promise.resolve(NOT_REVIEWABLE),
    ])
      .then(([reviewsData, averageData, canReviewData]) => {
        if (cancelled) return;
        setReviews(reviewsData);
        setAverage(averageData.average);
        setCount(averageData.count);
        setCanReview(canReviewData);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "No se pudieron cargar las reseñas."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, userId]);

  const submit = useCallback(
    async (input: { rating: number; comment?: string }) => {
      if (!userId || !canReview.allowed || !canReview.orderId) return;

      setSubmitting(true);
      setSubmitError(null);
      try {
        const created = await create({
          productId,
          orderId: canReview.orderId,
          buyerId: userId,
          rating: input.rating,
          comment: input.comment ?? null,
        });
        setReviews((prev) => [created, ...prev]);
        setCount((prevCount) => prevCount + 1);
        setAverage((prevAverage) => {
          const nextCount = count + 1;
          const prevTotal = (prevAverage ?? 0) * count;
          return (prevTotal + created.rating) / nextCount;
        });
        // Ya reseñó: canReview vuelve a false sin esperar otro roundtrip
        // (unique(product_id, buyer_id) — un segundo intento fallaría igual).
        setCanReview(NOT_REVIEWABLE);
      } catch (err) {
        setSubmitError(getErrorMessage(err, "No se pudo enviar la reseña."));
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [productId, userId, canReview, count],
  );

  return { reviews, average, count, canReview, loading, error, submitting, submitError, submit };
}
