import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  /** Reintentar la carga (vuelve a llamar al service vía el hook). */
  onRetry?: () => void;
  className?: string;
};

/** Estado estándar cuando un service falla. `onRetry` es opcional: algunas pantallas prefieren recargar la página entera. */
export function ErrorState({
  title = "Algo salió mal",
  description = "No pudimos cargar esta información. Intenta de nuevo.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center",
        className
      )}
    >
      <AlertTriangle className="size-10 text-destructive" aria-hidden="true" />
      <h3 className="font-heading text-xl font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
