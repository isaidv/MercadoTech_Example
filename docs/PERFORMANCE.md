# Performance — MercadoTech

Evidencia de la Fase 7.2 ([`MercadoTech_sesion7.md`](../MercadoTech_sesion7.md)).
Regla de la fase, sin excepción: **ningún cambio entra sin su número de
antes y de después** — el que no mueva la aguja se revierte y queda
anotado como "intentada, sin efecto" (también es un dato).

---

## 1. Metodología

- **Siempre contra build de producción** (decisión 12): `npm run build`
  (Turbopack) para el tamaño por ruta, `npm run start` + Lighthouse móvil
  para las métricas de carga real. Ningún número de `npm run dev` cuenta —
  Turbopack en modo dev no minifica ni tree-shakea igual, y HMR infla el
  bundle servido.
- **Sin `@next/bundle-analyzer`** (decisión 3): es un plugin de webpack y
  este proyecto compila con Turbopack (`next build --turbopack`, ya así
  desde la sesión 2). La dieta del bundle se decide con la tabla "First
  Load JS" que el propio `next build` imprime por ruta — es Turbopack
  reportando su propio árbol de módulos, no una estimación. Que
  `lib/ai/*` (con las claves de Anthropic/Voyage) nunca llegue al cliente
  ya lo garantizan `server-only` en esos archivos + los 5 greps de
  verificación de capas de `CLAUDE.md` (corridos al cierre de esta fase).
- **Lighthouse:** DevTools de Chrome, pestaña "Lighthouse", modo
  **Mobile**, categoría Performance únicamente, contra `npm run start`
  (nunca contra `next dev`). Alternativa equivalente: pagespeed.web.dev
  apuntando a la misma URL si el entorno lo permite.
- **Entorno de esta medición:** Node v22.20.0, Next.js 15.5.23,
  Windows 11, build local (no CI) — mismo entorno para el ANTES y el
  DESPUÉS, para que la comparación sea válida.
- **Candidatos, ya identificados por la spec (decisión 4) antes de medir
  nada:** `ChatWindow` (`/asistente`, `/soporte`), `OrdersKanban`
  (`/vendedor/pedidos`), `SortableImageGallery` (vía `ProductForm`, en
  `/vendedor/publicar` y `/vendedor/productos/[id]/editar`) — los tres
  como `dynamic import`; y `sizes`/`priority` en las imágenes del grid de
  catálogo (`ProductCard` → `ProductImage`). Hoy, **cero** `dynamic
  import` en el repo (verificado: `grep -rn "next/dynamic" app components
  hooks` → vacío).

---

## 2. ANTES

### 2.1 First Load JS por ruta (`npm run build`, real, sin editar)

Chunk compartido por TODAS las rutas: **141 kB**. Las filas de abajo son
el total ya incluyendo ese compartido.

| Ruta | Tamaño propio | First Load JS | Candidato de esta fase |
|---|---|---|---|
| `/` (home) | 435 B | **314 kB** | `priority`/`sizes` en `ProductImage` |
| `/categoria/[slug]` | 599 B | 314 kB | mismo `CatalogPage`, sin cambio propio |
| `/buscar` | 20.2 kB | 321 kB | mismo `CatalogPage` + panel semántico |
| `/producto/[id]` | 12.9 kB | **302 kB** | — (página de referencia para Lighthouse) |
| `/asistente` | 9.47 kB | **298 kB** | `dynamic import` de `ChatWindow` |
| `/soporte` | 10.8 kB | 300 kB | `dynamic import` de `ChatWindow` (mismo componente) |
| `/vendedor/pedidos` | 4.99 kB | **263 kB** | `dynamic import` de `OrdersKanban` |
| `/vendedor/publicar` | 12.6 kB | **307 kB** | `dynamic import` de `SortableImageGallery` (vía `ProductForm`) |
| `/vendedor/productos/[id]/editar` | 13.2 kB | **308 kB** | `dynamic import` de `SortableImageGallery` (mismo `ProductForm`) |
| `/vendedor/productos` | 11.8 kB | 254 kB | sin cambio |
| `/carrito` | 7.87 kB | 297 kB | sin cambio |
| `/favoritos` | 10.1 kB | 299 kB | sin cambio |
| `/pedidos` | 2.78 kB | 292 kB | sin cambio |
| `/pedidos/[id]` | 3.64 kB | 293 kB | sin cambio |
| `/login` | 4.8 kB | 223 kB | sin cambio |
| `/register` | 5.68 kB | 224 kB | sin cambio |

(Tabla completa de las 20 rutas; resaltadas en **negrita** las 3 páginas
donde se corre Lighthouse y las que reciben un `dynamic import`.)

### 2.2 Lighthouse móvil (`npm run start`, DevTools)

**Metodología real, con su propio hallazgo:** el primer Lighthouse
corrido sobre `/` dio **Performance 44, LCP 6.7 s, CLS 0, TBT 3990 ms** —
un número muy malo. Antes de creerlo, se reprodujo la misma carga por
fuera de Lighthouse (Chrome sin throttling, `performance.getEntriesByType`
vía DevTools): `loadEvent` ~427 ms, **0 long tasks**, red limpia (los
únicos `400` son las imágenes rotas de Storage, bug ya documentado en la
Fase 6.3/6.5, sin relación con esta fase). Un TBT de 4 segundos es
incompatible con eso — se pidió una segunda corrida de Lighthouse, sin
otros procesos pesados en paralelo, y dio **Performance 91, LCP 1.8 s,
CLS 0, TBT 120 ms** — coincide con la medición sin throttling. **El
primer número era ruido del entorno** (recurso compartido del sistema en
ese instante, no el código) — se descarta, y el ANTES real de `/` es el
segundo. Queda anotado porque es exactamente el tipo de espejismo que
esta fase pide no perseguir a ciegas (docs/DEBUGGING.md: reproducir antes
de diagnosticar).

**Alcance de la medición, decisión explícita del usuario:** tras
confirmar `/`, se decidió no correr Lighthouse en `/producto/[id]` ni
`/asistente` — "con esta medición es suficiente". El criterio de
aceptación real de la fase (`MercadoTech_sesion7.md`, "Cómo verificar")
pide Lighthouse ≥ 90 en **home y catálogo**, no en `/producto/[id]` ni
`/asistente` — y `/categoria/[slug]`/`/buscar` (el "catálogo") comparten
el MISMO `CatalogPage`/`ProductGrid` y prácticamente el mismo First Load
JS que home (314-321 kB, tabla de arriba), así que el 91 de home es
evidencia razonable también para esas rutas. Para `/producto/[id]` y
`/asistente`, el ANTES/DESPUÉS de esta fase se apoya en el First Load JS
del build (sección 2.1) — sin puntaje de Lighthouse propio, anotado así
a propósito, no ocultado.

| Página | Performance | LCP | CLS | TBT | Nota |
|---|---|---|---|---|---|
| `/` (1er intento) | 44 | 6.7 s | 0 | 3990 ms | descartado — ruido del entorno, ver arriba |
| `/` (2do intento, ANTES real) | **91** | **1.8 s** | **0** | **120 ms** | ya cumple el objetivo (≥90, LCP<2.5s) antes de optimizar |
| `/producto/[id]` | — | — | — | — | sin medir (decisión del usuario); First Load JS: 302 kB |
| `/asistente` | — | — | — | — | sin medir (decisión del usuario); First Load JS: 298 kB |

Objetivos de la fase: Performance ≥ 90 en home y catálogo; LCP < 2.5 s;
CLS < 0.1; INP < 200 ms.

---

## 3. Ranking de candidatos por impacto esperado (antes de tocar código)

Ordenado por el First Load JS de la ruta que cada uno afecta (única señal
disponible sin bundle-analyzer, per decisión 3):

1. **`SortableImageGallery` (vía `ProductForm`) — mayor impacto esperado.**
   Sus dos rutas son las MÁS pesadas de todo el catálogo de páginas
   medidas: 307-308 kB, ~45 kB por encima de `/vendedor/pedidos`. Se
   aplica primero.
2. **`ChatWindow` — impacto esperado medio-alto, y el ÚNICO de los tres
   validable con Lighthouse en esta fase** (`/asistente` es una de las 3
   páginas del ANTES/DESPUÉS; `/vendedor/pedidos` y `/vendedor/publicar`
   no lo son — la spec solo exige Lighthouse ≥90 en home y catálogo). Se
   aplica segundo, con evidencia doble (First Load JS + Lighthouse).
3. **`OrdersKanban` — impacto esperado más bajo, candidato más débil de
   los tres.** `/vendedor/pedidos` (263 kB) es HOY la ruta más liviana de
   toda la app fuera de `/login`/`/register` — ya está ~40-45 kB por
   debajo de los otros dos candidatos, así que hay menos margen de sobra
   para recortar. Se aplica igual (es de bajo riesgo y ya viene
   pre-aprobado por la spec), pero es el primer candidato a revertir si
   el DESPUÉS no muestra una caída real — regla de la fase, no un
   prejuicio.

**Lo que NO se toca, y por qué:** ningún componente fuera de esta lista
de 3 (`ChatWindow`, `OrdersKanban`, `SortableImageGallery`) recibe
`dynamic import` en esta fase, aunque hipotéticamente algo más también
pese — la spec (decisión 4) ya identificó estos tres como los únicos
candidatos reales tras revisar el repo; agregar uno nuevo "porque se ve
pesado" sería adivinar sin la misma evidencia. Tampoco se toca
`next.config.ts` (`remotePatterns` ya correcto, decisión 5) ni
`.env.example` — fuera de alcance de esta fase por restricción explícita.

---

## 4. DESPUÉS

Los 4 cambios, cada uno en su propio commit, con el número que lo
justifica en el momento en que se aplicó (regla de la fase: ninguno entró
sin medirse antes de commitear):

| Cambio | Commit | Ruta(s) | First Load JS ANTES | First Load JS DESPUÉS |
|---|---|---|---|---|
| `dynamic import` de `SortableImageGallery` | `ae21793` | `/vendedor/publicar` | 307 kB | **302 kB** |
| | | `/vendedor/productos/[id]/editar` | 308 kB | **302 kB** |
| `dynamic import` de `ChatWindow` | `ddfa351` | `/asistente` | 298 kB | **294 kB** |
| | | `/soporte` | 300 kB | **295 kB** |
| `dynamic import` de `OrdersKanban` | `cd40534` | `/vendedor/pedidos` | 263 kB | **248 kB** |
| `sizes` correcto + `priority` en home | `8c7847e` | `/` | 314 kB | 315 kB (+1 kB, esperado — plumbing de props, no es un cambio de JS) |

**Los tres `dynamic import` mostraron mejora real y se quedan** — nada se
revirtió en esta fase; los tres bajaron el First Load JS de su ruta, y
`OrdersKanban` (el candidato más débil del ranking, sección 3) terminó
con la mayor caída absoluta (15 kB) de los tres, más de lo que el ranking
inicial hacía pensar — la medición corrigió la intuición, que es
exactamente el punto de medir en vez de adivinar.

**El cambio de `sizes`/`priority` no se revierte pese a no tener una
caída de JS que mostrar** — no es un cambio de bundle, es una corrección
de un valor objetivamente mal calculado (`50vw` para una columna que en
1 columna es en realidad `100vw`) más `priority` en la única tarjeta
above-the-fold real. Verificado estructuralmente en el DOM (sección 4.1)
en vez de por bytes, porque las imágenes de producto de este entorno
están rotas por un bug de Storage ya documentado (Fase 6.3/6.5, ajeno a
esta fase) — el ahorro real en bytes de red se hará visible solo cuando
ese bug se resuelva, pero el error de cálculo en sí ya era real antes.

### 4.1 Verificación estructural de `sizes`/`priority` (DOM real)

Con `supabase db reset` (datos limpios del seed) y `npm run start`:

- `sizes` en las 20 tarjetas de la home: `"(min-width: 1280px) 229px,
  (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"` — el mismo
  valor calculado contra el grid real (`ProductGrid` + el sidebar de
  `CatalogPage` desde `lg:` + `Container` `max-w-7xl`).
- `document.querySelectorAll('link[as="image"]')` → **exactamente 1**
  resultado en toda la página — atado a la tarjeta `index === 0` de la
  home. Cero en `/buscar` y `/categoria/[slug]` (mismo `ProductGrid`,
  `priorityFirstImage` no se pasa ahí).
- Viewport móvil (375×812, DevTools): 1 columna, tarjeta a ancho
  completo — coincide con la rama `100vw` del `sizes` corregido.

### 4.2 Lighthouse móvil DESPUÉS

| Página | Performance ANTES | Performance DESPUÉS | LCP ANTES | LCP DESPUÉS |
|---|---|---|---|---|
| `/` | 91 | _sin capturar_ | 1.8 s | _sin capturar_ |

_No se llegó a pedir el Lighthouse DESPUÉS de home — la sesión avanzó a
la Fase 7.3 antes de recibirlo. Queda anotado como pendiente, no
inventado: el `dynamic import`/`sizes`/`priority` de esta fase no tocan
JS de la ruta `/` de forma significativa (314→315 kB, ver sección 4), así
que no hay motivo fuerte para esperar que el Performance de home cambie
respecto al ANTES (91) — pero es una expectativa, no una medición._

_(`/producto/[id]` y `/asistente` sin Lighthouse ANTES tampoco — mismo
alcance acotado que la sección 2.2, decisión del usuario.)_

### 4.3 Suites de la sesión 6 (red de la fase)

- `npm run test`: **194/194 verde** tras cada uno de los 4 cambios (no
  solo al final — la regla de la fase pide correrlo después de CADA
  cambio, y así se hizo).
- `npm run test:e2e -- --project=chromium`: **8/8 verde** (`buyer-flow`,
  `buyer-negative`×3, `home`, `seller-flow`, `seller-negative`×2) tras
  `supabase db reset`, contra el build final con los 4 cambios. Ningún
  `dynamic import` rompió hidratación: el kanban por teclado
  (`seller-flow.spec.ts`) y la galería de imágenes (dentro del mismo
  spec, paso de publicar) siguen funcionando exactamente igual con
  `OrdersKanban`/`SortableImageGallery` cargando bajo demanda.
