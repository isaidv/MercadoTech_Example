import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ReadResourceResult, ListResourcesResult } from "@modelcontextprotocol/sdk/types.js";
import type { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { safeList, safeRead } from "../lib/safe-resource.js";

type StaticResourceDefinition = {
  name: string;
  uri: string;
  title?: string;
  description: string;
  mimeType?: string;
  read: () => Promise<ReadResourceResult>;
};

/** Resource de URI fija (Fase 5.4) — `safeRead` (lección 7) queda aplicado UNA vez acá, no en cada archivo. */
export function defineStaticResource(server: McpServer, def: StaticResourceDefinition): void {
  server.registerResource(
    def.name,
    def.uri,
    { title: def.title ?? def.name, description: def.description, mimeType: def.mimeType ?? "application/json" },
    () => safeRead(def.uri, def.read),
  );
}

type ResourceTemplateDefinition = {
  name: string;
  uriTemplate: string;
  title?: string;
  description: string;
  mimeType?: string;
  /** Enumera instancias reales para `resources/list` — envuelto en `safeList`: si falla, la lista queda vacía, nunca tumba el listado general. */
  list: () => Promise<ListResourcesResult>;
  read: (variables: Variables) => Promise<ReadResourceResult>;
};

/** Resource con patrón de URI (`{id}`, Fase 5.4) — mismo `safeRead`/`safeList` aplicados una sola vez acá. */
export function defineResourceTemplate(server: McpServer, def: ResourceTemplateDefinition): void {
  const template = new ResourceTemplate(def.uriTemplate, {
    list: () => safeList(def.list),
  });
  server.registerResource(
    def.name,
    template,
    { title: def.title ?? def.name, description: def.description, mimeType: def.mimeType ?? "application/json" },
    (uri, variables) => safeRead(uri.toString(), () => def.read(variables)),
  );
}
