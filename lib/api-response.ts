import { NextResponse } from "next/server";

/**
 * Respuesta de error consistente para los Route Handlers de `app/api/v1/`
 * (Fase 4.3+). `code` es un identificador estable para que el cliente
 * pueda ramificar sin parsear `message`; `message` es el texto legible
 * que ve quien depura. Nunca expone un stack trace ni el error crudo de
 * Postgres/proveedor sin traducir.
 */
export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
