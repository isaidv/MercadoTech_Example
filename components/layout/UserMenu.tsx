"use client";

import Link from "next/link";
import { Heart, LifeBuoy, LogOut, Package, Sparkles, Store } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/user";

type UserMenuProps = {
  /** `useAuth().profile` la conecta la Fase 3.3. `null` = sin sesión. */
  user: Profile | null;
  onLogout: () => void;
};

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  if (!user) {
    return (
      <Button render={<Link href="/login" />} size="sm">
        Ingresar
      </Button>
    );
  }

  const canSell = user.role === "seller" || user.role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" data-testid="user-menu" />}>
        <Avatar size="sm">
          <AvatarFallback>{initials(user.display_name)}</AvatarFallback>
        </Avatar>
        <span className="sr-only">Menú de cuenta</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href="/pedidos" />}>
          <Package aria-hidden="true" />
          Mis pedidos
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/favoritos" />}>
          <Heart aria-hidden="true" />
          Favoritos
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/asistente" />}>
          <Sparkles aria-hidden="true" />
          Asistente
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/soporte" />}>
          <LifeBuoy aria-hidden="true" />
          Soporte
        </DropdownMenuItem>
        {canSell ? (
          <DropdownMenuItem render={<Link href="/vendedor/productos" />}>
            <Store aria-hidden="true" />
            Panel vendedor
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" data-testid="user-menu-logout" onClick={onLogout}>
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
