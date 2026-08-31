import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL_DEFAULT,
  MAX_EMBEDDING_INPUT_CHARS,
} from "@/lib/constants/ai";

const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";

/**
 * 'document' al indexar (Fases 4.2–4.3), 'query' al buscar (Fase 4.4).
 * Voyage antepone una instrucción distinta al texto según este valor —
 * SIN default a propósito (Guía Claude + Voyage, lección 2): quien llama
 * DEBE elegir. Omitirlo o mandar el mismo valor en los dos lados no da
 * error, degrada el retrieval en silencio — es la trampa silenciosa de
 * esta sesión.
 */
export type EmbeddingInputType = "document" | "query";

/**
 * Único archivo del proyecto que conoce la API de Voyage. Por `fetch`, no
 * SDK (Guía, lección 1): el SDK `voyageai` de TypeScript está en v0.x y
 * documenta mal `input_type` — este archivo no conoce a Claude ni a su
 * SDK, es el proveedor simétrico de `completion.ts`.
 *
 * `EMBEDDING_MODEL_DEFAULT` puede sobreescribirse con
 * `VOYAGE_EMBEDDING_MODEL` — pero cambiar a un modelo con otra dimensión
 * exige además la migración que menciona `EMBEDDING_DIMENSIONS`
 * (lib/constants/ai.ts): esta función solo usa la variable para elegir
 * modelo, no valida que la dimensión siga siendo compatible más allá del
 * chequeo de forma de abajo.
 */
export async function generateEmbedding(text: string, inputType: EmbeddingInputType): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta VOYAGE_API_KEY en .env.local — sin ella, Voyage (embeddings) no puede fichar ni buscar. Ver 'Antes de empezar' en MercadoTech_sesion4.md.",
    );
  }

  const model = process.env.VOYAGE_EMBEDDING_MODEL || EMBEDDING_MODEL_DEFAULT;

  const response = await fetch(VOYAGE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: [text], model, input_type: inputType }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    // Guía, lección 8: por status HTTP (Voyage no tiene SDK con clases
    // de error tipadas — a diferencia de Claude en completion.ts).
    if (response.status === 401) {
      throw new Error(`Voyage (embeddings) rechazó la llave (401): revisá VOYAGE_API_KEY en .env.local. ${body}`);
    }
    if (response.status === 429) {
      throw new Error(`Voyage (embeddings) devolvió límite de tasa (429): esperá y reintentá. ${body}`);
    }
    if (response.status === 400) {
      throw new Error(
        `Voyage (embeddings) rechazó la solicitud (400): revisá el modelo ("${model}") o input_type ("${inputType}"). ${body}`,
      );
    }
    throw new Error(`Voyage (embeddings) falló con HTTP ${response.status}: ${body}`);
  }

  const json = await response.json();
  const data = json?.data;
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error(
      `Voyage (embeddings) devolvió una forma inesperada: se pidió 1 texto y se esperaba exactamente 1 elemento en "data", llegaron ${Array.isArray(data) ? data.length : typeof data}.`,
    );
  }

  // Lección 5: validar la forma del vector — mejor un error claro acá que
  // una fila corrupta en knowledge_embeddings.
  const vector = data[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS || vector.some((value) => typeof value !== "number")) {
    throw new Error(
      `Voyage (embeddings) devolvió un embedding inválido: se esperaba un vector numérico plano de ${EMBEDDING_DIMENSIONS} números.`,
    );
  }

  return vector;
}

/** Subconjunto de campos de `products` que hace falta para armar el texto — no el `Product` enriquecido de `types/product.ts` (image_url/rating/etc. no aportan nada a la ficha). */
export type ProductEmbeddingSource = {
  title: string;
  brand: string | null;
  condition: string;
  description: string | null;
};

export type CategoryEmbeddingSource = {
  name: string;
};

/**
 * Secciones etiquetadas en orden de mayor a menor densidad semántica —
 * lo primero sobrevive al corte de `MAX_EMBEDDING_INPUT_CHARS`. El título
 * es lo más denso (resume el producto en pocas palabras); la descripción,
 * la más larga y menos densa por palabra, va al final.
 */
export function buildProductEmbeddingText(product: ProductEmbeddingSource, category: CategoryEmbeddingSource): string {
  const sections = [
    `Título: ${product.title}`,
    `Marca: ${product.brand ?? "—"}`,
    `Categoría: ${category.name}`,
    `Condición: ${product.condition}`,
    `Descripción: ${product.description ?? ""}`,
  ];
  return sections.join("\n").slice(0, MAX_EMBEDDING_INPUT_CHARS);
}

export type SupportArticleEmbeddingSource = {
  title: string;
  category: string | null;
  content: string;
};

/** Mismo criterio que buildProductEmbeddingText: título y categoría (densos) primero, el contenido largo del artículo al final. */
export function buildSupportArticleEmbeddingText(article: SupportArticleEmbeddingSource): string {
  const sections = [
    `Título: ${article.title}`,
    `Categoría: ${article.category ?? "—"}`,
    `Contenido: ${article.content}`,
  ];
  return sections.join("\n").slice(0, MAX_EMBEDDING_INPUT_CHARS);
}
