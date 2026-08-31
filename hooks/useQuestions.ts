"use client";

import { useCallback, useEffect, useState } from "react";
import { listByProduct, create, answer as answerService } from "@/services/question.service";
import type { Question } from "@/types/question";

/** Lista + ask + answer con actualización optimista (fila temporal para ask; rollback si falla answer). */
export function useQuestions(productId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listByProduct(productId)
      .then((data) => {
        if (!cancelled) setQuestions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudieron cargar las preguntas.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const ask = useCallback(
    async (userId: string, questionText: string) => {
      setActionError(null);
      const tempId = `temp-${Date.now()}`;
      const optimistic: Question = {
        id: tempId,
        product_id: productId,
        user_id: userId,
        question: questionText,
        answer: null,
        answered_at: null,
        created_at: new Date().toISOString(),
      };
      setQuestions((prev) => [optimistic, ...prev]);

      try {
        const created = await create(productId, userId, questionText);
        setQuestions((prev) => prev.map((q) => (q.id === tempId ? created : q)));
      } catch (err) {
        setQuestions((prev) => prev.filter((q) => q.id !== tempId));
        setActionError(err instanceof Error ? err.message : "No se pudo enviar la pregunta.");
        throw err;
      }
    },
    [productId],
  );

  const answer = useCallback(
    async (questionId: string, answerText: string) => {
      setActionError(null);
      let previous: Question[] = [];
      setQuestions((prev) => {
        previous = prev;
        return prev.map((q) =>
          q.id === questionId ? { ...q, answer: answerText, answered_at: new Date().toISOString() } : q,
        );
      });

      try {
        const updated = await answerService(questionId, answerText);
        setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
      } catch (err) {
        setQuestions(previous);
        setActionError(err instanceof Error ? err.message : "No se pudo enviar la respuesta.");
        throw err;
      }
    },
    [],
  );

  return { questions, loading, error, actionError, ask, answer };
}
