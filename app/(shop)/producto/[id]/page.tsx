"use client";

import { use } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProduct } from "@/hooks/useProduct";
import { useQuestions } from "@/hooks/useQuestions";
import { useReviews } from "@/hooks/useReviews";
import { useFavorite } from "@/hooks/useFavorite";
import { useCart } from "@/hooks/useCart";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { BuyBox } from "@/components/product/BuyBox";
import { QuestionsSection } from "@/components/product/QuestionsSection";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Separator } from "@/components/ui/separator";

/**
 * Client Component a propósito (no Server Component `async`) — mismo
 * motivo que /categoria/[slug] (Fase 3.4): un Server Component que hace
 * `await` antes de devolver el árbol cliente deja cualquier Suspense
 * trabado en este proyecto. Acá ni siquiera hace falta un <Suspense>: nada
 * bajo esta página usa `useSearchParams`, que es lo único que lo exige.
 */
export default function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, profile, initializing } = useAuth();
  const { product, images, loading, error, retry } = useProduct(id);
  const { questions, ask, answer } = useQuestions(id);
  const { reviews, average, count, canReview, submitting, submit } = useReviews(id, user?.id ?? null);
  const { favorite, toggling, toggle } = useFavorite(id, user?.id ?? null);
  const { add: addToCart } = useCart(user?.id ?? null);

  if (loading || initializing) {
    return <LoadingState />;
  }

  if (error || !product) {
    return <ErrorState description={error ?? "No encontramos este producto."} onRetry={retry} />;
  }

  const isOwner = profile?.id === product.seller_id;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ProductGallery images={images} productTitle={product.title} />

        <div className="flex flex-col gap-6">
          <ProductInfo product={product} />
          <BuyBox
            stock={product.stock}
            isActive={product.is_active}
            isOwner={isOwner}
            isAuthenticated={!!user}
            favorite={favorite}
            favoriteLoading={toggling}
            onToggleFavorite={toggle}
            onAddToCart={(quantity) => addToCart(product.id, quantity)}
          />
        </div>
      </div>

      <Separator />

      <QuestionsSection
        questions={questions}
        isAuthenticated={!!user}
        isOwner={isOwner}
        onAsk={(text) => {
          if (!user) return Promise.resolve();
          return ask(user.id, text);
        }}
        onAnswer={answer}
      />

      <Separator />

      <ReviewsSection
        reviews={reviews}
        average={average}
        count={count}
        canReview={canReview.allowed}
        submitting={submitting}
        onSubmit={submit}
      />
    </div>
  );
}
