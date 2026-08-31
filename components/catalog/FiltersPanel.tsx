"use client";

import { SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRODUCT_CONDITIONS, type ProductCondition } from "@/lib/constants/roles";
import { SORT_OPTIONS, type SortOption } from "@/lib/constants/catalog";
import type { ProductCatalogFilters } from "@/types/product";

const CONDITION_LABELS: Record<ProductCondition, string> = {
  nuevo: "Nuevo",
  usado: "Usado",
  reacondicionado: "Reacondicionado",
};

type FiltersPanelProps = {
  value: ProductCatalogFilters;
  onChange: (update: Partial<ProductCatalogFilters>) => void;
  className?: string;
};

/** Los campos en sí — se renderizan dos veces (panel fijo en desktop, sheet en móvil), de ahí el helper separado. */
function FiltersFields({ value, onChange }: Pick<FiltersPanelProps, "value" | "onChange">) {
  function toggleCondition(condition: ProductCondition) {
    const isSelected = value.condition.includes(condition);
    onChange({
      condition: isSelected
        ? value.condition.filter((c) => c !== condition)
        : [...value.condition, condition],
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Condición</legend>
        {PRODUCT_CONDITIONS.map((condition) => (
          <label key={condition} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.condition.includes(condition)}
              onChange={() => toggleCondition(condition)}
              className="size-4 rounded border-input accent-primary"
            />
            {CONDITION_LABELS[condition]}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Precio</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Mín."
            aria-label="Precio mínimo"
            value={value.minPrice ?? ""}
            onChange={(event) =>
              onChange({ minPrice: event.target.value ? Number(event.target.value) : undefined })
            }
          />
          <span aria-hidden="true" className="text-muted-foreground">
            –
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Máx."
            aria-label="Precio máximo"
            value={value.maxPrice ?? ""}
            onChange={(event) =>
              onChange({ maxPrice: event.target.value ? Number(event.target.value) : undefined })
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="catalog-sort" className="text-sm font-medium">
          Ordenar por
        </Label>
        <Select value={value.sort} onValueChange={(next) => onChange({ sort: next as SortOption })}>
          <SelectTrigger id="catalog-sort" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Condición (checkbox múltiple), rango de precio y orden. Puro: `value` +
 * `onChange`, `useProducts` es quien conecta esto con la URL. En desktop se
 * muestra fijo; en móvil el mismo contenido va dentro de un `sheet`.
 */
export function FiltersPanel({ value, onChange, className }: FiltersPanelProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="hidden lg:block">
        <FiltersFields value={value} onChange={onChange} />
      </div>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" className="gap-2" />}>
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtros
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">
              <FiltersFields value={value} onChange={onChange} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
