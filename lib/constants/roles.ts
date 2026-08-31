/**
 * Roles de usuario y estados de dominio.
 *
 * Fuente única de verdad en TypeScript para los mismos valores que los
 * `check` constraints de la base de datos (ver `supabase/migrations/`,
 * Fase 2.2). Si cambia un valor aquí, debe cambiar también la migración
 * correspondiente — y viceversa.
 */

/** Rol del usuario. Default en `profiles.role`: 'buyer'. */
export const ROLES = ["buyer", "seller", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Estados del ciclo de vida de un pedido. Default en `orders.status`: 'pendiente'. */
export const ORDER_STATUSES = [
  "pendiente",
  "pagado",
  "enviado",
  "entregado",
  "cancelado",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Estados de un ticket de soporte. Default en `support_tickets.status`: 'abierto'. */
export const TICKET_STATUSES = [
  "abierto",
  "en_proceso",
  "resuelto",
  "cerrado",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Condición física de un producto. Default en `products.condition`: 'nuevo'. */
export const PRODUCT_CONDITIONS = [
  "nuevo",
  "usado",
  "reacondicionado",
] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];
