"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type NavLinkProps = ComponentProps<typeof Link> & {
  /** Clase aplicada cuando el link está activo. Default: text-foreground. */
  activeClassName?: string;
};

/**
 * `Link` con estado activo vía `usePathname` (comparación por prefijo, salvo
 * "/" que exige coincidencia exacta para no marcar todo como activo).
 */
export function NavLink({ href, className, activeClassName, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const hrefStr = typeof href === "string" ? href : (href.pathname ?? "");
  const isActive = hrefStr === "/" ? pathname === "/" : pathname.startsWith(hrefStr);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        isActive && (activeClassName ?? "text-foreground"),
        className
      )}
      {...props}
    />
  );
}
