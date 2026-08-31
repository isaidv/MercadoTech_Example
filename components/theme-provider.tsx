"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wrapper fino de next-themes (Fase 3.8 — corrección). `next-themes` ya
 * estaba instalado y `components/ui/sonner.tsx` ya llama a `useTheme()`
 * esperando este provider, pero nadie lo montaba: la app quedaba fija en
 * claro sin importar el tema del sistema operativo, aunque `globals.css` ya
 * trae la paleta oscura completa (`.dark`, tomada de
 * `docs/design-reference/MercadoTech.dc.html`). `attribute="class"` es el
 * que espera `@custom-variant dark (&:is(.dark *))` de globals.css.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
