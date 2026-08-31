"use client";

import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Container } from "@/components/shared/Container";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useCart } from "@/hooks/useCart";

/**
 * Layout de la tienda: Navbar arriba + Container + footer mínimo. Los
 * cuatro hooks del navbar (tabla "Cómo se conectan..." de la Fase 3.2) ya
 * están todos conectados: `UserMenu`↔`useAuth` (3.3), `CategoriesMenu`/
 * `SearchBar`↔`useCategories` (3.4, `SearchBar` navega solo), `CartIndicator`↔
 * `useCart().count` (3.6).
 */
export default function ShopLayout({ children }: { children: ReactNode }) {
  const { user, profile, logout } = useAuth();
  const { categories } = useCategories();
  const { count } = useCart(user?.id ?? null);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar categories={categories} cartCount={count} user={profile} onLogout={logout} />
      <main className="flex-1">
        <Container className="py-10">{children}</Container>
      </main>
      <footer className="border-t border-border py-6">
        <Container>
          <p className="text-center text-sm text-muted-foreground">
            MercadoTech — proyecto educativo, sin fines comerciales reales.
          </p>
        </Container>
      </footer>
    </div>
  );
}
