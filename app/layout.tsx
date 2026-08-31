import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Mismas familias y pesos que docs/design-reference/industry.css. Antes
// (Fase 3.1) se cargaban con un @import de Google Fonts en globals.css como
// atajo temporal — esta fase las mueve a next/font/google, que las sirve
// self-hosted (sin request a fonts.googleapis.com en el navegador del
// usuario) y expone las mismas variables --font-body/--font-heading que ya
// consume @theme inline en globals.css.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MercadoTech",
  description:
    "Marketplace de productos tecnológicos con centro de soporte operado por agentes de voz.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
