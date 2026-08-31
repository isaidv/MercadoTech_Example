import Link from "next/link";
import { ProductImage } from "@/components/shared/ProductImage";
import { Price } from "@/components/shared/Price";
import type { ChatSourceDisplay } from "@/types/chat";

type SourcesListProps = {
  sources: ChatSourceDisplay[];
};

/**
 * Fuentes citadas por una respuesta del asistente (Fase 4.7) — el número
 * entre corchetes coincide con la cita que arma `lib/ai/prompts.ts` en el
 * texto de la respuesta. Puro: recibe las fuentes YA hidratadas por
 * `useChat` (producto con imagen/precio resueltos); no conoce el endpoint
 * ni `lib/ai/`.
 *
 * Producto → mini-card con imagen/precio, link a `/producto/[id]`.
 * Artículo → por ahora ancla al propio `/soporte` (su página de detalle
 * llega después de esta sesión). Si la hidratación de un producto falló
 * (borrado, red), se muestra igual como enlace de solo texto en vez de
 * desaparecer la cita.
 */
export function SourcesList({ sources }: SourcesListProps) {
  return (
    <ul className="flex max-w-[85%] flex-col gap-2">
      {sources.map((source) =>
        source.source_type === "producto" && source.product ? (
          <li key={source.index}>
            <Link
              href={`/producto/${source.source_id}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/50"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                <ProductImage src={source.product.image_url} alt={source.product.title} />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-medium">
                  [{source.index}] {source.product.title}
                </span>
                <Price value={source.product.price} size="sm" />
              </div>
            </Link>
          </li>
        ) : (
          <li key={source.index}>
            <Link
              href="/soporte"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:border-primary/50"
            >
              [{source.index}] {source.title ?? "Artículo de soporte"}
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}
