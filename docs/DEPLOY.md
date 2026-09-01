# Deploy — MercadoTech

## 1. Variables y secretos

Evidencia de la Fase 7.3 ([`MercadoTech_sesion7.md`](../MercadoTech_sesion7.md)).
Esta sección es el mapa de las llaves — quién tiene cuál, dónde vive, y la
prueba de que ninguna anda suelta. **No audita ni reescribe
[`.env.example`](../.env.example)** (ya está completo desde la sesión 4,
decisión 5 de esta fase) — solo confirma que coincide con lo que el código
realmente lee y arma la tabla de gobernanza para producción.

### Corrección sobre la spec, antes de la tabla

La tabla de gobernanza de `MercadoTech_sesion7.md` (Fase 7.3) nombra
`HUGGINGFACEHUB_API_TOKEN` y `HUGGINGFACE_*_MODEL` como los secretos de
IA. Es el mismo resabio de ReadHub (el proyecto anterior del curso, que sí
usaba Hugging Face) ya corregido dos veces antes en este repo — Fase 5.1
(`.claude/skills/mercadotech-architecture-enforcer`) y Fase 6.8
(`docs/DEBUGGING.md`). MercadoTech usa **Claude + Voyage AI** desde la
sesión 4 (`MercadoTech_sesion4.md`: "sale Hugging Face, entran Claude +
Voyage AI"); `.env.example` nunca tuvo una variable de Hugging Face. La
tabla de abajo usa los nombres reales, verificados en el código (`grep -n
"process.env.ANTHROPIC_API_KEY\|process.env.VOYAGE_API_KEY"
lib/ai/*.ts`), no los de la spec.

### Tabla de gobernanza

| Variable | Dónde vive | Quién la lee | Pública/Secreta |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (Production + Preview), a mano | navegador y servidor | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel (ambos entornos), a mano | navegador y servidor (RLS gobierna) | pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (ambos), a mano — solo runtime de servidor | `lib/supabase/admin.ts` en Route Handlers (`app/api/v1/reindex`) | **SECRETA** |
| `ANTHROPIC_API_KEY` | Vercel (ambos), a mano | `lib/ai/completion.ts`, vía `app/api/v1/chat` | **SECRETA** |
| `VOYAGE_API_KEY` | Vercel (ambos), a mano | `lib/ai/embeddings.ts`, vía `app/api/v1/{chat,search/semantic,reindex}` | **SECRETA** |
| `NEXT_PUBLIC_SITE_URL` | Vercel, por entorno (prod = URL real; preview = auto) | redirects de auth | pública |
| `ANTHROPIC_CHAT_MODEL` / `VOYAGE_EMBEDDING_MODEL` (opcionales) | Vercel, solo si hace falta rotar de modelo | `lib/ai/completion.ts` / `lib/ai/embeddings.ts` | pública (son solo el ID de un modelo, no una credencial) |

Y la fila que NO existe a propósito:

| Variable | Dónde vive | Quién la lee | Pública/Secreta |
|---|---|---|---|
| — | **GitHub Actions: ninguna** | — | — |

El CI (`.github/workflows/ci.yml`, sesión 6) corre `checks` y `e2e`
contra un Supabase **local efímero** levantado por el propio job
(`supabase start` + `supabase db reset`), con credenciales leídas
dinámicamente vía `supabase status -o json` — nunca contra producción, y
sin un solo secreto cargado. Confirmado leyendo el archivo completo, no
solo buscando la palabra: `grep -n "secrets\."
.github/workflows/ci.yml` → vacío (pegado en la sección 3, abajo).

Nota aparte de la tabla, no una fila de Vercel: `mcp/` (servidor MCP,
sesión 5) también lee `SUPABASE_SERVICE_ROLE_KEY` en su propio
`mcp/src/context.ts` — pero es un proceso Node aparte que no se despliega
a Vercel (corre local, por stdio); no cambia esta tabla.

### Reglas escritas

1. **Nunca commitear `.env*.local`.** `.gitignore` ya lo cubre:
   ```
   .env*
   !.env.example
   ```
   (línea 38-39) — el `!` excluye solo `.env.example` del ignore general,
   así que `.env.local`, `.env.production.local`, etc. quedan siempre
   afuera del repo.
2. **Rotación inmediata si una clave se expone.** Si cualquier valor de
   la tabla de arriba aparece commiteado, en un log de CI, en el chat o
   en un mensaje de error: regenerarlo YA desde el dashboard del
   proveedor (Supabase: Project Settings → API; Anthropic:
   console.anthropic.com; Voyage: dashboard.voyageai.com) y volver a
   cargar el valor nuevo en Vercel + redeploy (regla 4).
3. **Los previews de Vercel comparten la base de datos de PRODUCCIÓN**
   (decisión 9, Fase 7.4) — un solo proyecto Supabase por alumno, plan
   free. Riesgo real y documentado, no ocultado: un preview de un PR
   puede escribir sobre datos reales. Aceptable en este laboratorio; en
   un producto real sería un proyecto Supabase de staging aparte.
4. **Cambiar una variable en Vercel no afecta deploys ya hechos**
   (decisión 10, Fase 7.4). Un valor nuevo solo aplica al PRÓXIMO
   deploy — tras editar cualquier variable en Project Settings →
   Environment Variables, hace falta un redeploy explícito (Deployments
   → ⋯ → Redeploy) para que tome efecto.

### Greps anti-fuga

Cuatro patrones sobre el código (`.ts`/`.tsx`/`.mjs`/`.sql`/`.yml`,
excluyendo `node_modules`, `.next`, `dist` y lockfiles) más el historial
completo de `.env.local`:

```bash
grep -rn "hf_" --include="*.ts" --include="*.tsx" --include="*.mjs" \
  --include="*.sql" --include="*.yml" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist .
```
```
(vacío)
```

```bash
grep -rn "sb_secret" --include="*.ts" --include="*.tsx" --include="*.mjs" \
  --include="*.sql" --include="*.yml" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist .
```
```
(vacío)
```

```bash
grep -rn "eyJ" --include="*.ts" --include="*.tsx" --include="*.mjs" \
  --include="*.sql" --include="*.yml" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist .
```
```
(vacío)
```

```bash
# El ref del proyecto Supabase hosted (Fase 7.4) — buscado sobre TODO el
# repo, no solo código, porque un ref suelto en cualquier archivo cuenta.
grep -rn "fjeobthnepirhxjyimjl" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist .
```
```
./.env.local:32:# Contraseña de Postgres del proyecto cloud fjeobthnepirhxjyimjl
```

**Este último SÍ dio un resultado — evaluado antes de seguir, como pide
la fase.** No es una fuga real: `.env.local` no está trackeado por git
(`git ls-files | grep "^\.env"` solo lista `.env.example`) y está
activamente ignorado (`git check-ignore -v .env.local` → `.gitignore:38`).
Además, un "project ref" de Supabase no es una credencial — es un
identificador público (aparece en la URL del dashboard, en `https://
<ref>.supabase.co`), no algo que otorgue acceso por sí solo. Es el
comportamiento CORRECTO del sistema: el archivo donde SÍ debe vivir ese
dato es exactamente donde vive, y nunca llega al repo.

```bash
git log --all -p -- .env.local
```
```
(sin salida — .env.local nunca se commiteó, en ningún branch, en ningún momento del historial)
```

