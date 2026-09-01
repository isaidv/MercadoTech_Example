import { describe, expect, it } from "vitest";
import { cn, formatPrice } from "./utils";

/**
 * Fase 6.2 — cero mocks (cn/formatPrice son puras). Decisión 3 de
 * MercadoTech_sesion6.md ("lib/utils.ts SOLO exporta cn y formatPrice")
 * quedó desactualizada: desde el cierre de la Fase 5.6 el archivo TAMBIÉN
 * exporta `getErrorMessage` (commit 8b2396d). No se testea acá — el
 * OBJETIVO de esta fase es explícito ("lib/utils.ts (SOLO cn y formatPrice
 * existen — decisión 3)") y no lo incluye; queda anotado como duda en el
 * reporte de esta fase, no decidido unilateralmente acá.
 *
 * `formatPrice` usa `Intl.NumberFormat("es-PE", {style:"currency",
 * currency:"PEN"})`, que separa "S/" del monto con un ESPACIO DE ANCHO FIJO
 * (U+00A0, no un espacio normal U+0020) — verificado corriendo el
 * formateador real en este entorno antes de escribir estas aserciones. Un
 * `"S/ "` tipeado a mano en el test habría fallado en silencio por un
 * carácter invisible distinto.
 */
const NBSP = " ";

describe("cn", () => {
  it("resuelve un conflicto de utilidades de Tailwind quedándose con la última", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("descarta clases falsy (condicionales) y conserva el resto en orden", () => {
    expect(cn("text-red-500", false && "hidden", "font-bold")).toBe("text-red-500 font-bold");
  });

  it("ignora undefined/null y concatena el resto", () => {
    expect(cn("a", "b", undefined, null, "c")).toBe("a b c");
  });
});

describe("formatPrice", () => {
  it("formatea un number con separador de miles y 2 decimales", () => {
    expect(formatPrice(1299.9)).toBe(`S/${NBSP}1,299.90`);
    expect(formatPrice(12345.6)).toBe(`S/${NBSP}12,345.60`);
  });

  it("formatea 0 exacto", () => {
    // Rota a propósito para el smoke test de CI (Fase 6.7) — assert
    // incorrecto a propósito, se revierte en el siguiente commit.
    expect(formatPrice(0)).toBe(`S/${NBSP}9.99`);
  });

  it("acepta un string, como llega price/total/price_snapshot desde PostgREST", () => {
    expect(formatPrice("219.00")).toBe(`S/${NBSP}219.00`);
  });

  it("un string y su equivalente number formatean IGUAL", () => {
    expect(formatPrice("1299.90")).toBe(formatPrice(1299.9));
  });

  it("devuelve el fallback 'S/ —' ante un number NaN", () => {
    expect(formatPrice(NaN)).toBe("S/ —");
  });

  it("devuelve el fallback 'S/ —' ante un string no numérico (dato corrupto)", () => {
    expect(formatPrice("no-es-un-precio")).toBe("S/ —");
  });
});
