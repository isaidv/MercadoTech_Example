import { describe, expect, it } from "vitest";
import { canMove } from "./useSellerOrders";

/**
 * Fase 6.3, decisión 4 — la secuencia del kanban vive como helper de
 * MÓDULO en `hooks/useSellerOrders.ts` (NO en `seller.service.ts`, ver
 * services/seller.service.test.ts). Se testea directo, sin React, sin
 * `renderHook`: `canMove` no toca estado ni efectos.
 *
 * Único cambio de producción permitido: se le agregó `export`, cero
 * cambios de lógica (ver el diff en el commit de esta fase).
 */

describe("canMove", () => {
  it("acepta los 3 pasos válidos del flujo (ORDER_STATUS_FLOW)", () => {
    expect(canMove("pendiente", "pagado")).toBe(true);
    expect(canMove("pagado", "enviado")).toBe(true);
    expect(canMove("enviado", "entregado")).toBe(true);
  });

  it("rechaza saltarse un paso", () => {
    expect(canMove("pendiente", "enviado")).toBe(false);
    expect(canMove("pendiente", "entregado")).toBe(false);
  });

  it("rechaza retroceder", () => {
    expect(canMove("pagado", "pendiente")).toBe(false);
    expect(canMove("entregado", "enviado")).toBe(false);
  });

  it("'cancelado' nunca es un destino válido para el vendedor", () => {
    expect(canMove("pendiente", "cancelado")).toBe(false);
    expect(canMove("pagado", "cancelado")).toBe(false);
  });

  it("'cancelado' como origen es rechazado (no está en ORDER_STATUS_FLOW — mismo camino que un estado desconocido)", () => {
    expect(canMove("cancelado", "pagado")).toBe(false);
    expect(canMove("cancelado", "pendiente")).toBe(false);
  });

  it("'entregado' es terminal: no hay paso siguiente válido", () => {
    expect(canMove("entregado", "pendiente")).toBe(false);
    expect(canMove("entregado", "cancelado")).toBe(false);
  });

  it("rechaza quedarse en el mismo estado", () => {
    expect(canMove("pagado", "pagado")).toBe(false);
  });
});
