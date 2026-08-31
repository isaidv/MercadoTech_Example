import { CatalogPage } from "@/app/(shop)/_components/CatalogPage";

/**
 * Server Component simple — sin `<Suspense>` (Fase 3.8, corrección: ver el
 * comentario en CatalogPage sobre el bug de streaming SSR de Turbopack que
 * ese `<Suspense>` disparaba). `CatalogPage` es "use client" y hace todo su
 * propio fetching/estado de carga.
 *
 * `force-dynamic`: sin esto, `next build` intenta prerenderizar esta
 * página como estática y falla duro ("useSearchParams() should be wrapped
 * in a suspense boundary" — CatalogPage lo llama para leer `?q=`/filtros),
 * ya que ese chequeo de Next solo aplica al camino de prerender estático.
 * No hay nada que perder marcándola dinámica: TODO su contenido depende de
 * datos live de Supabase, nunca podría servirse desde una build estática.
 */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return <CatalogPage title="Catálogo" />;
}
