# Checklist Fase 3.8 — QA responsive, accesibilidad y estados

Recorrido de las 14 rutas del mapa (`MercadoTech_sesion3.md`, sección
"Mapa de rutas") en 375px / 768px / 1280px, claro y oscuro. Criterios:

- **Responsive**: sin scroll horizontal en ninguno de los 3 anchos (una
  tabla ancha puede scrollear DENTRO de su propio contenedor).
- **Carga**: `LoadingState`/skeleton a medida, nunca un spinner genérico.
- **Vacío**: `EmptyState` con acción sugerida (no solo texto).
- **Error**: `ErrorState` con `onRetry` funcional (reintenta el fetch real).
- **Teclado**: formularios navegables por Tab; ambos drag & drop
  (galería de imágenes, kanban de pedidos) operables con teclado
  (`KeyboardSensor` + anuncios aria).
- **Imágenes**: toda imagen de producto vía `ProductImage`, con `alt` significativo.
- **Tema**: claro/oscuro sin contraste roto.

Nota importante sobre el estado real del repo al empezar esta fase: el
prompt de la Fase 3.8 afirma "Las Fases 3.1–3.7 están implementadas y
commiteadas" — `git log --oneline` muestra que el repo **no tiene ningún
commit** (rama `master` sin historia). Todo el trabajo de las Fases 3.1–3.7
existe en el working tree pero nunca se commiteó. No se hizo ningún commit
durante esta fase tampoco (se deja el mensaje propuesto al final, sin
ejecutar), siguiendo la práctica ya establecida en toda la sesión.

## Resultado por pantalla

| # | Ruta | Responsive | Carga | Vacío | Error | Teclado | Imágenes | Tema |
|---|---|---|---|---|---|---|---|---|
| 1 | `/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | `/buscar?q=` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | `/categoria/[slug]` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | `/producto/[id]` | ✅ | ✅ | N/A¹ | ✅ | ✅ | ✅ | ✅ |
| 5 | `/favoritos` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6 | `/carrito` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7 | `/pedidos` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 8 | `/pedidos/[id]` | ✅ | ✅ | N/A¹ | ✅ | ✅ | N/A² | ✅ |
| 9 | `/vendedor/productos` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 10 | `/vendedor/publicar` | ✅ | N/A³ | N/A³ | N/A³ | ✅ | ✅ | ✅ |
| 11 | `/vendedor/productos/[id]/editar` | ✅ | ✅ | N/A¹ | ✅ | ✅ | ✅ | ✅ |
| 12 | `/vendedor/pedidos` | ✅ | ✅ | ✅ | ✅ | ✅ | N/A² | ✅ |
| 13 | `/login` | ✅ | N/A³ | N/A³ | N/A³ | ✅ | N/A² | ✅ |
| 14 | `/register` | ✅ | N/A³ | N/A³ | N/A³ | ✅ | N/A² | ✅ |

¹ Una ficha/detalle individual no tiene "lista vacía" propia — sí tiene su
`ErrorState` si el `id` no existe o no es tuyo.
² Pantalla sin imágenes de producto en su contenido propio (tabla de
ítems del pedido, kanban, formularios de auth).
³ Formulario de una sola acción — no hay estado de carga inicial de datos
ni lista que pueda estar vacía; si el submit falla, el error se muestra
inline en el propio formulario (`role="alert"`), no vía `ErrorState`.

## Correcciones aplicadas

1. **[app/(shop)/page.tsx](../app/(shop)/page.tsx), [app/(shop)/buscar/page.tsx](../app/(shop)/buscar/page.tsx), [app/(shop)/categoria/[slug]/page.tsx](<../app/(shop)/categoria/[slug]/page.tsx>), [app/(shop)/_components/CatalogPage.tsx](<../app/(shop)/_components/CatalogPage.tsx>)** — bug de "Carga" crítico encontrado en vivo: las 3 pantallas de catálogo envolvían `CatalogPage` en un `<Suspense fallback={<ProductGrid loading />}>`. Ese `<Suspense>` disparaba un bug real de streaming SSR de Turbopack (`next dev` **y** `next build`/`next start`): en una carga dura (pestaña nueva, reload), el contenido real llegaba en el HTML pero quedaba oculto (`<template>`/`hidden` + script `$RC(...)`) y el script de revelado nunca se aplicaba — la pantalla se quedaba en el skeleton para siempre, de forma intermitente (reproducido consistentemente en `/` y `/buscar`; intermitente en `/categoria/[slug]`). Diagnosticado confirmando con un `console.log` que el componente ni siquiera se ejecutaba del lado del cliente. Corrección: se quitó el `<Suspense>` (nunca hizo falta — `CatalogPage` ya maneja su propio estado de carga vía `ProductGrid`); esto a su vez requirió marcar `/` y `/buscar` como `export const dynamic = "force-dynamic"` porque sin `<Suspense>`, `next build` falla duro con "useSearchParams() should be wrapped in a suspense boundary" al intentar prerenderizar la página como estática — con `force-dynamic` ese chequeo (que solo aplica al camino de prerender estático) no se dispara, y de todos modos la página nunca podría ser estática (todo su contenido depende de datos live de Supabase). Verificado con múltiples cargas duras y pestañas nuevas en `next dev` **y** en el build de producción (`next start`).
2. **[hooks/useAuth.ts](../hooks/useAuth.ts), [services/auth.service.ts](../services/auth.service.ts)** — violación de capas: el hook importaba `@/lib/supabase/client` directamente para mantener una única instancia del cliente y suscribirse a `onAuthStateChange`. Se movió esa suscripción a una función nueva `subscribeToAuthChange` en `services/auth.service.ts` (mismo patrón de inyección de cliente que el resto del archivo); `useAuth` ahora solo llama a funciones de `services/`, nunca a `@/lib/supabase/*`. Contrato público de `useAuth()` sin cambios.
3. **[app/(shop)/_components/CatalogPage.tsx](<../app/(shop)/_components/CatalogPage.tsx>)** — "Vacío" incompleto: el `EmptyState` de "sin resultados" no ofrecía ninguna acción pese a que `ProductGrid` ya soporta `emptyAction`. Se agregó: "Quitar filtros" (compone el `setFilter` que el hook ya expone, sin agregarle ninguna función nueva) cuando hay filtros activos, o "Ver catálogo completo" (link a `/`) cuando la búsqueda no tiene filtros pero sí `?q=`.
4. **[app/(seller)/vendedor/pedidos/page.tsx](<../app/(seller)/vendedor/pedidos/page.tsx>)** — "Vacío" incompleto: el `EmptyState` de "todavía no tienes pedidos" no tenía `action`. Se agregó un botón "Ver mis productos" (link a `/vendedor/productos`).
5. **`app/dev/ui/page.tsx`** — eliminado por completo (scaffold de QA de fases anteriores, ya no correspondía en el árbol de rutas).
6. **[components/theme-provider.tsx](../components/theme-provider.tsx) (nuevo), [app/layout.tsx](../app/layout.tsx)** — "Tema" roto en las 14 rutas: `next-themes` ya estaba instalado y `components/ui/sonner.tsx` ya llamaba a `useTheme()` esperando un provider, y `globals.css` ya traía la paleta oscura completa (`.dark`, tomada de `docs/design-reference/MercadoTech.dc.html`) — pero nadie montaba `<ThemeProvider>`, así que la app quedaba fija en claro sin importar el tema del sistema operativo. Se creó `components/theme-provider.tsx` (wrapper fino de `next-themes`) y se montó en `app/layout.tsx` con `attribute="class" defaultTheme="system" enableSystem`. Verificado en vivo (`prefers-color-scheme: dark`) en `next dev` y en el build de producción: `.dark` se aplica a `<html>`, fondo/texto cambian a los tokens oscuros correctos.
7. **[components/product/ReviewsSection.tsx](../components/product/ReviewsSection.tsx), [components/product/QuestionsSection.tsx](../components/product/QuestionsSection.tsx)** — accesibilidad (WCAG AA, 4.1.2 Name Role Value): 3 `<Textarea>` dependían solo del `placeholder` para su nombre accesible (el comentario de reseña, la pregunta y la respuesta de un producto) — el placeholder desaparece al escribir y es menos robusto para lectores de pantalla que un nombre accesible explícito. Se agregó `aria-label` a los tres, sin tocar el `placeholder` visible.

## Verificación de capas (obligatoria)

```
$ grep -rl "@/lib/supabase" components hooks
(sin resultados)

$ grep -rl "from \"@/services" components
(sin resultados)
```

Ambos comandos devuelven vacío — confirmado el fix del punto 2 de arriba
(antes de la corrección, el primero devolvía `hooks/useAuth.ts`).

## Evidencia de lint / type-check / build

```
$ npm run lint
> mercadotech-example@0.1.0 lint
> eslint
(sin errores ni warnings)

$ npx tsc --noEmit
(sin salida — sin errores de tipos)

$ npm run build
   ▲ Next.js 15.5.23 (Turbopack)
 ✓ Compiled successfully in 36.8s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (12/12)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                             Size  First Load JS
┌ ƒ /                                    0 B         311 kB
├ ○ /_not-found                          0 B         127 kB
├ ƒ /buscar                              0 B         311 kB
├ ○ /carrito                         7.84 kB         295 kB
├ ƒ /categoria/[slug]                  599 B         312 kB
├ ○ /favoritos                       9.98 kB         297 kB
├ ○ /login                           2.19 kB         223 kB
├ ○ /pedidos                         2.77 kB         290 kB
├ ƒ /pedidos/[id]                    3.61 kB         291 kB
├ ƒ /producto/[id]                   12.8 kB         300 kB
├ ○ /register                        3.08 kB         224 kB
├ ○ /vendedor/pedidos                4.97 kB         262 kB
├ ○ /vendedor/productos              11.5 kB         253 kB
├ ƒ /vendedor/productos/[id]/editar  12.7 kB         306 kB
└ ○ /vendedor/publicar               12.2 kB         305 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

exit code 0
```

También verificado con `next start` (build de producción real, no solo
`next dev`): las 3 rutas de catálogo, el tema oscuro y el flujo de
búsqueda sin resultados funcionan igual que en desarrollo.

## Criterios de aceptación de la sesión

- **Flujo comprador completo** (registro → explorar → filtrar → detalle →
  preguntar → carrito → checkout → ver pedido → cancelar si pendiente):
  verificado — cada tramo usa su propio hook/service ya probado en fases
  anteriores; esta fase no tocó contratos, solo estados/responsive/a11y.
  Recorrido en vivo en esta fase: catálogo → detalle → agregar al carrito →
  `/carrito` (mobile y desktop) → login/logout.
- **Flujo vendedor completo** (registro como vendedor → publicar con
  imágenes reordenadas → producto visible en catálogo → recibir pedido →
  moverlo por el kanban → comprador ve el nuevo estado al recargar):
  verificado — `/vendedor/publicar` y `/vendedor/pedidos` recorridos en
  vivo en esta fase (mobile y desktop); el drag & drop de imágenes y el
  kanban no se tocaron (código idéntico a la Fase 3.7, ya verificado ahí
  con simulación real de teclado).
- **Reseña solo posible tras pedido `entregado`**: sin cambios — la UI
  (`canReview.allowed`) y la RLS (`reviews_insert_verified_purchase`)
  siguen intactas.
- **Transiciones inválidas del kanban rechazadas en el hook**: sin
  cambios — `useSellerOrders.move` sigue validando antes de llamar al
  service; el componente de esta fase (`OrdersKanban`/`OrderKanbanCard`)
  no se modificó.
- **`npm run lint`, `npm run type-check` y `npm run build` pasan**: ✅
  (evidencia arriba).
- **`grep -rl "@/lib/supabase" components hooks` devuelve vacío**: ✅
  (evidencia arriba — corregido en esta fase).

## Commit propuesto (no ejecutado)

Como en el resto de la sesión, no se ejecutó ningún commit — el repo sigue
sin historia (`git log --oneline` vacío). Mensaje propuesto si se decide
commitear todo el trabajo de golpe:

```
chore: responsive, a11y and state pass with checklist for Fase 3.8
```
