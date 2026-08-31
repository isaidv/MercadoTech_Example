"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SellerSidebar } from "@/components/layout/SellerSidebar";
import { Container } from "@/components/shared/Container";
import { LoadingState } from "@/components/shared/LoadingState";
import { useAuth } from "@/hooks/useAuth";

/**
 * Layout del panel del vendedor: `SellerSidebar` a la izquierda (colapsable
 * en móvil) + contenido. El middleware ya garantiza que quien llega acá
 * tiene sesión (`/vendedor` está en `PROTECTED_ROUTE_PREFIXES`); este guard
 * cubre lo que el middleware NO sabe — el ROL — porque solo revisa cookies
 * de sesión, no consulta `profiles`.
 */
export default function SellerLayout({ children }: { children: ReactNode }) {
  const { profile, initializing } = useAuth();
  const router = useRouter();
  const canSell = profile?.role === "seller" || profile?.role === "admin";

  useEffect(() => {
    if (!initializing && !canSell) {
      toast.error("Necesitas una cuenta de vendedor para entrar acá.");
      router.replace("/");
    }
  }, [initializing, canSell, router]);

  // Mientras se resuelve el profile (o si va a redirigir), no se muestra
  // nada del panel — evita el parpadeo de un buyer viendo el sidebar de
  // vendedor por una fracción de segundo antes del redirect.
  if (initializing || !canSell) {
    return (
      <Container className="py-10">
        <LoadingState />
      </Container>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SellerSidebar />
      <main className="flex-1">
        <Container className="py-10">{children}</Container>
      </main>
    </div>
  );
}
