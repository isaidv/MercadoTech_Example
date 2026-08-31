import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";

type PriceSize = "sm" | "md" | "lg";

type PriceProps = {
  /** `numeric(12,2)` llega como string desde PostgREST — ver lib/utils.ts. */
  value: number | string;
  size?: PriceSize;
  className?: string;
};

const SIZE_CLASSES: Record<PriceSize, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

/** Muestra un precio formateado en soles, con la tipografía de títulos (Barlow Condensed). */
export function Price({ value, size = "md", className }: PriceProps) {
  return (
    <span
      className={cn("font-heading font-semibold tabular-nums", SIZE_CLASSES[size], className)}
    >
      {formatPrice(value)}
    </span>
  );
}
