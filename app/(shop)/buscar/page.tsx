import { SearchTabs } from "@/app/(shop)/_components/SearchTabs";

// Server Component simple, sin <Suspense> — ver el comentario en
// CatalogPage (Fase 3.8) sobre el bug de streaming SSR de Turbopack que
// ese <Suspense> disparaba. `force-dynamic` por el mismo motivo que
// entonces: sin esto, `next build` falla al intentar prerenderizar esta
// página como estática (SearchTabs/CatalogPage usan useSearchParams del
// lado del cliente).
export const dynamic = "force-dynamic";

export default function BuscarPage() {
  return <SearchTabs />;
}
