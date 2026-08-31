"use client";

import { use } from "react";
import { CatalogPage } from "@/app/(shop)/_components/CatalogPage";
import { useCategories } from "@/hooks/useCategories";

/**
 * Client Component a propósito (no Server Component `async`) — ver el
 * comentario en CatalogPage: un Server Component que hace `await` antes de
 * devolver este árbol cliente deja el render trabado para siempre en este
 * proyecto. `params` sigue siendo una Promise en Next 15 incluso para una
 * page "use client" — se desenvuelve con `use()` (soportado: el propio App
 * Router ya envuelve cada página en un límite Suspense implícito). Sin
 * `<Suspense>` explícito propio (Fase 3.8, corrección — ver CatalogPage):
 * ese boundary adicional disparaba el mismo bug de streaming SSR de
 * Turbopack que en "/" y "/buscar", solo que de forma intermitente acá. El
 * nombre de la categoría se resuelve con `useCategories()` (mismo cache en
 * memoria que ya usa el Navbar) en vez de una consulta server-side.
 */
export default function CategoriaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { categories } = useCategories();
  const category = categories.find((c) => c.slug === slug);

  return <CatalogPage title={category?.name ?? "Categoría"} categorySlug={slug} />;
}
