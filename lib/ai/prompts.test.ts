import { describe, expect, it } from "vitest";
import { buildRagUserMessage, SUPPORT_SYSTEM_INSTRUCTIONS } from "./prompts";

/** Fase 6.2 — cero mocks (buildRagUserMessage es puro; las instrucciones de sistema son strings estáticos). */

describe("buildRagUserMessage", () => {
  it("sin fuentes, dice explícitamente que no encontró nada y de todos modos incluye la query", () => {
    const message = buildRagUserMessage("¿cómo devuelvo un producto?", []);
    expect(message).toContain("¿cómo devuelvo un producto?");
    expect(message).toContain("No se encontró ninguna fuente relevante");
  });

  it("con fuentes, las numera [n] en orden y cierra con la query", () => {
    const message = buildRagUserMessage("¿qué laptops tienen?", [
      { index: 1, content: "Laptop Lenovo IdeaPad, 16GB RAM" },
      { index: 2, content: "Laptop HP Pavilion, 8GB RAM" },
    ]);
    expect(message).toContain("[1] Laptop Lenovo IdeaPad, 16GB RAM");
    expect(message).toContain("[2] Laptop HP Pavilion, 8GB RAM");
    expect(message).toContain("¿qué laptops tienen?");
    // El orden real: fuentes primero, pregunta al final (para que las
    // instrucciones de sistema puedan citarlas por número).
    expect(message.indexOf("[1]")).toBeLessThan(message.indexOf("¿qué laptops tienen?"));
  });
});

describe("SUPPORT_SYSTEM_INSTRUCTIONS", () => {
  it("incluye la instrucción de sugerir un ticket cuando el contexto no tiene la respuesta", () => {
    expect(SUPPORT_SYSTEM_INSTRUCTIONS).toContain("abrir un ticket de soporte");
  });

  it("prohíbe explícitamente inventar una política", () => {
    expect(SUPPORT_SYSTEM_INSTRUCTIONS).toContain("nunca inventes una política");
  });
});
