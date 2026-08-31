import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  /** Cuántas filas de skeleton genérico mostrar (ignorado si se pasan children). */
  lines?: number;
  /** Layout de carga específico de la pantalla (ej. grid de ProductCardSkeleton). Si se pasa, reemplaza el genérico. */
  children?: React.ReactNode;
  className?: string;
};

/**
 * Placeholder de carga genérico — nunca un spinner (regla de la Fase 3.8).
 * La mayoría de las pantallas van a preferir su propio skeleton a medida
 * (ej. `ProductGrid` usa `ProductCardSkeleton` ×N); este es el fallback
 * cuando no hace falta un layout específico.
 */
export function LoadingState({ lines = 3, children, className }: LoadingStateProps) {
  if (children) {
    return (
      <div role="status" aria-label="Cargando" className={className}>
        {children}
      </div>
    );
  }

  return (
    <div role="status" aria-label="Cargando" className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
