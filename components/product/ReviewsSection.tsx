"use client";

import { useState, type FormEvent } from "react";
import { RatingStars } from "@/components/shared/RatingStars";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Review } from "@/types/review";

type ReviewsSectionProps = {
  reviews: Review[];
  average: number | null;
  count: number;
  /** `canReview.allowed` — la página ya resolvió la verificación completa (pedido entregado + sin reseña previa). */
  canReview: boolean;
  submitting: boolean;
  onSubmit: (input: { rating: number; comment?: string }) => Promise<void>;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

function ReviewForm({ submitting, onSubmit }: Pick<ReviewsSectionProps, "submitting" | "onSubmit">) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ rating, comment: comment.trim() || undefined });
    setComment("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Tu calificación</p>
      <RatingStars value={rating} onChange={setRating} size="lg" />
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Contá tu experiencia (opcional)"
        aria-label="Comentario de tu reseña (opcional)"
        rows={3}
      />
      <Button type="submit" size="sm" className="self-end" disabled={submitting}>
        {submitting ? "Enviando..." : "Publicar reseña"}
      </Button>
    </form>
  );
}

/**
 * `RatingStars` promedio + lista; el formulario SOLO se muestra si
 * `canReview` es true — la RLS (`reviews_insert_verified_purchase`) lo
 * garantiza de todos modos, esto es defensa en profundidad para no
 * ofrecer un botón que el INSERT rechazaría.
 *
 * "Comprador verificado" en vez del nombre real: misma razón que en
 * `QuestionsSection` — `profiles` no es legible por terceros (decisión 8).
 */
export function ReviewsSection({ reviews, average, count, canReview, submitting, onSubmit }: ReviewsSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold">Reseñas</h2>

      {count > 0 ? (
        <div className="flex items-center gap-2">
          <RatingStars value={average ?? 0} />
          <span className="text-sm text-muted-foreground">
            {average?.toFixed(1)} · {count} {count === 1 ? "reseña" : "reseñas"}
          </span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía no hay reseñas.</p>
      )}

      {canReview ? <ReviewForm submitting={submitting} onSubmit={onSubmit} /> : null}

      {reviews.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {reviews.map((review) => (
            <li key={review.id} className="flex flex-col gap-1 border-b border-border pb-4 last:border-b-0">
              <div className="flex items-center gap-2">
                <RatingStars value={review.rating} size="sm" />
                <span className="text-sm font-medium">Comprador verificado</span>
              </div>
              {review.comment ? <p className="text-sm">{review.comment}</p> : null}
              <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
