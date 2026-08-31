// stdout transporta JSON-RPC: cualquier log va a stderr o corrompe la sesión.
console.log = console.info = console.warn = (...a) => console.error(...a);

/**
 * mcp/src/index.ts — Fase 5.2.
 *
 * Entrada del servidor. La línea 1 de arriba tiene que ser lo PRIMERO que
 * se ejecute en todo el proceso — por eso todo lo demás (incluido el SDK)
 * se importa DINÁMICO, adentro de `main()`, en vez de con `import` estático
 * arriba del archivo. Un `import` estático se "hoistea": se evalúa ANTES de
 * que corra cualquier línea del cuerpo del módulo, sin importar dónde esté
 * escrito. Si `server.ts`, `env.ts`, `context.ts`, o cualquiera de sus
 * dependencias transitivas (el SDK, un service, una librería de un tool
 * futuro) hiciera un `console.log` a nivel de módulo, se ejecutaría ANTES
 * de la redirección — y stdout ya quedaría corrompido para toda la sesión.
 * `import()` dinámico corre en el orden real del código (como cualquier
 * otra expresión), así que la redirección queda garantizada primero
 * siempre, sin depender de que nadie más se acuerde de la regla.
 */
async function main() {
  const { loadEnvLocal } = await import("./env.js");
  const { createServer } = await import("./server.js");
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");

  loadEnvLocal();

  const server = createServer();
  await server.connect(new StdioServerTransport());

  console.error("[mercadotech-mcp] servidor conectado por stdio (0 tools, 0 resources, 0 prompts — Fase 5.2)");
}

main().catch((error) => {
  console.error("[mercadotech-mcp] fallo fatal al arrancar:", error);
  process.exit(1);
});
