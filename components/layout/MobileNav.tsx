"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NavLink } from "@/components/layout/NavLink";
import { SearchBar } from "@/components/layout/SearchBar";
import type { Category } from "@/types/product";
import type { Profile } from "@/types/user";

type MobileNavProps = {
  categories: Category[];
  user: Profile | null;
  onLogout: () => void;
};

/**
 * Mismos enlaces que el navbar de escritorio, en un `sheet` para < md. Se
 * apoya en `Sheet` (base-ui Dialog) para cierre con Escape y foco atrapado —
 * no hace falta cablear teclado a mano.
 */
export function MobileNav({ categories, user, onLogout }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const canSell = user?.role === "seller" || user?.role === "admin";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu aria-hidden="true" />
        <span className="sr-only">Abrir menú</span>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-3/4 flex-col sm:max-w-xs">
        <SheetHeader>
          <SheetTitle>MercadoTech</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-4">
          <SearchBar onSearch={close} />

          <nav className="flex flex-col gap-3" aria-label="Categorías">
            <NavLink href="/" onClick={close}>
              Inicio
            </NavLink>
            {categories.map((category) => (
              <NavLink key={category.id} href={`/categoria/${category.slug}`} onClick={close}>
                {category.name}
              </NavLink>
            ))}
          </nav>

          <Separator />

          <nav className="flex flex-col gap-3" aria-label="Cuenta">
            {user ? (
              <>
                <NavLink href="/pedidos" onClick={close}>
                  Mis pedidos
                </NavLink>
                <NavLink href="/favoritos" onClick={close}>
                  Favoritos
                </NavLink>
                <NavLink href="/asistente" onClick={close}>
                  Asistente
                </NavLink>
                <NavLink href="/soporte" onClick={close}>
                  Soporte
                </NavLink>
                {canSell ? (
                  <NavLink href="/vendedor/productos" onClick={close}>
                    Panel vendedor
                  </NavLink>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onLogout();
                  }}
                  className="text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <NavLink href="/login" onClick={close}>
                Ingresar
              </NavLink>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
