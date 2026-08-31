"use client";

import Link from "next/link";
import { Container } from "@/components/shared/Container";
import { SearchBar } from "@/components/layout/SearchBar";
import { CategoriesMenu } from "@/components/layout/CategoriesMenu";
import { CartIndicator } from "@/components/layout/CartIndicator";
import { UserMenu } from "@/components/layout/UserMenu";
import { MobileNav } from "@/components/layout/MobileNav";
import type { Category } from "@/types/product";
import type { Profile } from "@/types/user";

type NavbarProps = {
  categories: Category[];
  cartCount: number;
  user: Profile | null;
  onLogout?: () => void;
};

/**
 * Compone logo, `SearchBar`, `CategoriesMenu`, `CartIndicator`, `UserMenu` y
 * `MobileNav` — todo por props, sin fetching propio. `app/(shop)/layout.tsx`
 * le pasa valores estáticos hasta que cada hook se conecta (ver tabla
 * "Cómo se conectan los componentes del navbar" de la Fase 3.2).
 *
 * "use client": no por interactividad propia, sino porque los Server
 * Components no pueden pasar funciones (ni siquiera un no-op por defecto)
 * como prop a un Client Component hijo (MobileNav/UserMenu) — solo se
 * pueden pasar Server Actions. Con onLogout aún sin cablear (llega en la
 * Fase 3.3 vía useAuth, que ya es cliente), Navbar tiene que originarse del
 * lado del cliente para poder ofrecer ese default.
 */
export function Navbar({ categories, cartCount, user, onLogout = () => {} }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <Container className="flex h-14 items-center gap-3">
        <MobileNav categories={categories} user={user} onLogout={onLogout} />

        <Link href="/" className="font-heading text-xl font-semibold whitespace-nowrap text-foreground">
          MercadoTech
        </Link>

        <div className="hidden md:block">
          <CategoriesMenu categories={categories} />
        </div>

        <div className="hidden flex-1 md:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <CartIndicator count={cartCount} />
          <div className="hidden md:block">
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </Container>
    </header>
  );
}
