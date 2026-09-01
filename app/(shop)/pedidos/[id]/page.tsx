"use client";

import { use, useState } from "react";
import { useOrder } from "@/hooks/useOrders";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderItemsTable } from "@/components/orders/OrderItemsTable";
import { Price } from "@/components/shared/Price";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
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

/**
 * Client Component a propósito (no Server Component `async`) — mismo
 * motivo que /producto/[id] y /categoria/[slug]: un Server Component que
 * hace `await` antes de devolver el árbol cliente deja el Suspense trabado
 * en este proyecto (ver comentario en esas páginas).
 */
export default function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { order, loading, error, cancelling, cancel, retry } = useOrder(id);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) {
    return <LoadingState />;
  }

  // Si el pedido no es de este usuario (ni tiene ítems suyos como vendedor,
  // ni es admin), orders_select_buyer_seller_or_admin no devuelve nada —
  // `getOrderById` lo convierte en este mismo error genérico, sin filtrar
  // si el pedido "existe pero no es tuyo" o "no existe": misma respuesta
  // para ambos casos, a propósito (no revela qué IDs son válidos).
  if (error || !order) {
    return <ErrorState description={error ?? "No encontramos este pedido."} onRetry={retry} />;
  }

  async function handleConfirmCancel() {
    await cancel();
    setDialogOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">Pedido #{order.id.slice(0, 8)}</h1>
          <OrderStatusBadge status={order.status} />
        </div>

        {order.status === "pendiente" ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button variant="destructive" data-testid="order-cancel-trigger" />}>
              Cancelar pedido
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Cancelar este pedido?</DialogTitle>
                <DialogDescription>
                  El stock no se repone automáticamente. Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Volver</DialogClose>
                <Button
                  variant="destructive"
                  data-testid="order-cancel-confirm"
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelando..." : "Sí, cancelar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <OrderItemsTable items={order.items} />

      <div className="flex justify-end border-t border-border pt-4">
        <Price value={order.total} size="lg" />
      </div>
    </div>
  );
}
