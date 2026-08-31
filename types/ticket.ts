import type { Database } from "@/types/database";
import type { TicketStatus } from "@/lib/constants/roles";

/**
 * Ticket de soporte (Fase 4.7) — solo lectura desde la UI (decisión 5):
 * crear tickets llega con el agente de voz de la sesión 8. Vive acá, no en
 * `services/ticket.service.ts`, para que `components/support/TicketCard.tsx`
 * lo importe sin que `components/` termine importando de `services/`
 * (mismo criterio que `Order` en `types/order.ts`).
 */
export type SupportTicket = Omit<Database["public"]["Tables"]["support_tickets"]["Row"], "status"> & {
  status: TicketStatus;
};
