# Debugging — MercadoTech

Runbook de la Fase 6.8 ([`MercadoTech_sesion6.md`](../MercadoTech_sesion6.md)).
Escrito para vos con un error en pantalla, no para leerlo de corrido antes de
que pase algo. Andá directo a la sección que necesitás:

1. [El flujo](#1-el-flujo-síntoma--test-verde)
2. [Dónde están los logs](#2-dónde-están-los-logs)
3. [Cómo pedirle debugging a Claude](#3-cómo-pedirle-debugging-a-claude)
4. [Tabla de errores típicos](#4-tabla-de-errores-típicos)

---

## 1. El flujo (síntoma → test verde)

```
síntoma → reproducir con un test → leer logs → UNA hipótesis → fix → test verde
```

**1. Síntoma.** Lo que viste (un mensaje de error, un comportamiento raro,
un job rojo en Actions). Copialo TAL CUAL — no lo resumas todavía.

**2. Reproducir con un test que falla.** La mejor reproducción no es "lo
volví a hacer a mano y sí, pasa" — es un test rojo que se puede correr una
y otra vez:

```bash
npm run test -- <archivo>.test.ts
```

Si el síntoma es de la UI o de un flujo completo (login, comprar, publicar,
mover el kanban), el equivalente es el E2E correspondiente:

```bash
npx playwright test <nombre-del-spec> --project=chromium
```

Si no existe un test que reproduzca el síntoma, ese es el primer trabajo:
escribirlo. Un fix sin test que lo cubra es un fix que se puede romper de
nuevo sin que nadie se entere.

**3. Leer logs.** Antes de teorizar — ver [sección 2](#2-dónde-están-los-logs).

**4. UNA hipótesis.** No "puede ser A, o B, o C" — la lectura de los logs
tiene que señalar una causa concreta. Si dudás entre dos, es que todavía no
leíste suficiente log.

**5. Fix.** El cambio mínimo que ataca la causa, no el síntoma.

**6. El test pasa.** El MISMO test del paso 2, no uno nuevo ni reescrito
para que le convenga al fix.

---

## 2. Dónde están los logs

| Fuente | Cómo verla | Qué buscar |
|---|---|---|
| Servidor Next (`npm run dev` / `npm run start`) | La terminal donde lo corriste — no se guarda en archivo | Un stack trace, un `console.error`, o el `console.warn` de `services/indexing-trigger.service.ts` cuando el reindexado falla en silencio |
| Endpoint de chat (`app/api/v1/chat/route.ts`) | Misma terminal del servidor — imprime UNA línea JSON por consulta | `{"endpoint":"chat","mode":...,"retrievedCount":...,"usedSourceCount":...,"hasRelevantContext":...,"model":...}` — `retrievedCount: 0` es la primera pista de que no es un bug de código sino de datos/threshold (ver [`docs/RAG.md`](RAG.md) sección 5) |
| Supabase local | `supabase logs` (todos los servicios) o `supabase logs -f` en vivo, con `supabase start` corriendo | Errores de Postgres/PostgREST — el mensaje trae `code` (SQLSTATE) y `message`, ver la [tabla de abajo](#4-tabla-de-errores-típicos) |
| CI (GitHub Actions) | Pestaña **Actions** del repo → la corrida → el job rojo | Ver el procedimiento completo abajo |

### Cómo leer un fallo de CI

1. **Qué job falló.** `checks` (lint/type-check/tests unitarios) o `e2e`
   (Playwright) — el nombre del job ya te dice en qué mitad del pipeline
   mirar (`.github/workflows/ci.yml`).
2. **Abrí el job** en la pestaña Actions y bajá hasta el primer paso en
   rojo — ahí está el error completo, igual que en tu terminal.
3. **Descargá el artefacto** si el job es `e2e` y falló: al final de la
   página del job hay una sección **Artifacts** con `playwright-report`
   (solo existe si el job falló — se sube con `if: failure()`, ver el
   comentario en `ci.yml`). Si fue `checks`, el artefacto es `coverage`
   (ese SIEMPRE se sube, con `if: always()`).
4. **Abrí el reporte de Playwright descargado** (es un `.zip`):
   ```bash
   unzip playwright-report.zip -d playwright-report
   npx playwright show-report playwright-report
   ```
   Se abre igual que el reporte que ya conocés de correr `npm run test:e2e`
   en local — mismos pasos, mismo screenshot del paso que falló.
5. **Comparar contra local.** Si el mismo test pasa en tu máquina y falla
   SOLO en Actions, no es (todavía) un bug de la app — puede ser
   diferencia dev vs build de producción (correr local
   `npm run build && npm run start` y la suite contra eso, no
   `npm run dev`) o datos sucios (¿corriste `supabase db reset` antes?).

---

## 3. Cómo pedirle debugging a Claude

Cuatro cosas, en este orden, o Claude va a perder tiempo (el tuyo) pidiendo
lo que falta:

1. **El síntoma exacto.** No "no funciona el carrito" — "al hacer clic en
   'Agregar al carrito' en `/producto/[id]`, el contador del navbar sigue
   en 0".
2. **Los pasos para reproducirlo**, en orden, incluyendo con qué usuario
   (¿buyer1? ¿un vendedor?) y sobre qué dato (¿qué producto, qué pedido).
3. **El log LITERAL**, completo, sin resumir ni parafrasear — pegado tal
   cual salió de la terminal, del navegador (consola/Network) o del
   reporte de Playwright. Un error resumido de memoria casi siempre omite
   el dato que importa.
4. **Qué ya descartaste.** Si ya confirmaste que la sesión existe, que
   `supabase status` está verde, que no es un problema de RLS — decilo.
   Ahorra la mitad del diagnóstico.

Un pedido con las 4 cosas se resuelve en un mensaje. Un pedido sin ellas
se resuelve en cinco mensajes de ida y vuelta pidiéndolas.

---

## 4. Tabla de errores típicos

Mensaje literal como vos lo verías, causa real de este repo, primer
comando a correr.

### RLS deniega (0 filas o 401, según la ruta)

```
# Consulta que debería traer datos, trae 0 filas — sin error
[]
```

**Causa:** la policy de RLS de esa tabla no cubre este caso (rol
equivocado, columna de "dueño" mal comparada, o falta la condición para
este escenario). Row Level Security no lanza un error al SELECT que no
matchea nada — simplemente no devuelve esas filas. Ver las policies reales
en `supabase/migrations/20260821110000_create_rls_policies.sql`.

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select * from pg_policies where tablename = '<tabla>';"
```

Si la ruta es un Route Handler que sí valida sesión antes de tocar la
tabla, el síntoma en cambio es un `401` explícito — mirá qué chequeo lo
tira (`lib/supabase/server.ts` o el propio handler).

### GRANT faltante

```
{"code":"42501","details":null,"hint":null,"message":"permission denied for table <tabla>"}
```

**Causa:** distinta de RLS, aunque el código `42501` es el mismo. RLS
controla QUÉ FILAS ve un rol que YA puede tocar la tabla; el `GRANT`
controla si el rol puede tocar la tabla EN ABSOLUTO. Una tabla nueva no
hereda los `GRANT` de las demás — cada migración que agrega una tabla
necesita su propio `grant select/insert/... on public.<tabla> to
authenticated;` (ejemplo real: `knowledge_embeddings` tiene el suyo en
`supabase/migrations/20260826140300_knowledge_embeddings_rls.sql`, aparte
del bloque grande en `20260821110000_create_rls_policies.sql`).

```bash
grep -n "grant.*<tabla>" supabase/migrations/*.sql
```
Si no aparece nada, falta agregarlo en una migración nueva.

### Modelo de IA sin proveedor configurado

```
Error: 401 {"type":"authentication_error","message":"invalid x-api-key"}
```

**Causa:** `ANTHROPIC_API_KEY` o `VOYAGE_API_KEY` ausente, mal copiada o
revocada en `.env.local` — son DOS proveedores independientes, que falle
uno solo es normal. **Esta tabla ya está completa en
[`docs/RAG.md`](RAG.md) sección 5** (incluye 401/400/429 de cada
proveedor, `input_type` mal usado, threshold) — no se repite acá para no
tener dos copias desactualizándose por separado.

> Nota histórica: una versión anterior de esta guía (heredada de ReadHub,
> el proyecto previo del curso) hablaba de "modelo HF sin proveedor"
> — MercadoTech usa Claude + Voyage desde la Sesión 4
> (`MercadoTech_sesion4.md`, "Registro de cambios... sale Hugging Face,
> entran Claude + Voyage AI"); Hugging Face no existe en este código.

```bash
grep -c "ANTHROPIC_API_KEY\|VOYAGE_API_KEY" .env.local
```

### Dimensión del vector errada

```
{"code":"22000","details":null,"hint":null,"message":"expected 1024 dimensions, not <N>"}
```

**Causa:** la columna `knowledge_embeddings.embedding` es `vector(1024)`
a propósito (`supabase/migrations/20260826140100_create_knowledge_embeddings.sql`)
porque `voyage-4-lite` devuelve 1024 números. Si `VOYAGE_EMBEDDING_MODEL`
se cambió a un modelo con OTRA dimensión, cada insert falla con este
error — cambiar la variable de entorno no alcanza, hace falta migrar la
columna (`alter column embedding type vector(N)` + recrear el índice
HNSW y `match_knowledge`).

```bash
grep -n "vector(" supabase/migrations/20260826140100_create_knowledge_embeddings.sql
```

### `Missing: <paquete> from lock file` en CI

```
npm error code EUSAGE
npm error npm ci can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
npm error Missing: <paquete>@<versión> from lock file
```

**Causa:** el lockfile de este repo lo generó `npm@11.6.2` en Windows —
otra versión de npm en el runner (Linux) resuelve las dependencias
OPCIONALES distinto y `npm ci` rechaza la discrepancia. `package.json`
fija `"packageManager": "npm@11.6.2"` y `.github/workflows/ci.yml` la
pinnea explícitamente ANTES de `npm ci` en los dos jobs — si este error
aparece, algo se desalineó entre esos dos lugares.

```bash
grep -n "packageManager" package.json && grep -n "npm install -g npm@" .github/workflows/ci.yml
```
Las dos versiones tienen que coincidir EXACTO.

### stdout corrupto en el servidor MCP

```
# El Inspector conecta y se cae al primer uso, sin mensaje claro
```

**Causa:** con transporte stdio, `stdout` transporta el protocolo
JSON-RPC — un solo `console.log` sin redirigir a `stderr` corrompe la
sesión completa. **Ya documentado con el detalle completo en
[`mcp/README.md`](../mcp/README.md)** (arquitectura de la redirección +
su propia tabla de síntomas) — no se repite acá.

```bash
grep -rn "console\.\(log\|info\|warn\)" mcp/src --include="*.ts"
```
Cualquier resultado ahí (fuera de `mcp/src/index.ts`, que es quien hace la
redirección) es sospechoso.

---

**Fuente de verdad:** ante cualquier discrepancia entre esta guía y el
código real, el código gana — esta guía documenta lo que YA se verificó
contra el repo, no lo que "debería" pasar.
