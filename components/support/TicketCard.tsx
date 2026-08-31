import { TicketStatusBadge } from "@/components/support/TicketStatusBadge";
import type { SupportTicket } from "@/types/ticket";

type TicketCardProps = {
  ticket: SupportTicket;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

/** Solo lectura (decisión 5, Fase 4.7): sin link a un detalle — esa página llega con el agente de la sesión 8. Mismo patrón visual que `OrderCard`. */
export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{ticket.subject}</p>
        <p className="text-xs text-muted-foreground">{formatDate(ticket.created_at)}</p>
      </div>
      <TicketStatusBadge status={ticket.status} />
    </div>
  );
}
