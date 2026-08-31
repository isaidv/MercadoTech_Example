---
name: spec-origin
description: Dado el nombre de una función/componente/hook/service o una ruta de archivo del repo, busca en MercadoTech_sesion2.md, MercadoTech_sesion3.md y MercadoTech_sesion4.md (y README.md si aplica) de qué Fase salió, citando la línea y el texto exacto. Usar cuando el usuario pregunta "¿de qué fase/spec salió X?", "¿dónde está especificado X?" o similar.
---

# spec-origin

Traza el origen en la especificación de un símbolo de código (función, componente,
hook, service) o de una ruta de archivo del proyecto MercadoTech.

Las specs de esta sesión de trabajo son `README.md` (plan completo) y
`MercadoTech_sesion2.md` / `_sesion3.md` / `_sesion4.md` (fase por fase). Todas
usan encabezados `## Fase X.Y — <título>` y muchas fases traen una tabla de
archivos con **rutas literales** (`app/...`, `components/...`, `hooks/...`,
`services/...`) — ese es el mejor punto de anclaje, mucho más confiable que
buscar el nombre del símbolo en prosa.

## Input

`$ARGUMENTS` es el símbolo o ruta a trazar (ej. `ProductoPage`,
`useProduct`, `product.service.ts`, `app/(shop)/producto/[id]/page.tsx`).
Si viene vacío, pedir al usuario qué símbolo/archivo quiere trazar.

## Procedimiento

1. **Resolver a archivo(s).**
   - Si `$ARGUMENTS` ya parece una ruta (contiene `/` o termina en `.ts`/`.tsx`),
     úsala directo.
   - Si es un nombre de símbolo (componente, hook, función, service), usa
     Grep para encontrar dónde se define (`export function X`, `export const X`,
     `export default function X`) dentro de `app/`, `components/`, `hooks/`,
     `services/`, `lib/`, `types/`. Puede haber más de una ruta relevante:
     el archivo que define el símbolo Y los archivos que lo consumen/conectan
     (ej. `BuyBox.onAddToCart` se define en 3.5 pero se conecta en 3.6 —
     ambas fases son parte de la respuesta).

2. **Buscar por ruta exacta (máxima confianza).**
   Grep la ruta resuelta (o su basename, ej. `page.tsx` con el segmento de
   carpeta padre para evitar falsos positivos) contra `MercadoTech_sesion2.md`,
   `MercadoTech_sesion3.md`, `MercadoTech_sesion4.md`. Las tablas de "rutas" y
   "archivos por fase" suelen tener la ruta completa entre backticks — un match
   ahí es prácticamente certeza.

3. **Si no hay match de ruta, buscar por nombre de símbolo (alta confianza).**
   Grep el nombre exacto del símbolo (`useProduct`, `product.service`, etc.)
   en las tres specs. Common en las tablas de "hooks/services por fase".

4. **Si tampoco hay match, inferencia semántica (confianza baja — decirlo).**
   Buscar por el dominio/concepto del archivo (ej. carpeta `producto/`,
   `carrito/`, `vendedor/`) y el nombre de la fase que trate ese dominio. Si
   ni así aparece (por ejemplo, código de infraestructura de la Fase 2.1 que
   no tiene tabla de archivos, o algo que el usuario escribió fuera de spec),
   decirlo explícitamente en vez de forzar un match — no inventar una fase.

5. **Reportar,** para cada archivo/símbolo resuelto:
   - Ruta del archivo.
   - Spec (`sesion2`/`sesion3`/`sesion4`) + `## Fase X.Y — título` + número
     de línea.
   - Cita textual corta (la fila de tabla o frase relevante) que sustenta el match.
   - Nivel de confianza: **ruta exacta** / **nombre exacto** / **inferido**.
   - Si el símbolo aparece en más de una fase (definido en una, conectado/usado
     en otra), listar todas en orden de fase, no solo la primera.

No hace falta leer las specs completas: usa Grep dirigido (rutas y nombres)
en vez de cargar los ~700+ líneas de cada archivo salvo que el grep no dé
señal y haga falta leer el contexto alrededor de un match parcial.
