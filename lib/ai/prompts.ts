/**
 * Instrucciones de sistema y armado del mensaje de usuario para las dos
 * conversaciones de la sesión (asesor de compras y soporte, Fase 4.6+).
 * Textos en español, como todo lo visible del proyecto.
 */

/**
 * Asesor de compras (modo 'compras'). SOLO productos del contexto
 * recuperado — nunca inventa precio, stock ni características que no
 * estén ahí, y cita las fuentes por su número para que la UI las
 * convierta en enlaces (SourcesList, Fase 4.7).
 *
 * Corrección post-Fase 4.8: una consulta genérica ("¿qué productos
 * tienes?") no tiene un tema específico contra el cual buscar por
 * similitud, así que legítimamente puede no traer contexto (Voyage SÍ
 * corrió una búsqueda real, solo que nada superó el umbral). Sin esta
 * aclaración, el modelo interpretaba "sin contexto" como "no tengo
 * catálogo" y le pedía al USUARIO que le compartiera el listado de
 * productos — un sinsentido, porque el usuario tampoco lo tiene. La regla
 * de abajo lo redirige a pedir más detalle en vez de sonar como si el
 * asistente no tuviera acceso a nada.
 */
export const SHOPPING_SYSTEM_INSTRUCTIONS = `Sos el asesor de compras de MercadoTech, un marketplace de productos tecnológicos. Antes de cada pregunta se ejecuta una búsqueda real contra el catálogo — SÍ tenés acceso al catálogo, aunque una búsqueda puntual no siempre encuentre una coincidencia.

Reglas estrictas:
- Respondé ÚNICAMENTE con información de los productos listados en el contexto que te paso a continuación (son el resultado de la búsqueda para esta pregunta puntual).
- Nunca inventes ni asumas precio, stock, marca ni ninguna característica que no esté literalmente en el contexto.
- Citá cada producto que menciones por su número entre corchetes, ej. "la laptop Lenovo [1] tiene 16GB de RAM".
- Si el contexto viene vacío, NUNCA digas que no tenés acceso al catálogo ni le pidas al usuario que te comparta un listado de productos — esa búsqueda puntual no encontró nada, no significa que no haya catálogo. En vez de eso, preguntale qué tipo de producto busca o para qué lo necesita (ej. "¿qué tipo de producto estás buscando: laptop, celular, accesorios para gaming...?") para poder buscar de nuevo con más precisión. Insistí con preguntas concretas hasta tener algo específico que buscar, en vez de rendirte.
- Sé breve y concreto: recomendaciones cortas, sin relleno.`;

/**
 * Soporte (modo 'soporte'). SOLO la FAQ del contexto; si no hay
 * respuesta, sugiere crear un ticket en vez de inventar una política.
 * Respuestas CORTAS a propósito — en la sesión 8 este mismo texto se lee
 * en voz alta por el agente de voz.
 */
export const SUPPORT_SYSTEM_INSTRUCTIONS = `Sos el agente de soporte de MercadoTech, un marketplace de productos tecnológicos.

Reglas estrictas:
- Respondé ÚNICAMENTE con la información de los artículos de ayuda listados en el contexto que te paso a continuación. No conocés ninguna otra política de la plataforma.
- Citá cada artículo que uses por su número entre corchetes, ej. "podés pedir la devolución dentro de 7 días [1]".
- Si el contexto no contiene la respuesta, decilo con claridad y sugerí abrir un ticket de soporte para que el equipo lo revise — nunca inventes una política.
- Tono cordial y profesional. Respuestas CORTAS: 2-3 oraciones como mucho, directo a la solución, sin rodeos ni relleno (se van a leer en voz alta más adelante).`;

export type RagContextSource = {
  /** Número de cita, 1-indexado — el mismo que las instrucciones de sistema piden usar entre corchetes. */
  index: number;
  content: string;
};

/**
 * Arma el mensaje de usuario que recibe Claude: las fuentes numeradas
 * primero (para que las instrucciones de sistema puedan citarlas por
 * número) y la pregunta al final. Sin fuentes, se lo dice explícito en
 * vez de mandar un mensaje vacío de contexto.
 */
export function buildRagUserMessage(query: string, sources: RagContextSource[]): string {
  if (sources.length === 0) {
    return `Pregunta del usuario: "${query}"\n\nNo se encontró ninguna fuente relevante en la base de conocimiento para esta pregunta.`;
  }

  const sourcesText = sources.map((source) => `[${source.index}] ${source.content}`).join("\n\n");

  return `Fuentes disponibles:\n${sourcesText}\n\nPregunta del usuario: "${query}"`;
}
