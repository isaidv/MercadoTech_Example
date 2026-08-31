"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  defaultValue?: string;
  /** Se llama antes de navegar — útil para cerrar el sheet móvil, etc. No reemplaza la navegación. */
  onSearch?: (query: string) => void;
  className?: string;
};

export function SearchBar({ defaultValue = "", onSearch, className }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    onSearch?.(trimmed);
    router.push(trimmed ? `/buscar?q=${encodeURIComponent(trimmed)}` : "/buscar");
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn("w-full", className)}>
      <label className="sr-only" htmlFor="navbar-search">
        Buscar productos
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="navbar-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar productos..."
          className="pl-8"
        />
      </div>
    </form>
  );
}
