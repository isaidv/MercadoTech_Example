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
  // Fase 7.2 (docs/PERFORMANCE.md): SOLO la home marca su primera tarjeta
  // con `priority` — es la única ruta del catálogo donde "el primer
  // producto" es de forma consistente el LCP above-the-fold.
  return <CatalogPage title="Catálogo" priorityFirstImage />;
}
