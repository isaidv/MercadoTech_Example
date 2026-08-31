"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Category } from "@/types/product";

type CategoriesMenuProps = {
  categories: Category[];
};

/** Dropdown de categorías. Recibe la lista por props — `useCategories` la conecta en la Fase 3.4. */
export function CategoriesMenu({ categories }: CategoriesMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="gap-1" />}>
        Categorías
        <ChevronDown className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {categories.length === 0 ? (
          <DropdownMenuItem disabled>Sin categorías</DropdownMenuItem>
        ) : (
          categories.map((category) => (
            <DropdownMenuItem key={category.id} render={<Link href={`/categoria/${category.slug}`} />}>
              {category.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
