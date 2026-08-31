"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_RATING = 5;

type RatingStarsSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<RatingStarsSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

type RatingStarsProps = {
  /** 1-5. En modo lectura puede venir con decimales (promedio); se redondea al pintar. */
  value: number;
  /** Si se pasa, el componente queda editable (formulario de reseña). Omitido = solo lectura. */
  onChange?: (value: number) => void;
  size?: RatingStarsSize;
  className?: string;
};

/**
 * 1-5 estrellas. Sin `onChange`: solo lectura, decorativa (`aria-hidden` +
 * texto accesible con el valor). Con `onChange`: editable, cada estrella es
 * un botón real — Tab la alcanza, Enter/Espacio la activa, ←/→ ajustan el
 * valor sin soltar el foco.
 */
export function RatingStars({ value, onChange, size = "md", className }: RatingStarsProps) {
  const rounded = Math.round(value);
  const iconClass = SIZE_CLASSES[size];

  if (!onChange) {
    return (
      <span className={cn("inline-flex items-center gap-0.5", className)}>
        <span className="sr-only">{value} de {MAX_RATING} estrellas</span>
        {Array.from({ length: MAX_RATING }, (_, i) => (
          <Star
            key={i}
            aria-hidden="true"
            className={cn(
              iconClass,
              i < rounded ? "fill-primary text-primary" : "fill-none text-muted-foreground"
            )}
          />
        ))}
      </span>
    );
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onChange?.(Math.min(MAX_RATING, value + 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      onChange?.(Math.max(1, value - 1));
    }
  }

  return (
    <span
      role="radiogroup"
      aria-label={`Calificación, ${value} de ${MAX_RATING} estrellas`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {Array.from({ length: MAX_RATING }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= rounded;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${starValue} estrella${starValue > 1 ? "s" : ""}`}
            onClick={() => onChange(starValue)}
            onKeyDown={handleKeyDown}
            className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              aria-hidden="true"
              className={cn(iconClass, filled ? "fill-primary text-primary" : "fill-none text-muted-foreground")}
            />
          </button>
        );
      })}
    </span>
  );
}
