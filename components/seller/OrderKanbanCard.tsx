"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Price } from "@/components/shared/Price";
import { cn } from "@/lib/utils";
import type { SellerOrder } from "@/types/order";

type OrderKanbanCardProps = {
  order: SellerOrder;
  /** false en la columna "Cancelado": de solo lectura, no se puede levantar. */
  draggable: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

/** Id corto, fecha, SOLO mis ítems y el total de MIS ítems — nunca `orders.total` (un pedido multi-vendedor mezcla ítems que ni siquiera puedo ver). */
export function OrderKanbanCard({ order, draggable }: OrderKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: order.id,
    disabled: !draggable,
  });

  const myTotal = order.items.reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      tabIndex={draggable ? 0 : undefined}
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-sm",
        draggable && "cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">#{order.id.slice(0, 8)}</span>
        <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
      </div>
      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.quantity}× {item.title_snapshot}
          </li>
        ))}
      </ul>
      <Price value={myTotal} size="sm" />
    </div>
  );
}
