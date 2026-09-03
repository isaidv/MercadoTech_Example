/**
 * Tunables de la capa de IA (Fase 4.2). Ver "Guía Claude + Voyage —
 * decisiones cerradas" y la tabla de tunables de la Fase 4.2 en
 * MercadoTech_sesion4.md — cada valor lleva el comentario que justifica
 * su elección (regla 5 de CLAUDE.md, igual que el resto de
 * `lib/constants/`).
 */

/**
 * Fuentes que esta sesión indexa en `knowledge_embeddings` — mismos
 * valores que el `check (source_type in (...))` de
 * `20260826140100_create_knowledge_embeddings.sql` (Fase 4.1). Fuente
 * única de verdad en TypeScript para ese constraint, mismo criterio que
 * `PRODUCT_CONDITIONS`/`ORDER_STATUSES` en `lib/constants/roles.ts`.
 */
export const KNOWLEDGE_SOURCE_TYPES = ["producto", "articulo_soporte"] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

/**
 * Dimensión del vector que produce voyage-4-lite. Queda grabada en la
 * columna `embedding vector(1024)` de `knowledge_embeddings` — cambiar de
 * modelo de embeddings a otro con otra dimensión exige
 * `alter column embedding type vector(N)` + recrear el índice HNSW y
 * `match_knowledge` (Fase 4.1), no solo tocar esta constante.
 */
export const EMBEDDING_DIMENSIONS = 1024;

/**
 * Modelo de embeddings por defecto. Se lee de `VOYAGE_EMBEDDING_MODEL`
 * con fallback acá — palanca de upgrade deliberado, no un parche a un
 * proveedor inestable (los ids de Voyage, igual que los de Claude, no
 * rotan sin aviso — Guía Claude + Voyage, lección 3).
 */
export const EMBEDDING_MODEL_DEFAULT = "voyage-4-lite";

/**
 * Tope de caracteres del texto que se manda a vectorizar. Voyage acepta
 * hasta 32.000 tokens por input, así que esto YA NO existe para esquivar
 * un truncado silencioso (a diferencia del ReadHub original, con MiniLM):
 * es una decisión de densidad de señal y costo — el texto útil de un
 * producto o artículo (título, marca, categoría, condición, el inicio de
 * la descripción) cabe de sobra en 1000 caracteres; agregar el resto solo
 * diluiría la ficha con relleno que no ayuda a que la búsqueda encuentre
 * lo relevante, y cuesta más tokens sin aportar señal.
 */
export const MAX_EMBEDDING_INPUT_CHARS = 1000;

/**
 * Resultados que trae la búsqueda semántica por defecto (Fase 4.4) —
 * suficiente para un grid de catálogo sin sobrecargar la pestaña
 * "Resultados con IA".
 */
export const VECTOR_SEARCH_DEFAULT_TOP_K = 5;

/**
 * Tope duro de resultados que la búsqueda semántica puede pedir, aunque
 * el caller pida más — evita que un `match_count` mal puesto dispare una
 * consulta desproporcionada contra `match_knowledge`.
 */
export const VECTOR_SEARCH_MAX_TOP_K = 20;

/**
 * Similitud mínima para considerar un resultado relevante. RECALIBRADO en
 * la Fase 4.8 con datos reales (docs/RAG.md, sección "Calibración"): sobre
 * 10 consultas variadas contra el catálogo/FAQ reales, el 0.3 heredado
 * dejaba pasar contenido sin relación al contexto (similitud 0.32–0.45 —
 * ej. un procesador o unos audífonos como "fuente" de una consulta sobre
 * laptops) en CADA consulta que devolvía el máximo de 5 resultados, sin que
 * ninguna consulta legítima probada devolviera 0 fuentes. En ningún caso
 * medido el modelo citó una fuente por debajo de 0.45 de similitud — 0.4
 * poda ese ruido con margen (la fuente relevante más baja observada quedó
 * en 0.452) sin arriesgar falsos negativos.
 */
export const VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD = 0.4;

/**
 * Cuántas fuentes como máximo entran al contexto del chat (Fase 4.5) —
 * límite superior aunque haya más resultados relevantes, para no saturar
 * el prompt con fuentes de relevancia marginal.
 */
export const CONTEXT_BUILDER_DEFAULT_MAX_SOURCES = 5;

/**
 * Similitud mínima para que una fuente entre al contexto del chat. Mismo
 * valor que `VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD` tras la
 * recalibración de la Fase 4.8 (docs/RAG.md) — se mantienen como
 * constantes separadas porque búsqueda y chat son consumidores distintos
 * que podrían necesitar umbrales distintos el día de mañana, aunque hoy
 * compartan el mismo valor medido.
 */
export const CONTEXT_BUILDER_DEFAULT_MIN_SIMILARITY = 0.4;

/**
 * Contenido más corto que esto no aporta nada útil al contexto (ej. una
 * ficha vacía o mal truncada) — se descarta aunque pase el umbral de
 * similitud.
 */
export const CONTEXT_BUILDER_MIN_CONTENT_LENGTH = 20;

/**
 * Presupuesto de caracteres del contexto que se manda a Claude — controla
 * el costo (se factura por token de entrada) y evita prompts
 * desproporcionados.
 */
export const CONTEXT_BUILDER_DEFAULT_MAX_CONTEXT_CHARS = 8000;

/**
 * Si a la última fuente que entra le queda menos de esto por el
 * presupuesto de caracteres, se descarta entera en vez de truncarla a la
 * mitad — media frase de una fuente confunde más de lo que aporta.
 */
export const CONTEXT_BUILDER_MIN_TRUNCATED_SOURCE_CHARS = 200;

/**
 * Modelo de chat por defecto. Se lee de `ANTHROPIC_CHAT_MODEL` con
 * fallback acá.
 *
 * Corrección real (Fase 7.4, smoke test de producción): la Guía Claude +
 * Voyage (lección 3) asumía que el id SIN sufijo de fecha
 * ("claude-haiku-4-5") era el alias estable — falso para este modelo.
 * Anthropic lo rechaza con 400 ("model: claude-haiku-4-5"), confirmado en
 * vivo (`lib/ai/completion.ts` lo reporta tal cual). El id real y vigente
 * de Haiku 4.5 SÍ lleva el sufijo de fecha: `claude-haiku-4-5-20251001`.
 */
export const ANTHROPIC_CHAT_MODEL_DEFAULT = "claude-haiku-4-5-20251001";

/**
 * `max_tokens` es obligatorio en la API de Claude (Guía, lección 4) —
 * 1024 alcanza de sobra para una respuesta de RAG (~300 tokens típicos)
 * con margen para citas de fuentes numeradas.
 */
export const ANTHROPIC_CHAT_MAX_TOKENS = 1024;

/**
 * Tope de caracteres de la consulta del usuario (búsqueda semántica o
 * chat) — evita mandar a Voyage/Claude un input desproporcionado por
 * error o abuso, antes incluso de llegar al proveedor.
 */
export const CHAT_QUERY_MAX_CHARS = 4000;
