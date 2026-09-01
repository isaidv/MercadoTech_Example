import { PackageSearch } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { Product } from "@/types/product";
import type { ReactNode } from "react";

type ProductGridProps = {
  /** `similarity` opcional por ítem (Fase 4.4) — presente solo cuando viene de la búsqueda semántica; `ProductCard` la recibe igual, por prop opcional. */
  items: (Product & { similarity?: number })[];
  loading: boolean;
  emptyAction?: ReactNode;
  /** Título/descripción del EmptyState — override opcional para contextos donde "ajustá los filtros" no aplica (ej. la pestaña "Resultados con IA", que sugiere reformular en vez de filtrar). */
  emptyTitle?: string;
  emptyDescription?: string;
};

const GRID_CLASSES = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/** ~2 filas visibles en desktop (4 columnas) mientras carga — ni tan poco que parpadee, ni tanto que sature la pantalla. */
const SKELETON_COUNT = 8;

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <Skeleton className="aspect-square w-full rounded-md" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

/** Grid responsive (1/2/3/4 columnas) + skeleton durante carga + EmptyState si no hay resultados. Nunca conoce Supabase: todo llega resuelto por props. */
export function ProductGrid({ items, loading, emptyAction, emptyTitle, emptyDescription }: ProductGridProps) {
  if (loading) {
    return (
      <div className={GRID_CLASSES}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<PackageSearch className="size-10" aria-hidden="true" />}
        title={emptyTitle ?? "No encontramos productos"}
        description={emptyDescription ?? "Prueba ajustando los filtros o buscando con otras palabras."}
        action={emptyAction}
      />
    );
  }

  return (
    <div data-testid="product-grid" className={GRID_CLASSES}>
      {items.map((product) => (
        <ProductCard key={product.id} product={product} similarity={product.similarity} />
      ))}
    </div>
  );
}
