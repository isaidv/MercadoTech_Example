import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

type CartIndicatorProps = {
  /** `useCart().count` la conecta en la Fase 3.6. */
  count: number;
  className?: string;
};

export function CartIndicator({ count, className }: CartIndicatorProps) {
  return (
    <Link
      href="/carrito"
      aria-label={`Carrito, ${count} ${count === 1 ? "producto" : "productos"}`}
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <ShoppingCart className="size-4" aria-hidden="true" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
