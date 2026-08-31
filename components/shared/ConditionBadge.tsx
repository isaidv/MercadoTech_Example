import { Badge } from "@/components/ui/badge";
import type { ProductCondition } from "@/lib/constants/roles";

const LABELS: Record<ProductCondition, string> = {
  nuevo: "Nuevo",
  usado: "Usado",
  reacondicionado: "Reacondicionado",
};

// Reutiliza las variantes de Badge ya existentes (colores 100% vía tokens
// de globals.css, nada hardcodeado acá): "nuevo" con el color primario de
// marca, "usado" neutro, "reacondicionado" con borde (tratamiento más sutil).
const VARIANTS: Record<ProductCondition, "default" | "secondary" | "outline"> = {
  nuevo: "default",
  usado: "secondary",
  reacondicionado: "outline",
};

type ConditionBadgeProps = {
  condition: ProductCondition;
  className?: string;
};

export function ConditionBadge({ condition, className }: ConditionBadgeProps) {
  return (
    <Badge variant={VARIANTS[condition]} className={className}>
      {LABELS[condition]}
    </Badge>
  );
}
