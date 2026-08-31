import type { TicketStatus } from "@/lib/constants/roles";

/** Etiquetas en español para `TicketStatusBadge` (Fase 4.7) — mismo patrón que `ORDER_STATUS_LABELS` en `lib/constants/orders.ts`. */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  abierto: "Abierto",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

/** Variante de `Badge` por estado — solo tokens ya existentes, nada hardcodeado (mismo criterio que `ORDER_STATUS_BADGE_VARIANT`). */
export const TICKET_STATUS_BADGE_VARIANT: Record<
  TicketStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  abierto: "outline",
  en_proceso: "secondary",
  resuelto: "default",
  cerrado: "destructive",
};
