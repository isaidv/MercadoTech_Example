import { describe, expect, it } from "vitest";
import { validateLogin, validateRegister, type RegisterInput } from "./auth";
import { ROLES } from "@/lib/constants/roles";

/**
 * Fase 6.2 — cero mocks (auth.ts es puro: sin React, sin Supabase).
 *
 * `MIN_PASSWORD_LENGTH` (8), `DISPLAY_NAME_MIN` (2) y `DISPLAY_NAME_MAX`
 * (60) son constantes MÓDULO-PRIVADAS en `lib/validators/auth.ts` (sin
 * `export`) — no se pueden importar sin modificar el archivo fuente, algo
 * que las RESTRICCIONES de esta fase prohíben. Quedan como literales
 * documentados acá, no como "números mágicos" sin explicar — ver la duda
 * anotada en el reporte de esta fase.
 *
 * `REGISTERABLE_ROLES` (también privada) SÍ se puede derivar sin tocar el
 * archivo: es exactamente `ROLES.filter(r => r !== "admin")`, y `ROLES` sí
 * está exportado desde `lib/constants/roles.ts` — se deriva acá en vez de
 * hardcodear ["buyer", "seller"].
 */
const MIN_PASSWORD_LENGTH = 8; // ver nota de arriba: no exportada, no se puede importar.
const DISPLAY_NAME_MIN = 2; // idem.
const DISPLAY_NAME_MAX = 60; // idem.
const REGISTERABLE_ROLES = ROLES.filter((role) => role !== "admin");

const VALID_REGISTER: RegisterInput = {
  email: "buyer1@mercadotech.test",
  password: "a".repeat(MIN_PASSWORD_LENGTH),
  displayName: "Comprador Uno",
  role: "buyer",
};

describe("validateLogin", () => {
  it("acepta email y password válidos", () => {
    const result = validateLogin({ email: "buyer1@mercadotech.test", password: "a".repeat(MIN_PASSWORD_LENGTH) });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("rechaza un email sin arroba", () => {
    const result = validateLogin({ email: "buyer1mercadotech.test", password: "a".repeat(MIN_PASSWORD_LENGTH) });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("rechaza un email sin dominio (sin punto tras la arroba)", () => {
    const result = validateLogin({ email: "buyer1@mercadotech", password: "a".repeat(MIN_PASSWORD_LENGTH) });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("recorta espacios alrededor del email antes de validar", () => {
    const result = validateLogin({ email: "  buyer1@mercadotech.test  ", password: "a".repeat(MIN_PASSWORD_LENGTH) });
    expect(result.valid).toBe(true);
  });

  it("frontera de password: longitud MIN_PASSWORD_LENGTH-1 rechaza, MIN_PASSWORD_LENGTH acepta", () => {
    const corta = validateLogin({ email: "buyer1@mercadotech.test", password: "a".repeat(MIN_PASSWORD_LENGTH - 1) });
    const justa = validateLogin({ email: "buyer1@mercadotech.test", password: "a".repeat(MIN_PASSWORD_LENGTH) });
    expect(corta.valid).toBe(false);
    expect(corta.errors.password).toBeDefined();
    expect(justa.valid).toBe(true);
    expect(justa.errors.password).toBeUndefined();
  });

  it("reporta ambos errores a la vez cuando email y password son inválidos", () => {
    const result = validateLogin({ email: "invalido", password: "corta" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
  });
});

describe("validateRegister", () => {
  it("acepta el caso feliz completo", () => {
    const result = validateRegister(VALID_REGISTER);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("rechaza email inválido", () => {
    const result = validateRegister({ ...VALID_REGISTER, email: "no-es-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("frontera de password: MIN_PASSWORD_LENGTH-1 rechaza, MIN_PASSWORD_LENGTH acepta", () => {
    const corta = validateRegister({ ...VALID_REGISTER, password: "a".repeat(MIN_PASSWORD_LENGTH - 1) });
    const justa = validateRegister({ ...VALID_REGISTER, password: "a".repeat(MIN_PASSWORD_LENGTH) });
    expect(corta.valid).toBe(false);
    expect(corta.errors.password).toBeDefined();
    expect(justa.errors.password).toBeUndefined();
  });

  it("frontera de displayName: DISPLAY_NAME_MIN-1 rechaza, DISPLAY_NAME_MIN acepta", () => {
    const corto = validateRegister({ ...VALID_REGISTER, displayName: "a".repeat(DISPLAY_NAME_MIN - 1) });
    const justo = validateRegister({ ...VALID_REGISTER, displayName: "a".repeat(DISPLAY_NAME_MIN) });
    expect(corto.valid).toBe(false);
    expect(corto.errors.displayName).toBeDefined();
    expect(justo.errors.displayName).toBeUndefined();
  });

  it("frontera de displayName: DISPLAY_NAME_MAX acepta, DISPLAY_NAME_MAX+1 rechaza", () => {
    const justo = validateRegister({ ...VALID_REGISTER, displayName: "a".repeat(DISPLAY_NAME_MAX) });
    const largo = validateRegister({ ...VALID_REGISTER, displayName: "a".repeat(DISPLAY_NAME_MAX + 1) });
    expect(justo.errors.displayName).toBeUndefined();
    expect(largo.valid).toBe(false);
    expect(largo.errors.displayName).toBeDefined();
  });

  it("recorta espacios del displayName antes de medir su longitud", () => {
    // "  ab  " tiene 6 caracteres crudos pero 2 después de trim (DISPLAY_NAME_MIN) — no debe rechazarse.
    const result = validateRegister({ ...VALID_REGISTER, displayName: "  ab  " });
    expect(result.errors.displayName).toBeUndefined();
  });

  it("acepta cada rol registrable (derivado de ROLES, nunca hardcodeado)", () => {
    for (const role of REGISTERABLE_ROLES) {
      const result = validateRegister({ ...VALID_REGISTER, role });
      expect(result.errors.role).toBeUndefined();
    }
  });

  it("rechaza 'admin' aunque sea un Role válido a nivel de tipo", () => {
    const result = validateRegister({ ...VALID_REGISTER, role: "admin" });
    expect(result.valid).toBe(false);
    expect(result.errors.role).toBeDefined();
  });

  it("reporta los 4 errores a la vez cuando todo el input es inválido", () => {
    const result = validateRegister({ email: "x", password: "1", displayName: "a", role: "admin" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
    expect(result.errors.displayName).toBeDefined();
    expect(result.errors.role).toBeDefined();
  });
});
