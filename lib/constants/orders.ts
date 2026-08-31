import type { OrderStatus } from "@/lib/constants/roles";

/**
 * Secuencia de avance de un pedido — 'cancelado' queda fuera a propósito:
 * es una rama aparte (solo alcanzable desde 'pendiente', ver
 * `validate_order_status_transition` en 20260821110000_create_rls_policies.sql),
 * no "un paso más" de la secuencia normal. Esta fase (3.6) solo la usa para
 * decidir si el comprador puede cancelar (`status === 'pendiente'`); el
 * vendedor la usa para el kanban en la Fase 3.7.
 */
export const ORDER_STATUS_FLOW: OrderStatus[] = ["pendiente", "pagado", "enviado", "entregado"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

/** Variante de `Badge` por estado — solo tokens ya existentes, nada hardcodeado. */
export const ORDER_STATUS_BADGE_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pendiente: "outline",
  pagado: "secondary",
  enviado: "secondary",
  entregado: "default",
  cancelado: "destructive",
};
