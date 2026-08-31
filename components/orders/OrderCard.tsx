import Link from "next/link";
import { Price } from "@/components/shared/Price";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import type { Order } from "@/types/order";

type OrderCardProps = {
  order: Order;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Link
      href={`/pedidos/${order.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Pedido #{order.id.slice(0, 8)}</p>
        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <OrderStatusBadge status={order.status} />
        <Price value={order.total} size="sm" />
      </div>
    </Link>
  );
}
