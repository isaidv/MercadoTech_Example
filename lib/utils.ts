import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un precio en soles peruanos: `formatPrice(1299.9)` -> "S/ 1,299.90".
 *
 * Acepta `number | string` porque las columnas `numeric(12,2)` (price,
 * total, price_snapshot) llegan como STRING desde PostgREST (evita perder
 * precisión al serializar a JSON) — ver "Datos que llegan raros desde
 * PostgREST" en MercadoTech_sesion3.md. Pura, sin React: la usa el
 * componente `Price` y cualquier service que necesite mostrar un monto.
 */
export function formatPrice(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(amount)) {
    // No lanzamos: un precio no-numérico es un dato corrupto, no una
    // excepción de flujo — mejor mostrar algo visible que romper la pantalla.
    return "S/ —";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

/**
 * Extrae `.message` de un error "error-like" sin reescribirlo: cubre tanto
 * `instanceof Error` (ej. `AuthError` de supabase-js, que sí extiende
 * `Error`) como un objeto plano con `.message` (`PostgrestError`, lo que
 * llega de `{ error } = await supabase.from(...)...` o `.rpc(...)` — NO es
 * una instancia de `Error`). Los errores del RPC `create_order_from_cart`
 * (Fase 3.6) ya traen el nombre del producto adentro del mensaje —
 * mostrarlos tal cual, sin reescribir, es lo correcto.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Ocurrió un error inesperado.";
}
