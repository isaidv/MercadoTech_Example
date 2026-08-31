# Referencia de diseño — Sesión 3

**Estado: solo referencia. Nada de esto se ha implementado todavía.**

Estos 3 archivos son una copia local del canvas de diseño de Claude Design:
<https://claude.ai/design/p/93756d6b-78a3-47e3-b007-3e86486ca3a9?file=MercadoTech.dc.html>

(el proyecto en claude.ai quedó con su nombre de creación por defecto,
"Formulario de alcance del proyecto" — no lo renombraron, pero los archivos
son los correctos).

| Archivo | Qué es |
|---|---|
| `MercadoTech.dc.html` | El canvas de diseño en sí: 17 pantallas en formato de plantilla `<sc-if>`/`<sc-for>`/`{{ }}` de Claude Design (no es HTML estático para copiar literal — hay que interpretar cada pantalla). |
| `industry.css` | El sistema de tokens real (colores, tipografía, espaciado, radios, sombras) — ver detalle abajo. |
| `support.js` | Motor de renderizado genérico del canvas (`dc-runtime`). No es específico de MercadoTech; solo hace falta para que el `.dc.html` se siga viendo interactivo si se abre localmente. Sin relevancia para el código de la app. |

## Pantallas cubiertas (17)

Sistema (4): Tokens · Componentes base · Componentes de dominio · Layouts.

Rutas (13, cubren las 14 del mapa de `MercadoTech_sesion3.md` — falta solo
"editar producto", que la propia spec dice que reutiliza el formulario de
"Publicar"): Home · Categoría · Búsqueda · Favoritos · Detalle de producto ·
Carrito · Mis pedidos · Detalle de pedido · Login · Registro · Mis productos ·
Publicar producto · Pedidos vendedor.

## Tokens ya extraídos de `industry.css` (resumen)

- **Color primario:** `--color-accent: #5980a6` (azul eléctrico atemperado a
  acero), con rampa 100–900 (`#eef6ff` → `#1d2d3d`) generada en OKLCH.
- **Tipografía:** `--font-heading: "Barlow Condensed"` (títulos, precios,
  cifras) · `--font-body: "Barlow"` (cuerpo, formularios, descripciones).
- **Espaciado:** escala `--space-1` a `--space-8` (3.4px → 27.2px).
- **Radios:** `--radius-sm: 2px` · `--radius-md: 4px` · `--radius-lg: 7px`.
- **Sombras:** `--shadow-sm/md/lg`, tintadas de tinta (`#2b2b2d`), no negro puro.
- **Tema oscuro:** definido inline en `MercadoTech.dc.html` vía
  `[data-theme="dark"]` (no en `industry.css`), con su propia rampa de acento
  y neutros.

## Cómo se usa cuando llegue el momento

Según la "Metodología Vision" de `MercadoTech_sesion3.md`: se adjunta **una
pantalla a la vez** en el prompt de la fase que la construye, no el diseño
completo de una sola vez. Mapeo pantalla → fase:

| Pantalla del canvas | Fase de `MercadoTech_sesion3.md` |
|---|---|
| Tokens, Componentes base, Componentes de dominio | 3.1 |
| Layouts | 3.2 |
| Login, Registro | 3.3 |
| Home, Categoría, Búsqueda | 3.4 |
| Detalle de producto, Favoritos | 3.5 |
| Carrito, Mis pedidos, Detalle de pedido | 3.6 |
| Mis productos, Publicar producto, Pedidos vendedor | 3.7 |

Ninguna fase se ejecutó todavía — esto queda guardado para cuando se pida
explícitamente.
