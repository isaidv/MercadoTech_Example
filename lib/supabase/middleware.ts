import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_ROUTE_PREFIXES } from "@/lib/constants/routes";

/**
 * Refresco de sesión en el middleware (patrón oficial de `@supabase/ssr`).
 *
 * Se ejecuta en cada request que matchea el `config.matcher` del
 * `middleware.ts` raíz. Renueva el access token si expiró y sincroniza las
 * cookies de sesión entre el request y la response para que Server
 * Components y Route Handlers siempre vean una sesión vigente.
 *
 * Desde la Fase 3.3 también redirige a `/login?redirectTo=` cuando no hay
 * usuario y la ruta pedida está en `PROTECTED_ROUTE_PREFIXES` — es la única
 * autorización que hace este middleware (existencia de sesión, no rol); el
 * guard por ROL vive en `app/(seller)/layout.tsx` vía `useAuth`, y todo lo
 * demás queda a cargo de RLS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Sin proyecto de Supabase configurado (falta .env.local, ver
    // .env.example) no hay sesión que refrescar. En producción estas
    // variables siempre deben estar presentes.
    console.warn(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY no configuradas; se omite el refresco de sesión.",
    );
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no eliminar. `getUser()` revalida el token contra Supabase
  // Auth (a diferencia de `getSession()`, que solo lee la cookie local).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const requiresSession = PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (requiresSession && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
