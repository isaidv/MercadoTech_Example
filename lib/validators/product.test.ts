import { describe, expect, it } from "vitest";
import { validateProduct, validateImageFile, type ProductFormInput } from "./product";
import { TITLE_MIN, TITLE_MAX, MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/constants/product";

/** Fase 6.2 — cero mocks (product.ts es puro). Todos los valores frontera salen de lib/constants/product.ts (importados arriba), nunca copiados a mano. */

const VALID_INPUT: ProductFormInput = {
  title: "Laptop Lenovo IdeaPad",
  price: 1999.9,
  stock: 5,
  categoryId: "cat-1",
  imageCount: 2,
};

describe("validateProduct", () => {
  it("acepta el caso feliz completo", () => {
    const result = validateProduct(VALID_INPUT);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("frontera de título: TITLE_MIN-1 rechaza, TITLE_MIN acepta", () => {
    const corto = validateProduct({ ...VALID_INPUT, title: "a".repeat(TITLE_MIN - 1) });
    const justo = validateProduct({ ...VALID_INPUT, title: "a".repeat(TITLE_MIN) });
    expect(corto.valid).toBe(false);
    expect(corto.errors.title).toBeDefined();
    expect(justo.errors.title).toBeUndefined();
  });

  it("frontera de título: TITLE_MAX acepta, TITLE_MAX+1 rechaza", () => {
    const justo = validateProduct({ ...VALID_INPUT, title: "a".repeat(TITLE_MAX) });
    const largo = validateProduct({ ...VALID_INPUT, title: "a".repeat(TITLE_MAX + 1) });
    expect(justo.errors.title).toBeUndefined();
    expect(largo.valid).toBe(false);
    expect(largo.errors.title).toBeDefined();
  });

  it("recorta espacios del título antes de medir su longitud", () => {
    // Con espacios sin recortar mediría TITLE_MIN + 4 (2 de cada lado);
    // recortado debe quedar justo en TITLE_MIN y ser válido igual.
    const result = validateProduct({ ...VALID_INPUT, title: `  ${"a".repeat(TITLE_MIN)}  ` });
    expect(result.errors.title).toBeUndefined();
  });

  it("rechaza precio 0 y precio negativo; acepta precio positivo", () => {
    expect(validateProduct({ ...VALID_INPUT, price: 0 }).errors.price).toBeDefined();
    expect(validateProduct({ ...VALID_INPUT, price: -1 }).errors.price).toBeDefined();
    expect(validateProduct({ ...VALID_INPUT, price: 0.01 }).errors.price).toBeUndefined();
  });

  it("rechaza precio no finito (NaN, Infinity)", () => {
    expect(validateProduct({ ...VALID_INPUT, price: NaN }).errors.price).toBeDefined();
    expect(validateProduct({ ...VALID_INPUT, price: Infinity }).errors.price).toBeDefined();
  });

  it("acepta stock 0 (piso válido, no negativo); rechaza stock negativo", () => {
    expect(validateProduct({ ...VALID_INPUT, stock: 0 }).errors.stock).toBeUndefined();
    expect(validateProduct({ ...VALID_INPUT, stock: -1 }).errors.stock).toBeDefined();
  });

  it("rechaza stock no entero y stock no finito", () => {
    expect(validateProduct({ ...VALID_INPUT, stock: 1.5 }).errors.stock).toBeDefined();
    expect(validateProduct({ ...VALID_INPUT, stock: NaN }).errors.stock).toBeDefined();
  });

  it("rechaza categoryId vacío; acepta cualquier id no vacío", () => {
    expect(validateProduct({ ...VALID_INPUT, categoryId: "" }).errors.categoryId).toBeDefined();
    expect(validateProduct({ ...VALID_INPUT, categoryId: "cat-2" }).errors.categoryId).toBeUndefined();
  });

  it("frontera de imágenes: 0 rechaza, 1 acepta", () => {
    expect(validateProduct({ ...VALID_INPUT, imageCount: 0 }).errors.imageCount).toBeDefined();
    expect(validateProduct({ ...VALID_INPUT, imageCount: 1 }).errors.imageCount).toBeUndefined();
  });

  it("reporta los 5 errores a la vez cuando todo el input es inválido", () => {
    const result = validateProduct({ title: "a", price: 0, stock: -1, categoryId: "", imageCount: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeDefined();
    expect(result.errors.price).toBeDefined();
    expect(result.errors.stock).toBeDefined();
    expect(result.errors.categoryId).toBeDefined();
    expect(result.errors.imageCount).toBeDefined();
  });
});

describe("validateImageFile", () => {
  it("acepta cada tipo MIME permitido (derivado de ALLOWED_IMAGE_TYPES, nunca hardcodeado)", () => {
    for (const type of ALLOWED_IMAGE_TYPES) {
      const file = new File([new Uint8Array(10)], "producto.bin", { type });
      expect(validateImageFile(file)).toBeNull();
    }
  });

  it("rechaza un tipo MIME no permitido con 'type'", () => {
    const file = new File([new Uint8Array(10)], "producto.gif", { type: "image/gif" });
    expect(validateImageFile(file)).toBe("type");
  });

  it("frontera de tamaño: MAX_IMAGE_BYTES acepta, MAX_IMAGE_BYTES+1 rechaza con 'size'", () => {
    const justo = new File([new Uint8Array(MAX_IMAGE_BYTES)], "justo.jpg", { type: "image/jpeg" });
    const pasado = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "pasado.jpg", { type: "image/jpeg" });
    expect(validateImageFile(justo)).toBeNull();
    expect(validateImageFile(pasado)).toBe("size");
  });

  it("el tipo se revisa antes que el tamaño: un archivo con AMBOS problemas reporta 'type'", () => {
    const file = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "grande.gif", { type: "image/gif" });
    expect(validateImageFile(file)).toBe("type");
  });
});
