"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { ProductImage } from "@/components/shared/ProductImage";
import { Price } from "@/components/shared/Price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Product } from "@/types/product";

type ProductsTableProps = {
  products: Product[];
  onToggleActive: (productId: string, isActive: boolean) => void;
  onDelete: (productId: string) => void;
};

function DeleteProductDialog({ title, onConfirm }: { title: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" data-testid="seller-product-delete-trigger" aria-label={`Eliminar "${title}"`} />}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar &quot;{title}&quot;?</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Si el producto tiene ventas, no se va a poder eliminar —
            desactívalo en su lugar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Volver</DialogClose>
          <Button
            variant="destructive"
            data-testid="seller-product-delete-confirm"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Sí, eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Portada, título, precio, stock, estado y acciones. Puro: recibe todo por props, las mutaciones las orquesta `useSellerProducts`. */
export function ProductsTable({ products, onToggleActive, onDelete }: ProductsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id} data-testid="seller-product-row">
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md">
                  <ProductImage src={product.image_url} alt={product.title} />
                </div>
                <span className="line-clamp-2">{product.title}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Price value={product.price} size="sm" />
            </TableCell>
            <TableCell className="text-right">{product.stock}</TableCell>
            <TableCell>
              <Badge variant={product.is_active ? "default" : "secondary"}>
                {product.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  render={<Link href={`/vendedor/productos/${product.id}/editar`} />}
                  aria-label={`Editar "${product.title}"`}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="seller-product-toggle-active"
                  onClick={() => onToggleActive(product.id, !product.is_active)}
                >
                  {product.is_active ? "Desactivar" : "Activar"}
                </Button>
                <DeleteProductDialog title={product.title} onConfirm={() => onDelete(product.id)} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
