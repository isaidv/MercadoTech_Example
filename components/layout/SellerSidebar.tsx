"use client";

import { useState } from "react";
import { ClipboardList, Menu, Package, PlusCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/layout/NavLink";

const LINKS = [
  { href: "/vendedor/productos", label: "Mis productos", icon: Package },
  { href: "/vendedor/publicar", label: "Publicar", icon: PlusCircle },
  { href: "/vendedor/pedidos", label: "Pedidos", icon: ClipboardList },
] as const;

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <NavLink
          key={href}
          href={href}
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-muted"
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Enlaces: Mis productos, Publicar, Pedidos. Fija en desktop, `sheet` colapsable en móvil. */
export function SellerSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border p-4 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="icon" />}>
            <Menu aria-hidden="true" />
            <span className="sr-only">Abrir menú del vendedor</span>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Panel del vendedor</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">
              <SidebarLinks onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        <span className="font-heading text-lg font-semibold">Panel del vendedor</span>
      </div>

      <aside className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
        <p className="mb-4 font-heading text-lg font-semibold">Panel del vendedor</p>
        <SidebarLinks />
      </aside>
    </>
  );
}
