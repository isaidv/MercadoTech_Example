import { Badge } from "@/components/ui/badge";
import { TICKET_STATUS_LABELS, TICKET_STATUS_BADGE_VARIANT } from "@/lib/constants/tickets";
import type { TicketStatus } from "@/lib/constants/roles";

type TicketStatusBadgeProps = {
  status: TicketStatus;
  className?: string;
};

/** Mismo patrón que `components/orders/OrderStatusBadge.tsx`. */
export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  return (
    <Badge variant={TICKET_STATUS_BADGE_VARIANT[status]} className={className}>
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}
