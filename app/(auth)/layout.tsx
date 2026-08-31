import type { ReactNode } from "react";
import Link from "next/link";

/** Layout de autenticación: centrado, sin navbar, con logo. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-10">
      <Link href="/" className="font-heading text-2xl font-semibold text-foreground">
        MercadoTech
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
