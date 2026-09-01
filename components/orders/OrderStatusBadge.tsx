import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_VARIANT } from "@/lib/constants/orders";
import type { OrderStatus } from "@/lib/constants/roles";

type OrderStatusBadgeProps = {
  status: OrderStatus;
  className?: string;
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <Badge data-testid="order-status" variant={ORDER_STATUS_BADGE_VARIANT[status]} className={className}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
